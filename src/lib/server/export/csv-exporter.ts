import type { DatabaseDriver } from '$lib/server/drivers/types';
import type { ColumnInfo } from '$lib/server/drivers/types';

export interface CsvExportOptions {
	/** String to use for NULL values. Default: empty string */
	nullValue?: string;
	/** Include header row. Default: true */
	includeHeader?: boolean;
	/** Page size for cursor-based pagination. Default: 1000 */
	pageSize?: number;
}

/**
 * RFC 4180-compliant CSV exporter.
 * Streams rows page-by-page using cursor-based pagination (ORDER BY rowid / PK).
 */
export async function* streamCsvExport(
	driver: DatabaseDriver,
	tableName: string,
	options: CsvExportOptions = {}
): AsyncGenerator<string> {
	const nullValue = options.nullValue ?? '';
	const includeHeader = options.includeHeader !== false;
	const pageSize = options.pageSize ?? 1000;

	// Get column names from schema
	const schema = await driver.getTableSchema(tableName);
	const columns = schema.columns;
	const columnNames = columns.map((c) => c.name);

	if (includeHeader) {
		yield formatCsvRow(columnNames) + '\r\n';
	}

	// Find primary key column for cursor-based pagination
	const pkCol = findPkColumn(columns);
	let lastPkValue: unknown = null;
	let isFirst = true;

	while (true) {
		let sql: string;
		let params: unknown[];

		if (pkCol) {
			if (isFirst) {
				sql = `SELECT * FROM ${quoteTable(tableName)} ORDER BY ${quoteCol(pkCol)} ASC LIMIT ${pageSize}`;
				params = [];
			} else {
				sql = `SELECT * FROM ${quoteTable(tableName)} WHERE ${quoteCol(pkCol)} > ? ORDER BY ${quoteCol(pkCol)} ASC LIMIT ${pageSize}`;
				params = [lastPkValue];
			}
		} else {
			// No PK: fall back to OFFSET-based (best effort)
			const offset = isFirst ? 0 : (lastPkValue as number);
			sql = `SELECT * FROM ${quoteTable(tableName)} LIMIT ${pageSize} OFFSET ${offset}`;
			params = [];
		}

		const result = await driver.execute(sql, params);

		if (result.rows.length === 0) break;

		for (const row of result.rows) {
			const values = columnNames.map((col) => {
				const val = row[col];
				return val === null || val === undefined ? nullValue : String(val);
			});
			yield formatCsvRow(values) + '\r\n';
		}

		if (result.rows.length < pageSize) break;

		if (pkCol) {
			lastPkValue = result.rows[result.rows.length - 1][pkCol];
		} else {
			lastPkValue = ((lastPkValue as number) || 0) + result.rows.length;
		}
		isFirst = false;
	}
}

/** RFC 4180: escape a single field */
export function formatCsvField(value: string): string {
	// Fields containing commas, double-quotes, or newlines must be quoted
	if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
		return '"' + value.replace(/"/g, '""') + '"';
	}
	return value;
}

/** Format an array of string values as a CSV row */
export function formatCsvRow(values: string[]): string {
	return values.map(formatCsvField).join(',');
}

function findPkColumn(columns: ColumnInfo[]): string | null {
	const pk = columns.find((c) => c.isPrimaryKey);
	return pk ? pk.name : null;
}

function quoteTable(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}

function quoteCol(name: string): string {
	return `"${name.replace(/"/g, '""')}"`;
}
