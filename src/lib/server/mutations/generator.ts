import type { EngineType } from '$lib/server/drivers/types';
import { quoteIdentifier } from '$lib/server/drivers/quote';

export interface MutationChange {
	operation: 'insert' | 'update' | 'delete';
	tableName: string;
	pk: Record<string, unknown>;
	column?: string;
	newValue?: unknown;
	row?: Record<string, unknown>;
}

export interface GeneratedSQL {
	sql: string;
	params: unknown[];
}

export function generateSQL(change: MutationChange, engine: EngineType): GeneratedSQL {
	switch (change.operation) {
		case 'insert':
			return generateInsert(change, engine);
		case 'update':
			return generateUpdate(change, engine);
		case 'delete':
			return generateDelete(change, engine);
	}
}

function placeholder(engine: EngineType, index: number): string {
	return engine === 'postgresql' ? `$${index}` : '?';
}

function generateInsert(change: MutationChange, engine: EngineType): GeneratedSQL {
	const row = change.row ?? {};
	const columns = Object.keys(row);
	if (columns.length === 0) {
		throw new Error('Insert requires at least one column');
	}

	const params: unknown[] = [];
	const quotedCols = columns.map((c) => quoteIdentifier(c, engine));
	const placeholders = columns.map((_, i) => {
		params.push(row[columns[i]]);
		return placeholder(engine, i + 1);
	});

	const quotedTable = quoteIdentifier(change.tableName, engine);
	const sql = `INSERT INTO ${quotedTable} (${quotedCols.join(', ')}) VALUES (${placeholders.join(', ')})`;

	return { sql, params };
}

function generateUpdate(change: MutationChange, engine: EngineType): GeneratedSQL {
	if (!change.column) {
		throw new Error('Update requires a column name');
	}

	const params: unknown[] = [];
	const quotedTable = quoteIdentifier(change.tableName, engine);
	const quotedCol = quoteIdentifier(change.column, engine);

	params.push(change.newValue);
	const setClause = `${quotedCol} = ${placeholder(engine, 1)}`;

	const pkKeys = Object.keys(change.pk);
	if (pkKeys.length === 0) {
		throw new Error('Update requires at least one primary key column');
	}

	const whereParts = pkKeys.map((k) => {
		params.push(change.pk[k]);
		const idx = params.length;
		return `${quoteIdentifier(k, engine)} = ${placeholder(engine, idx)}`;
	});

	const sql = `UPDATE ${quotedTable} SET ${setClause} WHERE ${whereParts.join(' AND ')}`;

	return { sql, params };
}

function generateDelete(change: MutationChange, engine: EngineType): GeneratedSQL {
	const params: unknown[] = [];
	const quotedTable = quoteIdentifier(change.tableName, engine);

	const pkKeys = Object.keys(change.pk);
	if (pkKeys.length === 0) {
		throw new Error('Delete requires at least one primary key column');
	}

	const whereParts = pkKeys.map((k) => {
		params.push(change.pk[k]);
		const idx = params.length;
		return `${quoteIdentifier(k, engine)} = ${placeholder(engine, idx)}`;
	});

	const sql = `DELETE FROM ${quotedTable} WHERE ${whereParts.join(' AND ')}`;

	return { sql, params };
}
