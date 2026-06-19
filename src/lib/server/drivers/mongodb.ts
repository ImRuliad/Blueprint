import { MongoClient, type Db, type Document } from 'mongodb';
import { ConnectionError, QueryError } from '../errors';
import type {
	DatabaseDriver,
	EngineType,
	QueryResult,
	TableInfo,
	TableSchema,
	ViewInfo,
	ColumnDescriptor,
	ColumnInfo,
} from './types';

export interface MongoConfig {
	uri: string;
	database: string;
}

export interface MongoQueryOptions {
	filter?: Document;
	projection?: Document;
	sort?: Document;
	limit?: number;
	skip?: number;
}

export class MongoDriver implements DatabaseDriver {
	readonly engine: EngineType = 'mongodb';
	private client: MongoClient | null = null;
	private db: Db | null = null;
	private _isConnected = false;

	constructor(private readonly config: MongoConfig) {}

	get isConnected(): boolean {
		return this._isConnected;
	}

	async connect(): Promise<void> {
		try {
			this.client = new MongoClient(this.config.uri, {
				connectTimeoutMS: 10_000,
				serverSelectionTimeoutMS: 10_000,
			});
			await this.client.connect();
			this.db = this.client.db(this.config.database);
			this._isConnected = true;
		} catch (err) {
			this._isConnected = false;
			throw new ConnectionError(
				`Failed to connect to MongoDB: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}

	async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.close();
			this.client = null;
			this.db = null;
		}
		this._isConnected = false;
	}

	async testConnection(): Promise<{ ok: boolean; error?: string; latencyMs: number }> {
		const start = performance.now();
		let tempClient: MongoClient | null = null;
		try {
			tempClient = new MongoClient(this.config.uri, {
				connectTimeoutMS: 5_000,
				serverSelectionTimeoutMS: 5_000,
			});
			await tempClient.connect();
			await tempClient.db(this.config.database).admin().ping();
			return { ok: true, latencyMs: performance.now() - start };
		} catch (err) {
			return {
				ok: false,
				error: err instanceof Error ? err.message : String(err),
				latencyMs: performance.now() - start,
			};
		} finally {
			if (tempClient) await tempClient.close();
		}
	}

	async execute(_sql: string, _params?: unknown[]): Promise<QueryResult> {
		throw new QueryError('MongoDB does not support SQL queries');
	}

	async executeRaw(_sql: string): Promise<QueryResult> {
		throw new QueryError('MongoDB does not support SQL queries');
	}

	async executeMongoQuery(
		collection: string,
		options: MongoQueryOptions = {},
	): Promise<QueryResult> {
		if (!this.db) throw new ConnectionError('Not connected');
		try {
			const coll = this.db.collection(collection);
			let cursor = coll.find(options.filter ?? {});

			if (options.projection) cursor = cursor.project(options.projection);
			if (options.sort) cursor = cursor.sort(options.sort);
			if (options.skip) cursor = cursor.skip(options.skip);
			if (options.limit) cursor = cursor.limit(options.limit);

			const docs = await cursor.toArray();
			const columns: ColumnDescriptor[] = docs.length > 0
				? Object.keys(docs[0]).map((name) => ({
					name,
					dataType: typeof docs[0][name],
					nullable: true,
					isPrimaryKey: name === '_id',
				}))
				: [];

			return {
				columns,
				rows: docs as Record<string, unknown>[],
				rowsAffected: docs.length,
			};
		} catch (err) {
			throw new QueryError(
				err instanceof Error ? err.message : String(err),
			);
		}
	}

	async beginTransaction(): Promise<void> {
		throw new QueryError('MongoDB transactions require replica sets and are not supported by this driver');
	}

	async commitTransaction(): Promise<void> {
		throw new QueryError('MongoDB transactions require replica sets and are not supported by this driver');
	}

	async rollbackTransaction(): Promise<void> {
		throw new QueryError('MongoDB transactions require replica sets and are not supported by this driver');
	}

	async getTables(): Promise<TableInfo[]> {
		if (!this.db) throw new ConnectionError('Not connected');
		const collections = await this.db.listCollections().toArray();
		const tables: TableInfo[] = [];
		for (const coll of collections) {
			try {
				const stats = await this.db.collection(coll.name).estimatedDocumentCount();
				tables.push({ name: coll.name, rowCount: stats });
			} catch {
				tables.push({ name: coll.name });
			}
		}
		return tables.sort((a, b) => a.name.localeCompare(b.name));
	}

	async getTableSchema(collectionName: string): Promise<TableSchema> {
		if (!this.db) throw new ConnectionError('Not connected');

		const coll = this.db.collection(collectionName);
		const sampleDocs = await coll.find({}).limit(500).toArray();

		// Infer field types from sampled documents
		const fieldMap = new Map<string, { types: Set<string>; nullCount: number; total: number }>();

		for (const doc of sampleDocs) {
			for (const [key, value] of Object.entries(doc)) {
				if (!fieldMap.has(key)) {
					fieldMap.set(key, { types: new Set(), nullCount: 0, total: 0 });
				}
				const field = fieldMap.get(key)!;
				field.total++;
				if (value === null || value === undefined) {
					field.nullCount++;
				} else {
					field.types.add(inferMongoType(value));
				}
			}
		}

		const columns: ColumnInfo[] = Array.from(fieldMap.entries()).map(([name, info]) => ({
			name,
			dataType: Array.from(info.types).join(' | ') || 'null',
			nullable: info.nullCount > 0 || info.total < sampleDocs.length,
			defaultValue: null,
			isPrimaryKey: name === '_id',
			isAutoIncrement: false,
		}));

		return {
			name: collectionName,
			columns,
			indexes: [],
			foreignKeys: [],
		};
	}

	async getViews(): Promise<ViewInfo[]> {
		if (!this.db) throw new ConnectionError('Not connected');
		const collections = await this.db.listCollections({ type: 'view' }).toArray();
		return collections
			.map((c) => ({ name: c.name }))
			.sort((a, b) => a.name.localeCompare(b.name));
	}
}

function inferMongoType(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (Array.isArray(value)) return 'array';
	if (value instanceof Date) return 'date';
	if (typeof value === 'object' && value !== null && '_bsontype' in value) {
		return (value as { _bsontype: string })._bsontype.toLowerCase();
	}
	return typeof value;
}
