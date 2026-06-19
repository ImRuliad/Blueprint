import { Database } from 'bun:sqlite';
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

export interface SQLiteConfig {
	filePath: string;
	readonly?: boolean;
}

export class SQLiteDriver implements DatabaseDriver {
	readonly engine: EngineType = 'sqlite';
	private db: Database | null = null;
	private _isConnected = false;
	private inTransaction = false;

	constructor(private readonly config: SQLiteConfig) {}

	get isConnected(): boolean {
		return this._isConnected;
	}

	async connect(): Promise<void> {
		try {
			this.db = new Database(this.config.filePath, {
				readonly: this.config.readonly ?? false,
			});
			this.db.exec('PRAGMA journal_mode = WAL');
			this.db.exec('PRAGMA foreign_keys = ON');
			this._isConnected = true;
		} catch (err) {
			this._isConnected = false;
			throw new ConnectionError(
				`Failed to open SQLite database at ${this.config.filePath}: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	async disconnect(): Promise<void> {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
		this._isConnected = false;
		this.inTransaction = false;
	}

	async testConnection(): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
		const start = performance.now();
		let tempDb: Database | null = null;
		try {
			tempDb = new Database(this.config.filePath, { readonly: true });
			tempDb.prepare('SELECT 1').get();
			return { ok: true, latencyMs: performance.now() - start };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
				latencyMs: performance.now() - start,
			};
		} finally {
			if (tempDb) tempDb.close();
		}
	}

	async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
		if (!this.db) throw new ConnectionError('Not connected');
		try {
			const stmt = this.db.prepare(sql);
			const isSelect = sql.trimStart().toUpperCase().startsWith('SELECT')
				|| sql.trimStart().toUpperCase().startsWith('PRAGMA')
				|| sql.trimStart().toUpperCase().startsWith('WITH');

			if (isSelect) {
				const rows = params ? stmt.all(...params) : stmt.all();
				const rowArray = rows as Record<string, unknown>[];
				const columns: ColumnDescriptor[] = rowArray.length > 0
					? Object.keys(rowArray[0]).map((name) => ({
						name,
						dataType: typeof rowArray[0][name] === 'number' ? 'number' : 'text',
						nullable: true,
						isPrimaryKey: false,
					}))
					: [];
				return { columns, rows: rowArray, rowsAffected: rowArray.length };
			}

			const result = params ? stmt.run(...params) : stmt.run();
			return {
				columns: [],
				rows: [],
				rowsAffected: result.changes,
			};
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
		if (!this.db) throw new ConnectionError('Not connected');
		this.db.exec('BEGIN');
		this.inTransaction = true;
	}

	async commitTransaction(): Promise<void> {
		if (!this.db || !this.inTransaction) throw new QueryError('No active transaction');
		this.db.exec('COMMIT');
		this.inTransaction = false;
	}

	async rollbackTransaction(): Promise<void> {
		if (!this.db || !this.inTransaction) throw new QueryError('No active transaction');
		this.db.exec('ROLLBACK');
		this.inTransaction = false;
	}

	async getTables(): Promise<TableInfo[]> {
		const result = await this.execute(
			`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
		);
		return result.rows.map((r) => ({
			name: r.name as string,
		}));
	}

	async getTableSchema(tableName: string): Promise<TableSchema> {
		// Columns via PRAGMA
		const colResult = await this.execute(`PRAGMA table_info(${quoteForPragma(tableName)})`);

		// Indexes
		const idxListResult = await this.execute(`PRAGMA index_list(${quoteForPragma(tableName)})`);
		const indexes = [];
		for (const idx of idxListResult.rows) {
			const idxInfoResult = await this.execute(`PRAGMA index_info(${quoteForPragma(idx.name as string)})`);
			indexes.push({
				name: idx.name as string,
				columns: idxInfoResult.rows.map((r) => r.name as string),
				unique: (idx.unique as number) === 1,
			});
		}

		// Foreign keys
		const fkResult = await this.execute(`PRAGMA foreign_key_list(${quoteForPragma(tableName)})`);

		return {
			name: tableName,
			columns: colResult.rows.map((r) => ({
				name: r.name as string,
				dataType: (r.type as string) || 'TEXT',
				nullable: (r.notnull as number) === 0,
				defaultValue: (r.dflt_value as string | null) ?? null,
				isPrimaryKey: (r.pk as number) > 0,
				isAutoIncrement: (r.pk as number) > 0 && ((r.type as string) || '').toUpperCase() === 'INTEGER',
			})),
			indexes,
			foreignKeys: fkResult.rows.map((r) => ({
				constraintName: `fk_${tableName}_${r.from as string}`,
				column: r.from as string,
				referencedTable: r.table as string,
				referencedColumn: r.to as string,
				onDelete: r.on_delete as string | undefined,
				onUpdate: r.on_update as string | undefined,
			})),
		};
	}

	async getViews(): Promise<ViewInfo[]> {
		const result = await this.execute(
			`SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name`
		);
		return result.rows.map((r) => ({
			name: r.name as string,
		}));
	}
}

/** Escape a table/index name for use in PRAGMA statements (which don't accept parameters). */
function quoteForPragma(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}
