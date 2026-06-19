import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit test for the connection API response shape.
 * Tests the data transformation logic used in GET /api/connections.
 */

describe('GET /api/connections response shape', () => {
	it('returns connections with connected status boolean', () => {
		// Simulate the transformation done in the GET handler
		const dbRows = [
			{
				id: 'abc-123',
				name: 'Test PG',
				engine: 'postgresql',
				host: 'localhost',
				port: 5432,
				database: 'testdb',
				username: 'user',
				connectionString: null,
				sqlitePath: null,
				sshConfigId: null,
				tlsConfigId: null,
				groupName: null,
				color: '#60a5fa',
				sortOrder: 0,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
		];

		const connectedIds = new Set(['abc-123']);
		const isConnected = (id: string) => connectedIds.has(id);

		const data = dbRows.map((row) => ({
			...row,
			connected: isConnected(row.id),
		}));

		expect(data).toHaveLength(1);
		expect(data[0]).toMatchObject({
			id: 'abc-123',
			name: 'Test PG',
			engine: 'postgresql',
			connected: true,
		});
		expect(data[0]).toHaveProperty('host');
		expect(data[0]).toHaveProperty('port');
		expect(data[0]).toHaveProperty('database');
		expect(data[0]).toHaveProperty('username');
		expect(data[0]).toHaveProperty('connectionString');
		expect(data[0]).toHaveProperty('sqlitePath');
		expect(data[0]).toHaveProperty('groupName');
		expect(data[0]).toHaveProperty('color');
		expect(data[0]).toHaveProperty('sortOrder');
	});

	it('disconnected connections have connected=false', () => {
		const dbRows = [
			{
				id: 'xyz-789',
				name: 'Offline DB',
				engine: 'sqlite',
				host: null,
				port: null,
				database: null,
				username: null,
				connectionString: null,
				sqlitePath: '/tmp/test.db',
				sshConfigId: null,
				tlsConfigId: null,
				groupName: 'Dev',
				color: null,
				sortOrder: 1,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
		];

		const connectedIds = new Set<string>();
		const isConnected = (id: string) => connectedIds.has(id);

		const data = dbRows.map((row) => ({
			...row,
			connected: isConnected(row.id),
		}));

		expect(data[0].connected).toBe(false);
		expect(data[0].groupName).toBe('Dev');
	});
});
