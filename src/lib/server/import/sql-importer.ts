import type { DatabaseDriver } from '$lib/server/drivers/types';
import { QueryError } from '$lib/server/errors';

export interface ImportProgress {
	total: number;
	executed: number;
	failed: number;
	errors: Array<{ statement: string; message: string }>;
}

export interface SqlImportOptions {
	/** Stop on first error. Default: false — collect all errors */
	stopOnError?: boolean;
}

export interface SqlImportResult {
	ok: boolean;
	total: number;
	executed: number;
	failed: number;
	errors: Array<{ statement: string; message: string }>;
}

/**
 * Split a SQL script into individual statements.
 * Handles single-line comments (--), block comments (/* ... *\/),
 * single-quoted string literals, and semicolon delimiters.
 */
export function splitSqlStatements(sql: string): string[] {
	const statements: string[] = [];
	let current = '';
	let i = 0;
	const len = sql.length;

	while (i < len) {
		const ch = sql[i];

		// Single-line comment
		if (ch === '-' && sql[i + 1] === '-') {
			const end = sql.indexOf('\n', i);
			if (end === -1) {
				current += sql.slice(i);
				i = len;
			} else {
				current += sql.slice(i, end + 1);
				i = end + 1;
			}
			continue;
		}

		// Block comment
		if (ch === '/' && sql[i + 1] === '*') {
			const end = sql.indexOf('*/', i + 2);
			if (end === -1) {
				// Unterminated block comment — consume to end
				current += sql.slice(i);
				i = len;
			} else {
				current += sql.slice(i, end + 2);
				i = end + 2;
			}
			continue;
		}

		// Single-quoted string literal
		if (ch === "'") {
			let j = i + 1;
			while (j < len) {
				if (sql[j] === "'" && sql[j + 1] === "'") {
					// Escaped quote
					j += 2;
				} else if (sql[j] === "'") {
					j++;
					break;
				} else {
					j++;
				}
			}
			current += sql.slice(i, j);
			i = j;
			continue;
		}

		// Statement delimiter
		if (ch === ';') {
			const stmt = current.trim();
			if (stmt.length > 0) {
				statements.push(stmt);
			}
			current = '';
			i++;
			continue;
		}

		current += ch;
		i++;
	}

	// Trailing statement without semicolon
	const trailing = current.trim();
	if (trailing.length > 0) {
		statements.push(trailing);
	}

	return statements;
}

/**
 * Execute a SQL script inside a single transaction.
 * Returns a result object with per-statement error detail.
 * Calls onProgress after each statement if provided.
 */
export async function importSql(
	driver: DatabaseDriver,
	sql: string,
	options: SqlImportOptions = {},
	onProgress?: (progress: ImportProgress) => void
): Promise<SqlImportResult> {
	const statements = splitSqlStatements(sql);
	const errors: Array<{ statement: string; message: string }> = [];
	let executed = 0;

	const progress = (): ImportProgress => ({
		total: statements.length,
		executed,
		failed: errors.length,
		errors,
	});

	await driver.beginTransaction();

	try {
		for (const stmt of statements) {
			try {
				await driver.executeRaw(stmt);
				executed++;
				onProgress?.(progress());
			} catch (err) {
				const message = err instanceof Error ? err.message : String(err);
				errors.push({ statement: stmt.slice(0, 200), message });

				if (options.stopOnError) {
					await driver.rollbackTransaction();
					return {
						ok: false,
						total: statements.length,
						executed,
						failed: errors.length,
						errors,
					};
				}

				onProgress?.(progress());
			}
		}

		if (errors.length > 0) {
			await driver.rollbackTransaction();
			return {
				ok: false,
				total: statements.length,
				executed,
				failed: errors.length,
				errors,
			};
		}

		await driver.commitTransaction();
		return {
			ok: true,
			total: statements.length,
			executed,
			failed: 0,
			errors: [],
		};
	} catch (err) {
		await driver.rollbackTransaction();
		throw new QueryError(
			`Import transaction failed: ${err instanceof Error ? err.message : String(err)}`
		);
	}
}
