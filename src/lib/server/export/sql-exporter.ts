import type { DatabaseDriver, ColumnInfo } from '$lib/server/drivers/types';
import { quoteIdentifier } from '$lib/server/drivers/quote';

export interface SqlExportOptions {
	/** Emit a CREATE TABLE statement before INSERTs. Default: true */
	includeDdl?: boolean;
	/** Emit DROP TABLE IF EXISTS before CREATE TABLE. Default: false */
	dropIfExists?: boolean;
	/** Page size for cursor-based pagination. Default: 500 */
	pageSize?: number;
	/** Rows per INSERT statement (multi-row VALUES). Default: 50 */
	batchSize?: number;
}

/**
 * SQL INSERT exporter with optional CREATE TABLE DDL.
 * Streams rows page-by-page using cursor-based pagination.
 */
export async function* streamSqlExport(
	driver: DatabaseDriver,
	tableName: string,
	options: SqlExportOptions = {}
): AsyncGenerator<string> {
	const includeDdl = options.includeDdl !== false;
	const dropIfExists = options.dropIfExists === true;
	const pageSize = options.pageSize ?? 500;
	const batchSize = Math.min(options.batchSize ?? 50, pageSize);
	const engine = driver.engine;

	const schema = await driver.getTableSchema(tableName);
	const columns = schema.columns;
	const columnNames = columns.map((c) => c.name);
	const quotedTable = quoteIdentifier(tableName, engine);

	if (includeDdl) {
		if (dropIfExists) {
			yield `DROP TABLE IF EXISTS ${quotedTable};\n`;
		}
		yield buildCreateTable(tableName, columns, engine) + '\n\n';
	}

	const quotedCols = columnNames.map((n) => quoteIdentifier(n, engine)).join(', ');

	// Cursor-based pagination
	const pkCol = findPkColumn(columns);
	let lastPkValue: unknown = null;
	let isFirst = true;
	let buffer: string[] = [];

	const flushBuffer = function* (): Generator<string> {
		if (buffer.length === 0) return;
		yield `INSERT INTO ${quotedTable} (${quotedCols}) VALUES\n`;
		yield buffer.join(',\n') + ';\n';
		buffer = [];
	};

	while (true) {
		let sql: string;
		let params: unknown[];

		if (pkCol) {
			const quotedPk = quoteIdentifier(pkCol, engine);
			if (isFirst) {
				sql = `SELECT * FROM ${quotedTable} ORDER BY ${quotedPk} ASC LIMIT ${pageSize}`;
				params = [];
			} else {
				sql = buildGtQuery(quotedTable, quotedPk, pageSize, engine);
				params = [lastPkValue];
			}
		} else {
			const offset = isFirst ? 0 : (lastPkValue as number);
			sql = `SELECT * FROM ${quotedTable} LIMIT ${pageSize} OFFSET ${offset}`;
			params = [];
		}

		const result = await driver.execute(sql, params);
		if (result.rows.length === 0) break;

		for (const row of result.rows) {
			const valueList = columnNames.map((col) => sqlLiteral(row[col])).join(', ');
			buffer.push(`  (${valueList})`);

			if (buffer.length >= batchSize) {
				yield* flushBuffer();
			}
		}

		if (result.rows.length < pageSize) break;

		if (pkCol) {
			lastPkValue = result.rows[result.rows.length - 1][pkCol];
		} else {
			lastPkValue = ((lastPkValue as number) || 0) + result.rows.length;
		}
		isFirst = false;
	}

	yield* flushBuffer();
}

/** Build a CREATE TABLE DDL statement from column descriptors */
export function buildCreateTable(
	tableName: string,
	columns: ColumnInfo[],
	engine: DatabaseDriver['engine']
): string {
	const quotedTable = quoteIdentifier(tableName, engine);
	const colDefs = columns.map((c) => {
		const quotedName = quoteIdentifier(c.name, engine);
		let def = `  ${quotedName} ${c.dataType}`;
		if (!c.nullable) def += ' NOT NULL';
		if (c.defaultValue !== null) def += ` DEFAULT ${c.defaultValue}`;
		return def;
	});

	const pks = columns.filter((c) => c.isPrimaryKey).map((c) => quoteIdentifier(c.name, engine));
	if (pks.length > 0) {
		colDefs.push(`  PRIMARY KEY (${pks.join(', ')})`);
	}

	return `CREATE TABLE ${quotedTable} (\n${colDefs.join(',\n')}\n);`;
}

/** Produce a SQL literal for a JavaScript value */
export function sqlLiteral(value: unknown): string {
	if (value === null || value === undefined) return 'NULL';
	if (typeof value === 'boolean') return value ? '1' : '0';
	if (typeof value === 'number') return String(value);
	if (value instanceof Date) return `'${value.toISOString().replace('T', ' ').replace('Z', '')}'`;
	// Escape single quotes in strings
	const str = String(value).replace(/'/g, "''");
	return `'${str}'`;
}

function findPkColumn(columns: ColumnInfo[]): string | null {
	const pk = columns.find((c) => c.isPrimaryKey);
	return pk ? pk.name : null;
}

function buildGtQuery(
	quotedTable: string,
	quotedPk: string,
	pageSize: number,
	engine: DatabaseDriver['engine']
): string {
	// All supported engines use ? or $1 style — use ? for broad compatibility
	// (PostgreSQL uses $1 but driver.execute accepts ? for positional params in some adapters)
	// We use a simple approach: pass params array and let driver handle binding.
	// For portability we build raw SQL with placeholders the driver accepts.
	if (engine === 'postgresql') {
		return `SELECT * FROM ${quotedTable} WHERE ${quotedPk} > $1 ORDER BY ${quotedPk} ASC LIMIT ${pageSize}`;
	}
	return `SELECT * FROM ${quotedTable} WHERE ${quotedPk} > ? ORDER BY ${quotedPk} ASC LIMIT ${pageSize}`;
}
