import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { getDataDir } from '$lib/utils/platform';
import * as schema from './schema';
import { lt } from 'drizzle-orm';
import { changeBufferSnapshots } from './schema';

const dataDir = getDataDir();
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'meta.db');
const sqlite = new Database(dbPath);

sqlite.exec('PRAGMA journal_mode=WAL');
sqlite.exec('PRAGMA foreign_keys=ON');

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: './drizzle' });

function purgeStaleSnapshots(): void {
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	db.delete(changeBufferSnapshots)
		.where(lt(changeBufferSnapshots.savedAt, cutoff))
		.run();
}

purgeStaleSnapshots();
