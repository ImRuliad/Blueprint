import mysql from 'mysql2/promise';
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

export interface MySQLConfig {
	host: string;
	port: number;
	database: string;
	user: string;
	password?: string;
	ssl?: object;
}

export class MySQLDriver implements DatabaseDriver {
	readonly engine: EngineType = 'mysql';
	private pool: mysql.Pool | null = null;
	private txConnection: mysql.PoolConnection | null = null;
	private _isConnected = false;

	constructor(private readonly config: MySQLConfig) {}

	get isConnected(): boolean {
		return this._isConnected;
	}

	async connect(password?: string): Promise<void> {
		try {
			this.pool = mysql.createPool({
				host: this.config.host,
				port: this.config.port,
				database: this.config.database,
				user: this.config.user,
				password: password ?? this.config.password,
				ssl: this.config.ssl,
				waitForConnections: true,
				connectionLimit: 5,
				connectTimeout: 10_000,
			});

			// Verify the connection works
			const conn = await this.pool.getConnection();
			conn.release();
			this._isConnected = true;
		} catch (err) {
			this._isConnected = false;
			throw new ConnectionError(
				`Failed to connect to MySQL at ${this.config.host}:${this.config.port}: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	async disconnect(): Promise<void> {
		if (this.txConnection) {
			this.txConnection.release();
			this.txConnection = null;
		}
		if (this.pool) {
			await this.pool.end();
			this.pool = null;
		}
		this._isConnected = false;
	}

	async testConnection(password?: string): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
		const start = performance.now();
		let tempPool: mysql.Pool | null = null;
		try {
			tempPool = mysql.createPool({
				host: this.config.host,
				port: this.config.port,
				database: this.config.database,
				user: this.config.user,
				password: password ?? this.config.password,
				ssl: this.config.ssl,
				connectionLimit: 1,
				connectTimeout: 5_000,
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
		const conn = this.getConnection();
		try {
			const [rows, fields] = await conn.execute(sql, params as (string | number | bigint | boolean | Date | null | Buffer)[]);
			return this.mapResult(rows, fields);
		} catch (err) {
			throw new QueryError(
				err instanceof Error ? err.message : String(err),
				sql,
			);
		}
	}

	async executeRaw(sql: string): Promise<QueryResult> {
		const conn = this.getConnection();
		try {
			const [rows, fields] = await conn.query(sql);
			return this.mapResult(rows, fields);
		} catch (err) {
			throw new QueryError(
				err instanceof Error ? err.message : String(err),
				sql,
			);
		}
	}

	async beginTransaction(): Promise<void> {
		if (!this.pool) throw new ConnectionError('Not connected');
		this.txConnection = await this.pool.getConnection();
		await this.txConnection.beginTransaction();
	}

	async commitTransaction(): Promise<void> {
		if (!this.txConnection) throw new QueryError('No active transaction');
		try {
			await this.txConnection.commit();
		} finally {
			this.txConnection.release();
			this.txConnection = null;
		}
	}

	async rollbackTransaction(): Promise<void> {
		if (!this.txConnection) throw new QueryError('No active transaction');
		try {
			await this.txConnection.rollback();
		} finally {
			this.txConnection.release();
			this.txConnection = null;
		}
	}

	async getTables(): Promise<TableInfo[]> {
		const result = await this.execute(
			`SELECT TABLE_NAME, TABLE_ROWS
			 FROM information_schema.TABLES
			 WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
			 ORDER BY TABLE_NAME`,
			[this.config.database],
		);
		return result.rows.map((r) => ({
			name: r.TABLE_NAME as string,
			rowCount: r.TABLE_ROWS != null ? Number(r.TABLE_ROWS) : undefined,
		}));
	}

	async getTableSchema(tableName: string): Promise<TableSchema> {
		// Columns
		const colResult = await this.execute(
			`SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
			 FROM information_schema.COLUMNS
			 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
			 ORDER BY ORDINAL_POSITION`,
			[this.config.database, tableName],
		);

		// Indexes
		const idxResult = await this.execute(
			`SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns,
				CASE WHEN NON_UNIQUE = 0 THEN true ELSE false END AS is_unique,
				INDEX_TYPE
			 FROM information_schema.STATISTICS
			 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
			 GROUP BY INDEX_NAME, NON_UNIQUE, INDEX_TYPE
			 ORDER BY INDEX_NAME`,
			[this.config.database, tableName],
		);

		// Foreign keys
		const fkResult = await this.execute(
			`SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
			 FROM information_schema.KEY_COLUMN_USAGE
			 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
			[this.config.database, tableName],
		);

		// Get ON DELETE/UPDATE rules from referential constraints
		const rcResult = await this.execute(
			`SELECT CONSTRAINT_NAME, DELETE_RULE, UPDATE_RULE
			 FROM information_schema.REFERENTIAL_CONSTRAINTS
			 WHERE CONSTRAINT_SCHEMA = ? AND TABLE_NAME = ?`,
			[this.config.database, tableName],
		);
		const rcMap = new Map(
			rcResult.rows.map((r) => [
				r.CONSTRAINT_NAME as string,
				{ onDelete: r.DELETE_RULE as string, onUpdate: r.UPDATE_RULE as string },
			]),
		);

		return {
			name: tableName,
			columns: colResult.rows.map((r) => ({
				name: r.COLUMN_NAME as string,
				dataType: r.DATA_TYPE as string,
				nullable: r.IS_NULLABLE === 'YES',
				defaultValue: (r.COLUMN_DEFAULT as string | null) ?? null,
				isPrimaryKey: r.COLUMN_KEY === 'PRI',
				isAutoIncrement: (r.EXTRA as string)?.includes('auto_increment') ?? false,
			})),
			indexes: idxResult.rows.map((r) => ({
				name: r.INDEX_NAME as string,
				columns: (r.columns as string).split(','),
				unique: r.is_unique as boolean,
				type: r.INDEX_TYPE as string | undefined,
			})),
			foreignKeys: fkResult.rows.map((r) => {
				const rc = rcMap.get(r.CONSTRAINT_NAME as string);
				return {
					constraintName: r.CONSTRAINT_NAME as string,
					column: r.COLUMN_NAME as string,
					referencedTable: r.REFERENCED_TABLE_NAME as string,
					referencedColumn: r.REFERENCED_COLUMN_NAME as string,
					onDelete: rc?.onDelete,
					onUpdate: rc?.onUpdate,
				};
			}),
		};
	}

	async getViews(): Promise<ViewInfo[]> {
		const result = await this.execute(
			`SELECT TABLE_NAME
			 FROM information_schema.VIEWS
			 WHERE TABLE_SCHEMA = ?
			 ORDER BY TABLE_NAME`,
			[this.config.database],
		);
		return result.rows.map((r) => ({
			name: r.TABLE_NAME as string,
		}));
	}

	private getConnection(): mysql.Pool | mysql.PoolConnection {
		if (this.txConnection) return this.txConnection;
		if (!this.pool) throw new ConnectionError('Not connected');
		return this.pool;
	}

	private mapResult(rows: unknown, fields: unknown): QueryResult {
		const fieldArray = Array.isArray(fields) ? fields : [];
		const columns: ColumnDescriptor[] = fieldArray.map((f: { name: string; type?: number }) => ({
			name: f.name,
			dataType: String(f.type ?? 'unknown'),
			nullable: true,
			isPrimaryKey: false,
		}));

		const rowArray = Array.isArray(rows) ? rows : [];
		const rowsAffected = (rows as { affectedRows?: number })?.affectedRows ?? rowArray.length;

		return {
			columns,
			rows: rowArray as Record<string, unknown>[],
			rowsAffected,
		};
	}
}
