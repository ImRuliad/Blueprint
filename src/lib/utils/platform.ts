import { homedir } from 'os';
import { join } from 'path';

export function getDataDir(): string {
	if (process.env.BLUEPRINT_DATA_DIR) return process.env.BLUEPRINT_DATA_DIR;
	if (process.env.DOCKER === '1') return '/data';
	return join(homedir(), '.blueprint');
}

export function getDefaultSSHDir(): string {
	return join(homedir(), '.ssh');
}

export function getMetaDbPath(): string {
	return join(getDataDir(), 'meta.db');
}
