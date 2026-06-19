// Stub for bun:sqlite used when running under Node/Vite dev SSR.
// In production the app runs under Bun where bun:sqlite is a native built-in.
// This stub returns no-op objects so drizzle-orm initialises without crashing.

const noopStatement = {
	run: () => ({ changes: 0, lastInsertRowid: 0 }),
	get: () => undefined,
	all: () => [],
	values: () => [],
	finalize: () => {},
	toString: () => '',
};

export class Database {
	constructor(_path?: string) {
		if (typeof globalThis.Bun !== 'undefined') return; // Real Bun runtime, stub shouldn't be active
		if (process.env.NODE_ENV === 'production') {
			console.error('[Blueprint] FATAL: bun:sqlite stub is active in production. All data operations are no-ops. This is a build/deployment misconfiguration.');
			process.exit(1);
		}
	}
	exec(_sql: string): void {}
	close(): void {}
	prepare(_sql: string) {
		return noopStatement;
	}
	query(_sql: string) {
		return noopStatement;
	}
	transaction(fn: (...args: unknown[]) => unknown) {
		return fn;
	}
}
