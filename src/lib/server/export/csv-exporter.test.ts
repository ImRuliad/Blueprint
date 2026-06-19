import { describe, it, expect } from 'vitest';
import { formatCsvField, formatCsvRow, streamCsvExport } from './csv-exporter';
import type { DatabaseDriver, QueryResult, TableSchema } from '$lib/server/drivers/types';

// ──────────────────────────────────────────────
// formatCsvField — RFC 4180 escaping
// ──────────────────────────────────────────────
describe('formatCsvField', () => {
	it('returns plain values unchanged', () => {
		expect(formatCsvField('hello')).toBe('hello');
		expect(formatCsvField('123')).toBe('123');
		expect(formatCsvField('')).toBe('');
	});

	it('wraps values containing a comma in double quotes', () => {
		expect(formatCsvField('a,b')).toBe('"a,b"');
	});

	it('wraps values containing a double-quote and escapes the quote', () => {
		expect(formatCsvField('say "hi"')).toBe('"say ""hi"""');
	});

	it('wraps values containing a newline', () => {
		expect(formatCsvField('line1\nline2')).toBe('"line1\nline2"');
	});

	it('wraps values containing a carriage return', () => {
		expect(formatCsvField('line1\rline2')).toBe('"line1\rline2"');
	});
});

// ──────────────────────────────────────────────
// formatCsvRow
// ──────────────────────────────────────────────
describe('formatCsvRow', () => {
	it('joins simple fields with commas', () => {
		expect(formatCsvRow(['a', 'b', 'c'])).toBe('a,b,c');
	});

	it('quotes fields that need quoting', () => {
		expect(formatCsvRow(['a', 'b,c', 'd'])).toBe('a,"b,c",d');
	});
});

// ──────────────────────────────────────────────
// streamCsvExport — integration over a mock driver
// ──────────────────────────────────────────────

function makeSchema(columns: Array<{ name: string; isPrimaryKey?: boolean }>): TableSchema {
	return {
		name: 'test',
		columns: columns.map((c) => ({
			name: c.name,
			dataType: 'text',
			nullable: true,
			defaultValue: null,
			isPrimaryKey: c.isPrimaryKey ?? false,
			isAutoIncrement: false,
		})),
		indexes: [],
		foreignKeys: [],
	};
}

function makeDriver(
	schema: TableSchema,
	pages: Array<Record<string, unknown>[]>
): DatabaseDriver {
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
		executeRaw: async (sql: string) => ({ columns: [], rows: [], rowsAffected: 0 }),
		beginTransaction: async () => {},
		commitTransaction: async () => {},
		rollbackTransaction: async () => {},
		getTables: async () => [],
		getTableSchema: async () => schema,
		getViews: async () => [],
	};
}

describe('streamCsvExport', () => {
	it('emits header row followed by data rows', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }, { name: 'name' }]);
		const driver = makeDriver(schema, [
			[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
			[], // signals end of data
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test', { pageSize: 1000 })) {
			chunks.push(chunk);
		}
		const output = chunks.join('');
		expect(output).toBe('id,name\r\n1,Alice\r\n2,Bob\r\n');
	});

	it('omits header when includeHeader is false', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }, { name: 'val' }]);
		const driver = makeDriver(schema, [
			[{ id: 1, val: 'x' }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test', { includeHeader: false })) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toBe('1,x\r\n');
	});

	it('renders NULL as empty string by default', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }, { name: 'val' }]);
		const driver = makeDriver(schema, [
			[{ id: 1, val: null }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test')) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toBe('id,val\r\n1,\r\n');
	});

	it('renders NULL as custom nullValue when configured', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }, { name: 'val' }]);
		const driver = makeDriver(schema, [
			[{ id: 1, val: null }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test', { nullValue: '\\N' })) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toBe('id,val\r\n1,\\N\r\n');
	});

	it('escapes values with commas and double-quotes', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }, { name: 'desc' }]);
		const driver = makeDriver(schema, [
			[{ id: 1, desc: 'a, "b"' }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test')) {
			chunks.push(chunk);
		}
		// desc value: a, "b" → "a, ""b"""
		expect(chunks.join('')).toBe('id,desc\r\n1,"a, ""b"""\r\n');
	});

	it('paginates across multiple pages', async () => {
		const schema = makeSchema([{ name: 'id', isPrimaryKey: true }]);
		const driver = makeDriver(schema, [
			[{ id: 1 }, { id: 2 }],
			[{ id: 3 }],
			[],
		]);

		const chunks: string[] = [];
		for await (const chunk of streamCsvExport(driver, 'test', { pageSize: 2 })) {
			chunks.push(chunk);
		}
		expect(chunks.join('')).toBe('id\r\n1\r\n2\r\n3\r\n');
	});
});
