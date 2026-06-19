import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getPool, createPool, destroyPool, destroyAllPools, isConnected } from './pool';
import type { DatabaseDriver, EngineType, QueryResult, TableInfo, TableSchema, ViewInfo } from './types';

function createMockDriver(connected = true): DatabaseDriver {
	return {
		engine: 'sqlite' as EngineType,
		isConnected: connected,
		connect: vi.fn(),
		disconnect: vi.fn(),
		testConnection: vi.fn(),
		execute: vi.fn(),
		executeRaw: vi.fn(),
		beginTransaction: vi.fn(),
		commitTransaction: vi.fn(),
		rollbackTransaction: vi.fn(),
		getTables: vi.fn<() => Promise<TableInfo[]>>().mockResolvedValue([]),
		getTableSchema: vi.fn<() => Promise<TableSchema>>().mockResolvedValue({
			name: 'test',
			columns: [],
			indexes: [],
			foreignKeys: [],
		}),
		getViews: vi.fn<() => Promise<ViewInfo[]>>().mockResolvedValue([]),
	};
}

describe('ConnectionPoolRegistry', () => {
	beforeEach(async () => {
		await destroyAllPools();
	});

	it('createPool registers a driver and getPool retrieves it', async () => {
		const driver = createMockDriver();
		await createPool('conn-1', driver);
		expect(getPool('conn-1')).toBe(driver);
	});

	it('getPool returns undefined for unknown connection', () => {
		expect(getPool('nonexistent')).toBeUndefined();
	});

	it('createPool replaces existing pool and disconnects old driver', async () => {
		const driver1 = createMockDriver();
		const driver2 = createMockDriver();

		await createPool('conn-1', driver1);
		await createPool('conn-1', driver2);

		expect(driver1.disconnect).toHaveBeenCalledOnce();
		expect(getPool('conn-1')).toBe(driver2);
	});

	it('destroyPool removes pool and disconnects', async () => {
		const driver = createMockDriver();
		await createPool('conn-1', driver);
		await destroyPool('conn-1');

		expect(driver.disconnect).toHaveBeenCalledOnce();
		expect(getPool('conn-1')).toBeUndefined();
	});

	it('destroyPool is safe for unknown connection', async () => {
		await expect(destroyPool('nonexistent')).resolves.not.toThrow();
	});

	it('destroyAllPools removes all pools and disconnects all drivers', async () => {
		const driver1 = createMockDriver();
		const driver2 = createMockDriver();

		await createPool('conn-1', driver1);
		await createPool('conn-2', driver2);
		await destroyAllPools();

		expect(driver1.disconnect).toHaveBeenCalledOnce();
		expect(driver2.disconnect).toHaveBeenCalledOnce();
		expect(getPool('conn-1')).toBeUndefined();
		expect(getPool('conn-2')).toBeUndefined();
	});

	it('isConnected returns true for connected driver', async () => {
		const driver = createMockDriver(true);
		await createPool('conn-1', driver);
		expect(isConnected('conn-1')).toBe(true);
	});

	it('isConnected returns false for disconnected driver', async () => {
		const driver = createMockDriver(false);
		await createPool('conn-1', driver);
		expect(isConnected('conn-1')).toBe(false);
	});

	it('isConnected returns false for unknown connection', () => {
		expect(isConnected('nonexistent')).toBe(false);
	});
});
