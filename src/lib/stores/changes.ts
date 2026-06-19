import { writable, derived, get } from 'svelte/store';

export interface PendingChange {
	id: string;
	connectionId: string;
	tableName: string;
	operation: 'insert' | 'update' | 'delete';
	pk: Record<string, unknown>;
	column?: string;
	oldValue?: unknown;
	newValue?: unknown;
	row?: Record<string, unknown>;
	timestamp: Date;
}

export const pendingChanges = writable<PendingChange[]>([]);

export const changeCount = derived(pendingChanges, ($c) => $c.length);

export function stageUpdate(
	connectionId: string,
	tableName: string,
	pk: Record<string, unknown>,
	column: string,
	oldValue: unknown,
	newValue: unknown
): void {
	pendingChanges.update((changes) => {
		// Merge consecutive updates to same (table, pk, column)
		const existing = changes.find(
			(c) =>
				c.connectionId === connectionId &&
				c.tableName === tableName &&
				c.operation === 'update' &&
				c.column === column &&
				pkEquals(c.pk, pk)
		);

		if (existing) {
			// Keep original oldValue, update newValue
			return changes.map((c) =>
				c.id === existing.id
					? { ...c, newValue, timestamp: new Date() }
					: c
			);
		}

		return [
			...changes,
			{
				id: crypto.randomUUID(),
				connectionId,
				tableName,
				operation: 'update',
				pk,
				column,
				oldValue,
				newValue,
				timestamp: new Date(),
			},
		];
	});
}

export function stageInsert(
	connectionId: string,
	tableName: string,
	row: Record<string, unknown>
): void {
	pendingChanges.update((changes) => [
		...changes,
		{
			id: crypto.randomUUID(),
			connectionId,
			tableName,
			operation: 'insert',
			pk: {},
			row,
			timestamp: new Date(),
		},
	]);
}

export function stageDelete(
	connectionId: string,
	tableName: string,
	pk: Record<string, unknown>
): void {
	pendingChanges.update((changes) => [
		...changes,
		{
			id: crypto.randomUUID(),
			connectionId,
			tableName,
			operation: 'delete',
			pk,
			timestamp: new Date(),
		},
	]);
}

export function revertChange(changeId: string): void {
	pendingChanges.update((changes) => changes.filter((c) => c.id !== changeId));
}

export function revertAll(): void {
	pendingChanges.set([]);
}

function pkEquals(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	if (keysA.length !== keysB.length) return false;
	return keysA.every((k) => a[k] === b[k]);
}
