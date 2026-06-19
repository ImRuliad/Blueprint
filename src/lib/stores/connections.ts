import { writable, derived } from 'svelte/store';

export interface ConnectionWithStatus {
	id: string;
	name: string;
	engine: string;
	host: string | null;
	port: number | null;
	database: string | null;
	username: string | null;
	connectionString: string | null;
	sqlitePath: string | null;
	groupName: string | null;
	color: string | null;
	sortOrder: number;
	connected: boolean;
}

export const connections = writable<ConnectionWithStatus[]>([]);

export async function refreshConnections(): Promise<void> {
	const res = await fetch('/api/connections');
	if (res.ok) {
		const body = await res.json();
		connections.set(body.data);
	}
}

export const connectionGroups = derived(connections, ($connections) => {
	const groups = new Map<string, ConnectionWithStatus[]>();
	for (const conn of $connections) {
		const key = conn.groupName ?? '';
		const list = groups.get(key) ?? [];
		list.push(conn);
		groups.set(key, list);
	}
	// Sort connections within each group by sortOrder
	for (const list of groups.values()) {
		list.sort((a, b) => a.sortOrder - b.sortOrder);
	}
	return groups;
});
