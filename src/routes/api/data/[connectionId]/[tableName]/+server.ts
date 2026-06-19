import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPool } from '$lib/server/drivers/pool';
import { quoteIdentifier } from '$lib/server/drivers/quote';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

const MAX_LIMIT = 10000;
const DEFAULT_LIMIT = 100;

export interface DataPageResult {
	columns: Array<{ name: string; dataType: string; nullable: boolean; isPrimaryKey: boolean }>;
	rows: Record<string, unknown>[];
	rowsAffected: number;
	hasMore: boolean;
	nextCursor: string | null;
}

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const driver = getPool(params.connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for "${params.connectionId}"`);
		}

		// Parse query params
		const limitRaw = url.searchParams.get('limit');
		const limit = Math.min(
			limitRaw != null ? parseInt(limitRaw, 10) : DEFAULT_LIMIT,
			MAX_LIMIT
		);
		if (isNaN(limit) || limit < 1) {
			throw new ValidationError('limit must be a positive integer');
		}

		const cursor = url.searchParams.get('cursor') ?? null;
		const sortColumn = url.searchParams.get('sortColumn') ?? null;
		const sortDir = (url.searchParams.get('sortDir') ?? 'ASC').toUpperCase();
		if (sortDir !== 'ASC' && sortDir !== 'DESC') {
			throw new ValidationError('sortDir must be ASC or DESC');
		}

		const filtersRaw = url.searchParams.get('filters');
		let filters: Array<{ column: string; operator: string; value: string }> = [];
		if (filtersRaw) {
			try {
				filters = JSON.parse(filtersRaw);
			} catch {
				throw new ValidationError('filters must be valid JSON');
			}
		}

		const engine = driver.engine;
		const tableName = params.tableName;

		// Fetch schema to determine primary key for keyset pagination
		const schema = await driver.getTableSchema(tableName);
		const pkColumn = schema.columns.find((c) => c.isPrimaryKey)?.name ?? null;

		// Build parameterized SELECT query
		const quotedTable = quoteIdentifier(tableName, engine);
		const queryParams: unknown[] = [];

		// WHERE clause
		const whereClauses: string[] = [];

		// Keyset pagination: cursor is the last seen PK value
		if (cursor !== null && pkColumn !== null) {
			queryParams.push(cursor);
			const quotedPk = quoteIdentifier(pkColumn, engine);
			const ph = engine === 'postgresql' ? `$${queryParams.length}` : '?';
			whereClauses.push(`${quotedPk} > ${ph}`);
		}

		// Filters
		const VALID_OPERATORS: Record<string, string> = {
			'=': '=',
			'!=': '!=',
			'>': '>',
			'>=': '>=',
			'<': '<',
			'<=': '<=',
			'LIKE': 'LIKE',
			'NOT LIKE': 'NOT LIKE',
			'IS NULL': 'IS NULL',
			'IS NOT NULL': 'IS NOT NULL',
		};

		for (const filter of filters) {
			const op = VALID_OPERATORS[filter.operator.toUpperCase()];
			if (!op) {
				throw new ValidationError(`Invalid filter operator: ${filter.operator}`);
			}
			const quotedCol = quoteIdentifier(filter.column, engine);
			if (op === 'IS NULL' || op === 'IS NOT NULL') {
				whereClauses.push(`${quotedCol} ${op}`);
			} else {
				queryParams.push(filter.value);
				const ph = engine === 'postgresql' ? `$${queryParams.length}` : '?';
				whereClauses.push(`${quotedCol} ${op} ${ph}`);
			}
		}

		const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

		// ORDER BY
		let orderClause = '';
		if (sortColumn) {
			const quotedSort = quoteIdentifier(sortColumn, engine);
			orderClause = `ORDER BY ${quotedSort} ${sortDir}`;
		} else if (pkColumn) {
			orderClause = `ORDER BY ${quoteIdentifier(pkColumn, engine)} ASC`;
		}

		// Fetch limit+1 to detect hasMore
		const fetchLimit = limit + 1;
		const limitClause =
			engine === 'mysql'
				? `LIMIT ${fetchLimit}`
				: engine === 'postgresql'
					? `LIMIT ${fetchLimit}`
					: `LIMIT ${fetchLimit}`;

		const sql = [
			`SELECT * FROM ${quotedTable}`,
			whereClause,
			orderClause,
			limitClause,
		]
			.filter(Boolean)
			.join(' ');

		const result = await driver.execute(sql, queryParams);

		const hasMore = result.rows.length > limit;
		const rows = hasMore ? result.rows.slice(0, limit) : result.rows;

		// Compute next cursor from last row's PK value
		let nextCursor: string | null = null;
		if (hasMore && pkColumn !== null && rows.length > 0) {
			const lastRow = rows[rows.length - 1];
			const pkVal = lastRow[pkColumn];
			nextCursor = pkVal != null ? String(pkVal) : null;
		}

		const data: DataPageResult = {
			columns: result.columns,
			rows,
			rowsAffected: result.rowsAffected,
			hasMore,
			nextCursor,
		};

		return json({ data });
	} catch (err) {
		return errorResponse(err);
	}
};
