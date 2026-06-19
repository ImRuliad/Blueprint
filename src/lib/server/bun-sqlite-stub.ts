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
	constructor(_path?: string) {}
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
