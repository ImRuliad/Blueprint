import { describe, it, expect } from 'vitest';
import { sqlLiteral, buildCreateTable, streamSqlExport } from './sql-exporter';
import type { DatabaseDriver, QueryResult, TableSchema, ColumnInfo } from '$lib/server/drivers/types';

// ──────────────────────────────────────────────
// sqlLiteral
// ──────────────────────────────────────────────
describe('sqlLiteral', () => {
	it('returns NULL for null', () => {
		expect(sqlLiteral(null)).toBe('NULL');
	});

	it('returns NULL for undefined', () => {
		expect(sqlLiteral(undefined)).toBe('NULL');
	});

	it('returns numeric string for numbers', () => {
		expect(sqlLiteral(42)).toBe('42');
		expect(sqlLiteral(3.14)).toBe('3.14');
	});

	it('returns 1/0 for booleans', () => {
		expect(sqlLiteral(true)).toBe('1');
		expect(sqlLiteral(false)).toBe('0');
	});

	it('wraps strings in single quotes', () => {
		expect(sqlLiteral('hello')).toBe("'hello'");
	});

	it('escapes single quotes in strings', () => {
		expect(sqlLiteral("it's")).toBe("'it''s'");
	});

	it('formats Date as ISO-like timestamp', () => {
		const d = new Date('2024-01-15T12:30:00.000Z');
		expect(sqlLiteral(d)).toBe("'2024-01-15 12:30:00.000'");
	});
});

// ──────────────────────────────────────────────
// buildCreateTable
// ──────────────────────────────────────────────
describe('buildCreateTable', () => {
	const columns: ColumnInfo[] = [
		{ name: 'id', dataType: 'INTEGER', nullable: false, defaultValue: null, isPrimaryKey: true, isAutoIncrement: true },
		{ name: 'name', dataType: 'TEXT', nullable: true, defaultValue: null, isPrimaryKey: false, isAutoIncrement: false },
		{ name: 'score', dataType: 'REAL', nullable: false, defaultValue: '0', isPrimaryKey: false, isAutoIncrement: false },
	];

	it('generates CREATE TABLE with correct column definitions for sqlite', () => {
		const ddl = buildCreateTable('users', columns, 'sqlite');
		expect(ddl).toContain('CREATE TABLE "users"');
		expect(ddl).toContain('"id" INTEGER NOT NULL');
		expect(ddl).toContain('"name" TEXT');
		expect(ddl).toContain('"score" REAL NOT NULL DEFAULT 0');
		expect(ddl).toContain('PRIMARY KEY ("id")');
	});

	it('quotes identifiers correctly for postgresql', () => {
		const ddl = buildCreateTable('my_table', columns, 'postgresql');
		expect(ddl).toContain('CREATE TABLE "my_table"');
		expect(ddl).toContain('"id" INTEGER NOT NULL');
	});

	it('quotes identifiers correctly for mysql', () => {
		const ddl = buildCreateTable('users', columns, 'mysql');
		expect(ddl).toContain('CREATE TABLE `users`');
		expect(ddl).toContain('`id` INTEGER NOT NULL');
		expect(ddl).toContain('PRIMARY KEY (`id`)');
	});

	it('handles table with no primary key columns', () => {
		const noPkCols: ColumnInfo[] = [
			{ name: 'a', dataType: 'TEXT', nullable: true, defaultValue: null, isPrimaryKey: false, isAutoIncrement: false },
		];
		const ddl = buildCreateTable('log', noPkCols, 'sqlite');
		expect(ddl).not.toContain('PRIMARY KEY');
	});
});

// ──────────────────────────────────────────────
// streamSqlExport — integration over a mock driver
// ──────────────────────────────────────────────
function makeSchema(cols: Array<{ name: string; isPrimaryKey?: boolean; dataType?: string }>): TableSchema {
	return {
		name: 'test',
		columns: cols.map((c) => ({
			name: c.name,
			dataType: c.dataType ?? 'TEXT',
			nullable: true,
			defaultValue: null,
			isPrimaryKey: c.isPrimaryKey ?? false,
			isAutoIncrement: false,
		})),
		indexes: [],
		foreignKeys: [],
	};
}

function makeDriver(schema: TableSchema, pages: Array<Record<string, unknown>[]>): DatabaseDriver {
	let callCount = 0;
	return {
		engine: 'sqlite',
		isConnected: true,
		connect: async () => {},
		disconnect: async () => {},
		testConnection: async () => ({ ok: true, latencyMs: 0 }),
		execute: async (_sql: string, _params?: unknown[]): Promise<QueryResult> => {
			const page = pages[callCount] ?? [];
			callCount++;
			const columns = schema.columns.map((c) => ({
				name: c.name,
				dataType: c.dataType,
				nullable: c.nullable,
				isPrimaryKey: c.isPrimaryKey,
			}));
			return { columns, rows: page, rowsAffected: page.length };
		},
		executeRaw: async () => ({ columns: [], rows: [], rowsAffected: 0 }),
		beginTransaction: async () => {},
		commitTransaction: async () => {},
		rollbackTransaction: async () => {},
		getTables: async () => [],
		getTableSchema: async () => schema,
		getViews: async () => [],
	};
}

describe('streamSqlExport', () => {
	it('emits DDL and INSERT statements', async () => {
		const schema = makeSchema([
			{ name: 'id', isPrimaryKey: true, dataType: 'INTEGER' },
			{ name: 'name', dataType: 'TEXT' },
		]);
		const driver = makeDriver(schema, [
			[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamSqlExport(driver, 'users', { batchSize: 10 })) {
			chunks.push(chunk);
		}
		const output = chunks.join('');
		expect(output).toContain('CREATE TABLE "users"');
		expect(output).toContain('INSERT INTO "users"');
		expect(output).toContain("'Alice'");
		expect(output).toContain("'Bob'");
	});

	it('omits DDL when includeDdl is false', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true, dataType: 'INTEGER' }]);
		const driver = makeDriver(schema, [
			[{ id: 1 }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamSqlExport(driver, 'items', { includeDdl: false })) {
			chunks.push(chunk);
		}
		const output = chunks.join('');
		expect(output).not.toContain('CREATE TABLE');
		expect(output).toContain('INSERT INTO');
	});

	it('emits DROP TABLE when dropIfExists is true', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true, dataType: 'INTEGER' }]);
		const driver = makeDriver(schema, [[], []]);

		const chunks: string[] = [];
		for await (const chunk of streamSqlExport(driver, 'items', { dropIfExists: true })) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toContain('DROP TABLE IF EXISTS');
	});

	it('emits NULL for null values', async () => {
		const schema = makeSchema([
			{ name: 'id', isPrimaryKey: true, dataType: 'INTEGER' },
			{ name: 'val', dataType: 'TEXT' },
		]);
		const driver = makeDriver(schema, [
			[{ id: 1, val: null }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamSqlExport(driver, 't', { includeDdl: false })) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toContain('NULL');
	});

	it('paginates across multiple pages', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true, dataType: 'INTEGER' }]);
		const driver = makeDriver(schema, [
			[{ id: 1 }, { id: 2 }],
			[{ id: 3 }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamSqlExport(driver, 't', { includeDdl: false, pageSize: 2, batchSize: 10 })) {
			chunks.push(chunk);
		}
		const output = chunks.join('');
		// Should see two INSERT statements (one per page)
		const insertCount = (output.match(/INSERT INTO/g) ?? []).length;
		expect(insertCount).toBe(2);
	});
});
