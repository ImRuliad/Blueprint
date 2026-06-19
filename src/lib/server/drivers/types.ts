export type EngineType = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';

export interface ColumnDescriptor {
	name: string;
	dataType: string;
	nullable: boolean;
	isPrimaryKey: boolean;
}

export interface QueryResult {
	columns: ColumnDescriptor[];
	rows: Record<string, unknown>[];
	rowsAffected: number;
}

export interface TableInfo {
	name: string;
	schema?: string;
	rowCount?: number;
}

export interface ViewInfo {
	name: string;
	schema?: string;
}

export interface ColumnInfo {
	name: string;
	dataType: string;
	nullable: boolean;
	defaultValue: string | null;
	isPrimaryKey: boolean;
	isAutoIncrement: boolean;
}

export interface IndexInfo {
	name: string;
	columns: string[];
	unique: boolean;
	type?: string;
}

export interface ForeignKeyInfo {
	constraintName: string;
	column: string;
	referencedTable: string;
	referencedColumn: string;
	onDelete?: string;
	onUpdate?: string;
}

export interface TableSchema {
	name: string;
	schema?: string;
	columns: ColumnInfo[];
	indexes: IndexInfo[];
	foreignKeys: ForeignKeyInfo[];
}

export interface DatabaseDriver {
	readonly engine: EngineType;
	readonly isConnected: boolean;

	connect(password?: string): Promise<void>;
	disconnect(): Promise<void>;
	testConnection(password?: string): Promise<{ ok: boolean; error?: string; latencyMs: number }>;

	execute(sql: string, params?: unknown[]): Promise<QueryResult>;
	executeRaw(sql: string): Promise<QueryResult>;

	beginTransaction(): Promise<void>;
	commitTransaction(): Promise<void>;
	rollbackTransaction(): Promise<void>;

	getTables(): Promise<TableInfo[]>;
	getTableSchema(tableName: string, schemaName?: string): Promise<TableSchema>;
	getViews(): Promise<ViewInfo[]>;
}
