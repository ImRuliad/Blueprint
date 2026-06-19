import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdirSync, chmodSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '$lib/utils/platform';
import * as schema from './schema';
import { lt } from 'drizzle-orm';
import { changeBufferSnapshots } from './schema';

const dataDir = getDataDir();

try {
	mkdirSync(dataDir, { recursive: true, mode: 0o700 });
} catch (err) {
	console.error(`Fatal: cannot create data directory at ${dataDir}. Check permissions or set BLUEPRINT_DATA_DIR`, err);
	process.exit(1);
}

const dbPath = join(dataDir, 'meta.db');

let sqlite: InstanceType<typeof Database>;
try {
	sqlite = new Database(dbPath);
} catch (err) {
	console.error(`Fatal: cannot open database at ${dbPath}. File may be locked or corrupted`, err);
	process.exit(1);
}

try {
	chmodSync(dbPath, 0o600);
} catch {
	// Best effort — may fail on Windows or some filesystems
}

try {
	sqlite.exec('PRAGMA journal_mode=WAL');
	sqlite.exec('PRAGMA foreign_keys=ON');
} catch (err) {
	console.error('Fatal: failed to configure SQLite', err);
	process.exit(1);
}

export const db = drizzle(sqlite, { schema });

try {
	migrate(db, { migrationsFolder: './drizzle' });
} catch (err) {
	console.error('Fatal: database migration failed. Ensure drizzle/ folder is present', err);
	process.exit(1);
}

function purgeStaleSnapshots(): void {
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	db.delete(changeBufferSnapshots)
		.where(lt(changeBufferSnapshots.savedAt, cutoff))
		.run();
}

try {
	purgeStaleSnapshots();
} catch (err) {
	console.warn('Warning: failed to purge stale snapshots', err);
}
