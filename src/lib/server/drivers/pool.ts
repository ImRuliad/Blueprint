import type { DatabaseDriver } from './types';

interface PoolEntry {
	driver: DatabaseDriver;
	createdAt: Date;
}

// Use globalThis for HMR protection in dev — prevents duplicate registries
// when Vite hot-reloads this module.
const registry: Map<string, PoolEntry> =
	((globalThis as Record<string, unknown>).__blueprint_pools as Map<string, PoolEntry>) ??=
		new Map<string, PoolEntry>();

export function getPool(connectionId: string): DatabaseDriver | undefined {
	return registry.get(connectionId)?.driver;
}

export async function createPool(connectionId: string, driver: DatabaseDriver): Promise<DatabaseDriver> {
	// Destroy existing pool for this ID if present
	const existing = registry.get(connectionId);
	if (existing) {
		await existing.driver.disconnect();
	}

	registry.set(connectionId, { driver, createdAt: new Date() });
	return driver;
}

export async function destroyPool(connectionId: string): Promise<void> {
	const entry = registry.get(connectionId);
	if (entry) {
		await entry.driver.disconnect();
		registry.delete(connectionId);
	}
}

export async function destroyAllPools(): Promise<void> {
	const entries = Array.from(registry.entries());
	registry.clear();
	await Promise.allSettled(entries.map(([, entry]) => entry.driver.disconnect()));
}

export function isConnected(connectionId: string): boolean {
	const entry = registry.get(connectionId);
	return entry?.driver.isConnected ?? false;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
	await destroyAllPools();
	process.exit(0);
});
process.on('SIGINT', async () => {
	await destroyAllPools();
	process.exit(0);
});
