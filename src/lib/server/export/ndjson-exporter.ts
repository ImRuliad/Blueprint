import type { DatabaseDriver } from '$lib/server/drivers/types';

export interface NdjsonExportOptions {
	/** Page size for cursor-based pagination. Default: 1000 */
	pageSize?: number;
}

/**
 * NDJSON (Newline Delimited JSON) exporter for MongoDB compatibility.
 * Emits one JSON document per line.
 * Streams rows page-by-page using cursor-based pagination.
 */
export async function* streamNdjsonExport(
	driver: DatabaseDriver,
	tableName: string,
	options: NdjsonExportOptions = {}
): AsyncGenerator<string> {
	const pageSize = options.pageSize ?? 1000;

	const schema = await driver.getTableSchema(tableName);
	const columns = schema.columns;
	const pkCol = columns.find((c) => c.isPrimaryKey)?.name ?? null;

	const quotedTable = `"${tableName.replace(/"/g, '""')}"`;
	let lastPkValue: unknown = null;
	let isFirst = true;

	while (true) {
		let sql: string;
		let params: unknown[];

		if (pkCol) {
			const quotedPk = `"${pkCol.replace(/"/g, '""')}"`;
			if (isFirst) {
				sql = `SELECT * FROM ${quotedTable} ORDER BY ${quotedPk} ASC LIMIT ${pageSize}`;
				params = [];
			} else {
				sql = `SELECT * FROM ${quotedTable} WHERE ${quotedPk} > ? ORDER BY ${quotedPk} ASC LIMIT ${pageSize}`;
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
			yield JSON.stringify(row) + '\n';
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
