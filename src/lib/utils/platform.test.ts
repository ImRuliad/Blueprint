import { describe, it, expect, afterEach, vi } from 'vitest';
import { homedir } from 'os';
import { join } from 'path';

describe('platform utilities', () => {
	const originalEnv = { ...process.env };

	afterEach(() => {
		process.env = { ...originalEnv };
		vi.resetModules();
	});

	describe('getDataDir', () => {
		it('returns BLUEPRINT_DATA_DIR when set', async () => {
			process.env.BLUEPRINT_DATA_DIR = '/custom/data/dir';
			delete process.env.DOCKER;
			const { getDataDir } = await import('./platform');
			expect(getDataDir()).toBe('/custom/data/dir');
		});

		it('returns /data when DOCKER=1', async () => {
			delete process.env.BLUEPRINT_DATA_DIR;
			process.env.DOCKER = '1';
			const { getDataDir } = await import('./platform');
			expect(getDataDir()).toBe('/data');
		});

		it('returns ~/.blueprint by default', async () => {
			delete process.env.BLUEPRINT_DATA_DIR;
			delete process.env.DOCKER;
			const { getDataDir } = await import('./platform');
			expect(getDataDir()).toBe(join(homedir(), '.blueprint'));
		});

		it('prefers BLUEPRINT_DATA_DIR over DOCKER', async () => {
			process.env.BLUEPRINT_DATA_DIR = '/override';
			process.env.DOCKER = '1';
			const { getDataDir } = await import('./platform');
			expect(getDataDir()).toBe('/override');
		});
	});

	describe('getDefaultSSHDir', () => {
		it('returns ~/.ssh', async () => {
			const { getDefaultSSHDir } = await import('./platform');
			expect(getDefaultSSHDir()).toBe(join(homedir(), '.ssh'));
		});
	});

	describe('getMetaDbPath', () => {
		it('returns meta.db inside data dir', async () => {
			delete process.env.BLUEPRINT_DATA_DIR;
			delete process.env.DOCKER;
			const { getMetaDbPath } = await import('./platform');
			expect(getMetaDbPath()).toBe(join(homedir(), '.blueprint', 'meta.db'));
		});
	});
});
