import { writable, get } from 'svelte/store';
import type { ColumnDescriptor } from '$lib/server/drivers/types';

export type SortDir = 'ASC' | 'DESC';

export interface GridFilter {
	column: string;
	operator: string;
	value: string;
}

export interface GridState {
	connectionId: string | null;
	tableName: string | null;
	columns: ColumnDescriptor[];
	rows: Record<string, unknown>[];
	rowsAffected: number;
	sortColumn: string | null;
	sortDir: SortDir;
	filters: GridFilter[];
	cursor: string | null;
	hasMore: boolean;
	loading: boolean;
	error: string | null;
}

const initialState: GridState = {
	connectionId: null,
	tableName: null,
	columns: [],
	rows: [],
	rowsAffected: 0,
	sortColumn: null,
	sortDir: 'ASC',
	filters: [],
	cursor: null,
	hasMore: false,
	loading: false,
	error: null,
};

export const gridState = writable<GridState>({ ...initialState });

export function resetGrid(): void {
	gridState.set({ ...initialState });
}

export interface FetchOptions {
	limit?: number;
	cursor?: string | null;
	sortColumn?: string | null;
	sortDir?: SortDir;
	filters?: GridFilter[];
	append?: boolean;
}

export async function fetchTableData(
	connectionId: string,
	tableName: string,
	options: FetchOptions = {}
): Promise<void> {
	const {
		limit = 100,
		cursor = null,
		sortColumn = null,
		sortDir = 'ASC',
		filters = [],
		append = false,
	} = options;

	gridState.update((s) => ({
		...s,
		loading: true,
		error: null,
		connectionId,
		tableName,
		sortColumn,
		sortDir,
		filters,
	}));

	try {
		const params = new URLSearchParams();
		params.set('limit', String(limit));
		if (cursor) params.set('cursor', cursor);
		if (sortColumn) params.set('sortColumn', sortColumn);
		params.set('sortDir', sortDir);
		if (filters.length > 0) params.set('filters', JSON.stringify(filters));

		const res = await fetch(
			`/api/data/${encodeURIComponent(connectionId)}/${encodeURIComponent(tableName)}?${params}`
		);

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			throw new Error(body?.error?.message ?? `Failed to fetch data for ${tableName}`);
		}

		const body = await res.json();
		const { columns, rows, rowsAffected, hasMore, nextCursor } = body.data;

		gridState.update((s) => ({
			...s,
			columns,
			rows: append ? [...s.rows, ...rows] : rows,
			rowsAffected,
			hasMore,
			cursor: nextCursor,
			loading: false,
		}));
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		gridState.update((s) => ({ ...s, loading: false, error: message }));
	}
}

export function setSort(column: string): void {
	const state = get(gridState);
	let dir: SortDir = 'ASC';
	if (state.sortColumn === column && state.sortDir === 'ASC') {
		dir = 'DESC';
	}
	if (state.connectionId && state.tableName) {
		fetchTableData(state.connectionId, state.tableName, {
			sortColumn: column,
			sortDir: dir,
			filters: state.filters,
		});
	}
}

export function addFilter(filter: GridFilter): void {
	const state = get(gridState);
	const newFilters = [...state.filters, filter];
	if (state.connectionId && state.tableName) {
		fetchTableData(state.connectionId, state.tableName, {
			sortColumn: state.sortColumn,
			sortDir: state.sortDir,
			filters: newFilters,
		});
	}
}

export function removeFilter(index: number): void {
	const state = get(gridState);
	const newFilters = state.filters.filter((_, i) => i !== index);
	if (state.connectionId && state.tableName) {
		fetchTableData(state.connectionId, state.tableName, {
			sortColumn: state.sortColumn,
			sortDir: state.sortDir,
			filters: newFilters,
		});
	}
}

export function loadMore(): void {
	const state = get(gridState);
	if (!state.hasMore || state.loading || !state.connectionId || !state.tableName) return;
	fetchTableData(state.connectionId, state.tableName, {
		cursor: state.cursor,
		sortColumn: state.sortColumn,
		sortDir: state.sortDir,
		filters: state.filters,
		append: true,
	});
}
