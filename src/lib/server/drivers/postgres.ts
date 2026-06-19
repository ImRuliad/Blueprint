import pg from 'pg';
import { ConnectionError, QueryError } from '../errors';
import type {
	DatabaseDriver,
	EngineType,
	QueryResult,
	TableInfo,
	TableSchema,
	ViewInfo,
	ColumnDescriptor,
} from './types';

export interface PostgresConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password?: string;
	ssl?: boolean | object;
	searchPath?: string;
}

export class PostgresDriver implements DatabaseDriver {
	readonly engine: EngineType = 'postgresql';
	private pool: pg.Pool | null = null;
	private txClient: pg.PoolClient | null = null;
	private _isConnected = false;

	constructor(private readonly config: PostgresConfig) {}

	get isConnected(): boolean {
		return this._isConnected;
	}

	async connect(password?: string): Promise<void> {
		try {
			this.pool = new pg.Pool({
				host: this.config.host,
				port: this.config.port,
				database: this.config.database,
				user: this.config.user,
				password: password ?? this.config.password,
				ssl: this.config.ssl,
				max: 5,
				idleTimeoutMillis: 30_000,
				connectionTimeoutMillis: 10_000,
			});

			// Verify the connection works
			const client = await this.pool.connect();
			if (this.config.searchPath) {
				await client.query(`SET search_path TO ${this.config.searchPath}`);
			}
			client.release();
			this._isConnected = true;
		} catch (err) {
			this._isConnected = false;
			throw new ConnectionError(
				`Failed to connect to PostgreSQL at ${this.config.host}:${this.config.port}: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	async disconnect(): Promise<void> {
		if (this.txClient) {
			this.txClient.release();
			this.txClient = null;
		}
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
		}
		this._isConnected = false;
	}

	async testConnection(password?: string): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
		const start = performance.now();
		let tempPool: pg.Pool | null = null;
		try {
			tempPool = new pg.Pool({
				host: this.config.host,
				port: this.config.port,
				database: this.config.database,
				user: this.config.user,
				password: password ?? this.config.password,
				ssl: this.config.ssl,
				max: 1,
				connectionTimeoutMillis: 5_000,
			});
			await tempPool.query('SELECT 1');
			return { ok: true, latencyMs: performance.now() - start };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
				latencyMs: performance.now() - start,
			};
		} finally {
			if (tempPool) await tempPool.end();
		}
	}

	async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
		const client = this.getClient();
		try {
			const result = await client.query(sql, params);
			return this.mapResult(result);
		} catch (err) {
			throw new QueryError(
				err instanceof Error ? err.message : String(err),
				sql,
			);
		}
	}

	async executeRaw(sql: string): Promise<QueryResult> {
		return this.execute(sql);
	}

	async beginTransaction(): Promise<void> {
		if (!this.pool) throw new ConnectionError('Not connected');
		this.txClient = await this.pool.connect();
		await this.txClient.query('BEGIN');
	}

	async commitTransaction(): Promise<void> {
		if (!this.txClient) throw new QueryError('No active transaction');
		try {
			await this.txClient.query('COMMIT');
		} finally {
			this.txClient.release();
			this.txClient = null;
		}
	}

	async rollbackTransaction(): Promise<void> {
		if (!this.txClient) throw new QueryError('No active transaction');
		try {
			await this.txClient.query('ROLLBACK');
		} finally {
			this.txClient.release();
			this.txClient = null;
		}
	}

	async getTables(): Promise<TableInfo[]> {
		const schema = this.getSchema();
		const result = await this.execute(
			`SELECT t.table_name, t.table_schema,
				(SELECT reltuples::bigint FROM pg_class c
				 JOIN pg_namespace n ON n.oid = c.relnamespace
				 WHERE c.relname = t.table_name AND n.nspname = t.table_schema) AS row_count
			 FROM information_schema.tables t
			 WHERE t.table_schema = $1 AND t.table_type = 'BASE TABLE'
			 ORDER BY t.table_name`,
			[schema],
		);
		return result.rows.map((r) => ({
			name: r.table_name as string,
			schema: r.table_schema as string,
			rowCount: r.row_count != null ? Number(r.row_count) : undefined,
		}));
	}

	async getTableSchema(tableName: string, schemaName?: string): Promise<TableSchema> {
		const schema = schemaName ?? this.getSchema();

		// Columns
		const colResult = await this.execute(
			`SELECT c.column_name, c.data_type, c.is_nullable, c.column_default,
				CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_primary_key,
				CASE WHEN c.column_default LIKE 'nextval%' THEN true ELSE false END AS is_auto_increment
			 FROM information_schema.columns c
			 LEFT JOIN (
				SELECT ku.column_name
				FROM information_schema.table_constraints tc
				JOIN information_schema.key_column_usage ku
					ON tc.constraint_name = ku.constraint_name AND tc.table_schema = ku.table_schema
				WHERE tc.table_name = $1 AND tc.table_schema = $2 AND tc.constraint_type = 'PRIMARY KEY'
			 ) pk ON pk.column_name = c.column_name
			 WHERE c.table_name = $1 AND c.table_schema = $2
			 ORDER BY c.ordinal_position`,
			[tableName, schema],
		);

		// Indexes
		const idxResult = await this.execute(
			`SELECT i.relname AS index_name,
				array_agg(a.attname ORDER BY k.n) AS columns,
				ix.indisunique AS is_unique,
				am.amname AS index_type
			 FROM pg_index ix
			 JOIN pg_class t ON t.oid = ix.indrelid
			 JOIN pg_class i ON i.oid = ix.indexrelid
			 JOIN pg_namespace n ON n.oid = t.relnamespace
			 JOIN pg_am am ON am.oid = i.relam
			 CROSS JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS k(attnum, n)
			 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
			 WHERE t.relname = $1 AND n.nspname = $2
			 GROUP BY i.relname, ix.indisunique, am.amname
			 ORDER BY i.relname`,
			[tableName, schema],
		);

		// Foreign keys
		const fkResult = await this.execute(
			`SELECT tc.constraint_name, kcu.column_name,
				ccu.table_name AS referenced_table, ccu.column_name AS referenced_column,
				rc.delete_rule AS on_delete, rc.update_rule AS on_update
			 FROM information_schema.table_constraints tc
			 JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
			 JOIN information_schema.constraint_column_usage ccu
				ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
			 JOIN information_schema.referential_constraints rc
				ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
			 WHERE tc.table_name = $1 AND tc.table_schema = $2 AND tc.constraint_type = 'FOREIGN KEY'`,
			[tableName, schema],
		);

		return {
			name: tableName,
			schema,
			columns: colResult.rows.map((r) => ({
				name: r.column_name as string,
				dataType: r.data_type as string,
				nullable: r.is_nullable === 'YES',
				defaultValue: (r.column_default as string | null) ?? null,
				isPrimaryKey: r.is_primary_key as boolean,
				isAutoIncrement: r.is_auto_increment as boolean,
			})),
			indexes: idxResult.rows.map((r) => ({
				name: r.index_name as string,
				columns: r.columns as string[],
				unique: r.is_unique as boolean,
				type: r.index_type as string | undefined,
			})),
			foreignKeys: fkResult.rows.map((r) => ({
				constraintName: r.constraint_name as string,
				column: r.column_name as string,
				referencedTable: r.referenced_table as string,
				referencedColumn: r.referenced_column as string,
				onDelete: r.on_delete as string | undefined,
				onUpdate: r.on_update as string | undefined,
			})),
		};
	}

	async getViews(): Promise<ViewInfo[]> {
		const schema = this.getSchema();
		const result = await this.execute(
			`SELECT table_name, table_schema
			 FROM information_schema.views
			 WHERE table_schema = $1
			 ORDER BY table_name`,
			[schema],
		);
		return result.rows.map((r) => ({
			name: r.table_name as string,
			schema: r.table_schema as string,
		}));
	}

	private getClient(): pg.Pool | pg.PoolClient {
		if (this.txClient) return this.txClient;
		if (!this.pool) throw new ConnectionError('Not connected');
		return this.pool;
	}

	private getSchema(): string {
		if (this.config.searchPath) {
			return this.config.searchPath.split(',')[0].trim();
		}
		return 'public';
	}

	private mapResult(result: pg.QueryResult): QueryResult {
		const columns: ColumnDescriptor[] = (result.fields ?? []).map((f) => ({
			name: f.name,
			dataType: String(f.dataTypeID),
			nullable: true,
			isPrimaryKey: false,
		}));
		return {
			columns,
			rows: result.rows ?? [],
			rowsAffected: result.rowCount ?? 0,
		};
	}
}
