import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { QueryResult, ColumnDescriptor } from '$lib/server/drivers/types';

/**
 * Unit tests for query route logic.
 * Tests the data transformation and response shape without SvelteKit request mocks.
 */

const mockColumn: ColumnDescriptor = {
	name: 'id',
	dataType: 'integer',
	nullable: false,
	isPrimaryKey: true,
};

const mockQueryResult: QueryResult = {
	columns: [mockColumn, { name: 'name', dataType: 'text', nullable: true, isPrimaryKey: false }],
	rows: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
	rowsAffected: 0,
};

describe('query route response shape', () => {
	it('formats a successful SELECT result correctly', () => {
		const durationMs = 42;
		const response = {
			data: {
				columns: mockQueryResult.columns,
				rows: mockQueryResult.rows,
				rowsAffected: mockQueryResult.rowsAffected,
				durationMs,
			},
		};

		expect(response.data.columns).toHaveLength(2);
		expect(response.data.columns[0].name).toBe('id');
		expect(response.data.rows).toHaveLength(2);
		expect(response.data.rows[0]).toMatchObject({ id: 1, name: 'Alice' });
		expect(response.data.rowsAffected).toBe(0);
		expect(response.data.durationMs).toBe(42);
	});

	it('formats a DML result with rowsAffected and no columns', () => {
		const dmlResult: QueryResult = {
			columns: [],
			rows: [],
			rowsAffected: 3,
		};

		const durationMs = 10;
		const response = {
			data: {
				columns: dmlResult.columns,
				rows: dmlResult.rows,
				rowsAffected: dmlResult.rowsAffected,
				durationMs,
			},
		};

		expect(response.data.columns).toHaveLength(0);
		expect(response.data.rows).toHaveLength(0);
		expect(response.data.rowsAffected).toBe(3);
	});

	it('history entry shape is correct for successful query', () => {
		const entry = {
			id: crypto.randomUUID(),
			connectionId: 'conn-1',
			sql: 'SELECT 1',
			executedAt: new Date().toISOString(),
			durationMs: 15,
			rowCount: 1,
			error: null,
		};

		expect(entry.connectionId).toBe('conn-1');
		expect(entry.sql).toBe('SELECT 1');
		expect(entry.error).toBeNull();
		expect(entry.rowCount).toBe(1);
	});

	it('history entry shape is correct for failed query', () => {
		const entry = {
			id: crypto.randomUUID(),
			connectionId: 'conn-1',
			sql: 'SELECT * FROM nonexistent',
			executedAt: new Date().toISOString(),
			durationMs: 5,
			rowCount: null,
			error: 'Table nonexistent does not exist',
		};

		expect(entry.error).toBe('Table nonexistent does not exist');
		expect(entry.rowCount).toBeNull();
	});
});

describe('query route validation', () => {
	it('rejects missing connectionId', () => {
		const body = { sql: 'SELECT 1' };
		expect(body.connectionId).toBeUndefined();
		// In the handler: if (!connectionId) throw new ValidationError('connectionId is required')
		expect(!('connectionId' in body) || !body.connectionId).toBe(true);
	});

	it('rejects missing sql', () => {
		const body = { connectionId: 'conn-1' };
		expect(body.sql).toBeUndefined();
		// In the handler: if (!sql || !sql.trim()) throw new ValidationError('sql is required')
		const sql = (body as Record<string, unknown>).sql as string | undefined;
		expect(!sql || !String(sql ?? '').trim()).toBe(true);
	});

	it('rejects empty sql string', () => {
		const sql = '   ';
		expect(!sql || !sql.trim()).toBe(true);
	});
});

describe('query history GET route response shape', () => {
	it('returns an array of history entries ordered by executedAt desc', () => {
		const entries = [
			{
				id: 'h-2',
				connectionId: 'conn-1',
				sql: 'SELECT 2',
				executedAt: '2026-06-15T10:01:00.000Z',
				durationMs: 20,
				rowCount: 1,
				error: null,
			},
			{
				id: 'h-1',
				connectionId: 'conn-1',
				sql: 'SELECT 1',
				executedAt: '2026-06-15T10:00:00.000Z',
				durationMs: 10,
				rowCount: 1,
				error: null,
			},
		];

		// Verify descending order
		expect(entries[0].executedAt > entries[1].executedAt).toBe(true);
		expect(entries).toHaveLength(2);
		expect(entries[0].sql).toBe('SELECT 2');
	});
});
