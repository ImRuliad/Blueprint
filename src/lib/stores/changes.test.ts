import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
	pendingChanges,
	changeCount,
	stageUpdate,
	stageInsert,
	stageDelete,
	revertChange,
	revertAll,
} from './changes';

describe('changes store', () => {
	beforeEach(() => {
		pendingChanges.set([]);
	});

	it('stageUpdate adds a pending update', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');

		const changes = get(pendingChanges);
		expect(changes).toHaveLength(1);
		expect(changes[0].operation).toBe('update');
		expect(changes[0].connectionId).toBe('conn1');
		expect(changes[0].tableName).toBe('users');
		expect(changes[0].column).toBe('name');
		expect(changes[0].oldValue).toBe('Alice');
		expect(changes[0].newValue).toBe('Bob');
		expect(changes[0].pk).toEqual({ id: 1 });
	});

	it('stageInsert adds a pending insert', () => {
		stageInsert('conn1', 'users', { name: 'Charlie', age: 30 });

		const changes = get(pendingChanges);
		expect(changes).toHaveLength(1);
		expect(changes[0].operation).toBe('insert');
		expect(changes[0].row).toEqual({ name: 'Charlie', age: 30 });
	});

	it('stageDelete adds a pending delete', () => {
		stageDelete('conn1', 'users', { id: 5 });

		const changes = get(pendingChanges);
		expect(changes).toHaveLength(1);
		expect(changes[0].operation).toBe('delete');
		expect(changes[0].pk).toEqual({ id: 5 });
	});

	it('merges consecutive updates to same cell', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Bob', 'Charlie');

		const changes = get(pendingChanges);
		expect(changes).toHaveLength(1);
		expect(changes[0].oldValue).toBe('Alice');
		expect(changes[0].newValue).toBe('Charlie');
	});

	it('does not merge updates to different columns', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		stageUpdate('conn1', 'users', { id: 1 }, 'email', 'a@b.com', 'b@c.com');

		expect(get(pendingChanges)).toHaveLength(2);
	});

	it('does not merge updates to different rows', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		stageUpdate('conn1', 'users', { id: 2 }, 'name', 'Carol', 'Dave');

		expect(get(pendingChanges)).toHaveLength(2);
	});

	it('revertChange removes a single change', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		stageInsert('conn1', 'users', { name: 'Eve' });

		const changes = get(pendingChanges);
		expect(changes).toHaveLength(2);

		revertChange(changes[0].id);
		expect(get(pendingChanges)).toHaveLength(1);
		expect(get(pendingChanges)[0].operation).toBe('insert');
	});

	it('revertAll clears all changes', () => {
		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		stageInsert('conn1', 'users', { name: 'Eve' });
		stageDelete('conn1', 'users', { id: 3 });

		expect(get(pendingChanges)).toHaveLength(3);

		revertAll();
		expect(get(pendingChanges)).toHaveLength(0);
	});

	it('changeCount derived store reflects count', () => {
		expect(get(changeCount)).toBe(0);

		stageUpdate('conn1', 'users', { id: 1 }, 'name', 'Alice', 'Bob');
		expect(get(changeCount)).toBe(1);

		stageInsert('conn1', 'users', { name: 'Eve' });
		expect(get(changeCount)).toBe(2);

		revertAll();
		expect(get(changeCount)).toBe(0);
	});
});
