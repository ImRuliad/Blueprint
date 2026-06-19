import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import {
	gridState,
	resetGrid,
	fetchTableData,
	setSort,
	addFilter,
	removeFilter,
	loadMore,
} from './grid';

const mockColumns = [
	{ name: 'id', dataType: 'integer', nullable: false, isPrimaryKey: true },
	{ name: 'name', dataType: 'text', nullable: true, isPrimaryKey: false },
];

const mockRows = [
	{ id: 1, name: 'Alice' },
	{ id: 2, name: 'Bob' },
];

function makeFetchResponse(overrides: Record<string, unknown> = {}) {
	return {
		data: {
			columns: mockColumns,
			rows: mockRows,
			rowsAffected: 0,
			hasMore: false,
			nextCursor: null,
			...overrides,
		},
	};
}

describe('gridState', () => {
	beforeEach(() => {
		resetGrid();
		vi.restoreAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('starts with empty/null initial state', () => {
		const state = get(gridState);
		expect(state.connectionId).toBeNull();
		expect(state.tableName).toBeNull();
		expect(state.columns).toEqual([]);
		expect(state.rows).toEqual([]);
		expect(state.loading).toBe(false);
		expect(state.error).toBeNull();
		expect(state.hasMore).toBe(false);
		expect(state.cursor).toBeNull();
	});

	it('fetchTableData sets loading=true during fetch', async () => {
		let capturedLoading = false;

		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
			capturedLoading = get(gridState).loading;
			return new Response(JSON.stringify(makeFetchResponse()), { status: 200 });
		});

		await fetchTableData('conn-1', 'users');

		expect(capturedLoading).toBe(true);
		expect(get(gridState).loading).toBe(false);
		fetchSpy.mockRestore();
	});

	it('fetchTableData populates columns and rows on success', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);

		await fetchTableData('conn-1', 'users');

		const state = get(gridState);
		expect(state.columns).toEqual(mockColumns);
		expect(state.rows).toEqual(mockRows);
		expect(state.connectionId).toBe('conn-1');
		expect(state.tableName).toBe('users');
		expect(state.loading).toBe(false);
		expect(state.error).toBeNull();
	});

	it('fetchTableData sets error on non-ok response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
		);

		await fetchTableData('conn-1', 'missing_table');

		const state = get(gridState);
		expect(state.error).toBe('Not found');
		expect(state.loading).toBe(false);
		expect(state.rows).toEqual([]);
	});

	it('fetchTableData appends rows when append=true', async () => {
		const page1 = makeFetchResponse({ rows: [{ id: 1, name: 'Alice' }], hasMore: true, nextCursor: '1' });
		const page2 = makeFetchResponse({ rows: [{ id: 2, name: 'Bob' }], hasMore: false, nextCursor: null });

		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify(page1), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify(page2), { status: 200 }));

		await fetchTableData('conn-1', 'users');
		await fetchTableData('conn-1', 'users', { cursor: '1', append: true });

		const state = get(gridState);
		expect(state.rows).toHaveLength(2);
		expect(state.rows[0]).toEqual({ id: 1, name: 'Alice' });
		expect(state.rows[1]).toEqual({ id: 2, name: 'Bob' });
	});

	it('fetchTableData tracks hasMore and nextCursor', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify(makeFetchResponse({ hasMore: true, nextCursor: '100' })),
				{ status: 200 }
			)
		);

		await fetchTableData('conn-1', 'users');

		const state = get(gridState);
		expect(state.hasMore).toBe(true);
		expect(state.cursor).toBe('100');
	});

	it('setSort toggles direction when clicking same column', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);

		// Prime state
		await fetchTableData('conn-1', 'users', { sortColumn: 'name', sortDir: 'ASC' });

		// Second click on same column should flip to DESC
		await setSort('name');

		const calls = fetchSpy.mock.calls;
		const lastUrl = String(calls[calls.length - 1][0]);
		expect(lastUrl).toContain('sortDir=DESC');
	});

	it('addFilter re-fetches with updated filters', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);

		await fetchTableData('conn-1', 'users');
		await addFilter({ column: 'name', operator: '=', value: 'Alice' });

		const calls = fetchSpy.mock.calls;
		const lastUrl = String(calls[calls.length - 1][0]);
		expect(lastUrl).toContain('filters=');
		expect(decodeURIComponent(lastUrl)).toContain('"column":"name"');
	});

	it('removeFilter re-fetches without removed filter', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);

		await fetchTableData('conn-1', 'users', {
			filters: [
				{ column: 'name', operator: '=', value: 'Alice' },
				{ column: 'id', operator: '>', value: '5' },
			],
		});

		await removeFilter(0);

		const calls = fetchSpy.mock.calls;
		const lastUrl = decodeURIComponent(String(calls[calls.length - 1][0]));
		expect(lastUrl).not.toContain('"column":"name"');
		expect(lastUrl).toContain('"column":"id"');
	});

	it('loadMore does nothing when hasMore=false', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);

		await fetchTableData('conn-1', 'users'); // hasMore=false by default
		fetchSpy.mockClear();

		loadMore();
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('loadMore fetches next page when hasMore=true', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(
				new Response(
					JSON.stringify(makeFetchResponse({ hasMore: true, nextCursor: '50' })),
					{ status: 200 }
				)
			)
			.mockResolvedValueOnce(
				new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
			);

		await fetchTableData('conn-1', 'users');
		expect(get(gridState).hasMore).toBe(true);

		await loadMore();
		expect(fetchSpy).toHaveBeenCalledTimes(2);
		const lastUrl = String(fetchSpy.mock.calls[1][0]);
		expect(lastUrl).toContain('cursor=50');
	});

	it('resetGrid restores initial state', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(JSON.stringify(makeFetchResponse()), { status: 200 })
		);
		await fetchTableData('conn-1', 'users');

		resetGrid();

		const state = get(gridState);
		expect(state.connectionId).toBeNull();
		expect(state.rows).toEqual([]);
	});
});
