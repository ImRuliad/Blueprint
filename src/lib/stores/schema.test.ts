import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	getCachedSchema,
	setCachedSchema,
	invalidateSchema,
	invalidateConnection,
	schemaCache,
} from './schema';
import type { TableSchema } from '$lib/server/drivers/types';
import { get } from 'svelte/store';

function makeSchema(name: string): TableSchema {
	return {
		name,
		columns: [
			{
				name: 'id',
				dataType: 'integer',
				nullable: false,
				defaultValue: null,
				isPrimaryKey: true,
				isAutoIncrement: true,
			},
		],
		indexes: [],
		foreignKeys: [],
	};
}

describe('schemaCache', () => {
	beforeEach(() => {
		// Clear cache before each test
		schemaCache.set(new Map());
	});

	it('returns null for uncached entry', () => {
		expect(getCachedSchema('conn-1', 'users')).toBeNull();
	});

	it('returns cached schema immediately after setting', () => {
		const schema = makeSchema('users');
		setCachedSchema('conn-1', 'users', schema);
		expect(getCachedSchema('conn-1', 'users')).toEqual(schema);
	});

	it('returns null after TTL expiry', () => {
		const schema = makeSchema('users');
		setCachedSchema('conn-1', 'users', schema);

		// Manually set fetchedAt to past TTL
		const cache = get(schemaCache);
		const entry = cache.get('conn-1::users');
		if (entry) {
			entry.fetchedAt = Date.now() - 6 * 60 * 1000; // 6 minutes ago
		}

		expect(getCachedSchema('conn-1', 'users')).toBeNull();
	});

	it('removes expired entry from cache on TTL miss', () => {
		const schema = makeSchema('users');
		setCachedSchema('conn-1', 'users', schema);

		const cache = get(schemaCache);
		const entry = cache.get('conn-1::users');
		if (entry) {
			entry.fetchedAt = Date.now() - 6 * 60 * 1000;
		}

		getCachedSchema('conn-1', 'users');
		expect(get(schemaCache).has('conn-1::users')).toBe(false);
	});

	it('invalidateSchema removes a specific entry', () => {
		setCachedSchema('conn-1', 'users', makeSchema('users'));
		setCachedSchema('conn-1', 'posts', makeSchema('posts'));

		invalidateSchema('conn-1', 'users');

		expect(getCachedSchema('conn-1', 'users')).toBeNull();
		expect(getCachedSchema('conn-1', 'posts')).not.toBeNull();
	});

	it('invalidateConnection removes all entries for a connection', () => {
		setCachedSchema('conn-1', 'users', makeSchema('users'));
		setCachedSchema('conn-1', 'posts', makeSchema('posts'));
		setCachedSchema('conn-2', 'orders', makeSchema('orders'));

		invalidateConnection('conn-1');

		expect(getCachedSchema('conn-1', 'users')).toBeNull();
		expect(getCachedSchema('conn-1', 'posts')).toBeNull();
		expect(getCachedSchema('conn-2', 'orders')).not.toBeNull();
	});

	it('caches different tables independently', () => {
		const s1 = makeSchema('users');
		const s2 = makeSchema('posts');
		setCachedSchema('conn-1', 'users', s1);
		setCachedSchema('conn-1', 'posts', s2);

		expect(getCachedSchema('conn-1', 'users')).toEqual(s1);
		expect(getCachedSchema('conn-1', 'posts')).toEqual(s2);
	});

	it('caches same table name for different connections independently', () => {
		const s1 = makeSchema('users');
		const s2 = makeSchema('users');
		s2.columns[0].dataType = 'varchar';

		setCachedSchema('conn-1', 'users', s1);
		setCachedSchema('conn-2', 'users', s2);

		expect(getCachedSchema('conn-1', 'users')).toEqual(s1);
		expect(getCachedSchema('conn-2', 'users')).toEqual(s2);
	});
});
