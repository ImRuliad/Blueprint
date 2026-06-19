import { writable, get } from 'svelte/store';
import type { TableSchema } from '$lib/server/drivers/types';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
	schema: TableSchema;
	fetchedAt: number;
}

type CacheKey = string;

function makeCacheKey(connectionId: string, tableName: string): CacheKey {
	return `${connectionId}::${tableName}`;
}

export const schemaCache = writable<Map<CacheKey, CacheEntry>>(new Map());

export function getCachedSchema(connectionId: string, tableName: string): TableSchema | null {
	const key = makeCacheKey(connectionId, tableName);
	const entry = get(schemaCache).get(key);
	if (!entry) return null;
	if (Date.now() - entry.fetchedAt > TTL_MS) {
		invalidateSchema(connectionId, tableName);
		return null;
	}
	return entry.schema;
}

export function setCachedSchema(connectionId: string, tableName: string, schema: TableSchema): void {
	const key = makeCacheKey(connectionId, tableName);
	schemaCache.update((cache) => {
		const next = new Map(cache);
		next.set(key, { schema, fetchedAt: Date.now() });
		return next;
	});
}

export function invalidateSchema(connectionId: string, tableName: string): void {
	const key = makeCacheKey(connectionId, tableName);
	schemaCache.update((cache) => {
		const next = new Map(cache);
		next.delete(key);
		return next;
	});
}

export function invalidateConnection(connectionId: string): void {
	schemaCache.update((cache) => {
		const next = new Map(cache);
		for (const key of next.keys()) {
			if (key.startsWith(`${connectionId}::`)) {
				next.delete(key);
			}
		}
		return next;
	});
}

export async function fetchTableSchema(
	connectionId: string,
	tableName: string
): Promise<TableSchema> {
	const cached = getCachedSchema(connectionId, tableName);
	if (cached) return cached;

	const res = await fetch(`/api/schema/${connectionId}/tables/${encodeURIComponent(tableName)}`);
	if (!res.ok) {
		const body = await res.json().catch(() => ({}));
		throw new Error(body?.error?.message ?? `Failed to fetch schema for ${tableName}`);
	}

	const body = await res.json();
	const schema: TableSchema = body.data;
	setCachedSchema(connectionId, tableName, schema);
	return schema;
}
