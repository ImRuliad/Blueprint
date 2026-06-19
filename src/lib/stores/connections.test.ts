import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { connections, refreshConnections, connectionGroups } from './connections';

const mockConnections = [
	{
		id: '1', name: 'Dev PG', engine: 'postgresql', host: 'localhost',
		port: 5432, database: 'dev', username: 'postgres', connectionString: null,
		sqlitePath: null, groupName: 'Development', color: '#60a5fa', sortOrder: 0, connected: true,
	},
	{
		id: '2', name: 'Prod PG', engine: 'postgresql', host: 'prod.db',
		port: 5432, database: 'prod', username: 'admin', connectionString: null,
		sqlitePath: null, groupName: 'Production', color: '#ef4444', sortOrder: 0, connected: false,
	},
	{
		id: '3', name: 'Local SQLite', engine: 'sqlite', host: null,
		port: null, database: null, username: null, connectionString: null,
		sqlitePath: '/tmp/test.db', groupName: 'Development', color: null, sortOrder: 1, connected: false,
	},
];

describe('connections store', () => {
	beforeEach(() => {
		connections.set([]);
		vi.restoreAllMocks();
	});

	it('refreshConnections fetches and sets connections', async () => {
		const mockFetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ data: mockConnections }),
		});
		vi.stubGlobal('fetch', mockFetch);

		await refreshConnections();

		expect(mockFetch).toHaveBeenCalledWith('/api/connections');
		expect(get(connections)).toEqual(mockConnections);
	});

	it('refreshConnections does not update on fetch failure', async () => {
		connections.set(mockConnections);
		const mockFetch = vi.fn().mockResolvedValue({ ok: false });
		vi.stubGlobal('fetch', mockFetch);

		await refreshConnections();

		expect(get(connections)).toEqual(mockConnections);
	});

	it('connectionGroups groups by groupName', () => {
		connections.set(mockConnections);
		const groups = get(connectionGroups);

		expect(groups.size).toBe(2);
		expect(groups.get('Development')?.length).toBe(2);
		expect(groups.get('Production')?.length).toBe(1);
	});

	it('connectionGroups sorts by sortOrder within groups', () => {
		connections.set(mockConnections);
		const groups = get(connectionGroups);
		const dev = groups.get('Development')!;

		expect(dev[0].name).toBe('Dev PG');
		expect(dev[1].name).toBe('Local SQLite');
	});

	it('connectionGroups uses empty string key for ungrouped', () => {
		connections.set([{ ...mockConnections[0], groupName: null }]);
		const groups = get(connectionGroups);

		expect(groups.has('')).toBe(true);
		expect(groups.get('')?.length).toBe(1);
	});
});
