<script lang="ts">
	import DataGrid from '$lib/components/grid/DataGrid.svelte';
	import SchemaInspector from '$lib/components/schema/SchemaInspector.svelte';
	import type { ColumnDescriptor, TableSchema } from '$lib/server/drivers/types';

	interface Props {
		connectionId: string;
	}

	let { connectionId }: Props = $props();

	type View = 'data' | 'schema';

	let tables = $state<string[]>([]);
	let views = $state<string[]>([]);
	let selectedTable = $state<string | null>(null);
	let activeView = $state<View>('data');
	let loadingTables = $state(true);

	// Data state
	let columns = $state<ColumnDescriptor[]>([]);
	let rows = $state<Record<string, unknown>[]>([]);
	let loadingData = $state(false);
	let sortColumn = $state<string | null>(null);
	let sortDir = $state<'ASC' | 'DESC'>('ASC');

	// Schema state
	let schema = $state<TableSchema | null>(null);
	let loadingSchema = $state(false);

	$effect(() => {
		fetchTables();
	});

	async function fetchTables() {
		loadingTables = true;
		try {
			const res = await fetch(`/api/schema/${connectionId}/tables`);
			if (res.ok) {
				const data = await res.json();
				tables = data.data.tables.map((t: { name: string }) => t.name);
				views = data.data.views?.map((v: { name: string }) => v.name) ?? [];
			}
		} finally {
			loadingTables = false;
		}
	}

	async function selectTable(name: string) {
		selectedTable = name;
		sortColumn = null;
		sortDir = 'ASC';
		activeView = 'data';
		await fetchData(name);
	}

	async function fetchData(tableName: string, sort?: string, dir?: 'ASC' | 'DESC') {
		loadingData = true;
		try {
			const params = new URLSearchParams({ limit: '200' });
			if (sort) {
				params.set('sortColumn', sort);
				params.set('sortDir', dir ?? 'ASC');
			}
			const res = await fetch(`/api/data/${connectionId}/${tableName}?${params}`);
			if (res.ok) {
				const data = await res.json();
				columns = data.data.columns;
				rows = data.data.rows;
			}
		} finally {
			loadingData = false;
		}
	}

	async function fetchSchema(tableName: string) {
		loadingSchema = true;
		try {
			const res = await fetch(`/api/schema/${connectionId}/tables/${tableName}`);
			if (res.ok) {
				const data = await res.json();
				schema = data.data;
			}
		} finally {
			loadingSchema = false;
		}
	}

	function handleSort(col: string) {
		if (sortColumn === col) {
			sortDir = sortDir === 'ASC' ? 'DESC' : 'ASC';
		} else {
			sortColumn = col;
			sortDir = 'ASC';
		}
		if (selectedTable) fetchData(selectedTable, sortColumn, sortDir);
	}

	function handleViewSwitch(view: View) {
		activeView = view;
		if (view === 'schema' && selectedTable && !schema) {
			fetchSchema(selectedTable);
		}
	}

	$effect(() => {
		if (activeView === 'schema' && selectedTable) {
			fetchSchema(selectedTable);
		}
	});
</script>

<div class="browser">
	<div class="browser-sidebar">
		<div class="browser-sidebar-header">
			<span class="text-section-label">Tables</span>
			<span class="table-count">{tables.length}</span>
		</div>
		<div class="browser-table-list">
			{#if loadingTables}
				<div class="browser-empty">Loading...</div>
			{:else if tables.length === 0 && views.length === 0}
				<div class="browser-empty">No tables found</div>
			{:else}
				{#each tables as table}
					<button
						class="table-item"
						class:table-item--active={selectedTable === table}
						onclick={() => selectTable(table)}
					>
						<span class="table-icon">T</span>
						<span class="table-name">{table}</span>
					</button>
				{/each}
				{#if views.length > 0}
					<div class="browser-sidebar-header" style="margin-top: 8px;">
						<span class="text-section-label">Views</span>
						<span class="table-count">{views.length}</span>
					</div>
					{#each views as view}
						<button
							class="table-item"
							class:table-item--active={selectedTable === view}
							onclick={() => selectTable(view)}
						>
							<span class="table-icon view-icon">V</span>
							<span class="table-name">{view}</span>
						</button>
					{/each}
				{/if}
			{/if}
		</div>
	</div>

	<div class="browser-main">
		{#if !selectedTable}
			<div class="browser-placeholder">
				<p class="browser-placeholder-text">Select a table to browse data</p>
			</div>
		{:else}
			<div class="browser-toolbar">
				<span class="browser-table-title">{selectedTable}</span>
				<div class="browser-view-tabs">
					<button
						class="view-tab"
						class:view-tab--active={activeView === 'data'}
						onclick={() => handleViewSwitch('data')}
					>Data</button>
					<button
						class="view-tab"
						class:view-tab--active={activeView === 'schema'}
						onclick={() => handleViewSwitch('schema')}
					>Schema</button>
				</div>
				{#if activeView === 'data'}
					<span class="row-count">{rows.length} rows</span>
				{/if}
			</div>

			<div class="browser-content">
				{#if activeView === 'data'}
					<DataGrid
						{columns}
						{rows}
						{sortColumn}
						{sortDir}
						loading={loadingData}
						onSort={handleSort}
					/>
				{:else}
					<SchemaInspector
						{connectionId}
						tableName={selectedTable}
						{schema}
						loading={loadingSchema}
					/>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.browser {
		display: grid;
		grid-template-columns: 200px 1fr;
		height: 100%;
		overflow: hidden;
	}

	.browser-sidebar {
		border-right: 1px solid var(--border, #27272a);
		overflow-y: auto;
		background: var(--bg-surface, #0a0a0c);
	}

	.browser-sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 10px 4px;
	}

	.table-count {
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		color: var(--text-ghost, #3f3f46);
	}

	.browser-table-list {
		padding: 0 4px 8px;
	}

	.browser-empty {
		padding: 12px 10px;
		font-size: 11px;
		color: var(--text-ghost, #3f3f46);
	}

	.table-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 3px 8px;
		border: none;
		background: transparent;
		border-radius: 3px;
		cursor: pointer;
		text-align: left;
		font-size: 12px;
		color: var(--text-secondary, #a1a1aa);
	}

	.table-item:hover {
		background: var(--bg-hover, #27272a);
	}

	.table-item--active {
		background: var(--bg-active, #27272a);
		color: var(--text-primary, #fafafa);
	}

	.table-icon {
		font-family: 'Geist Mono', monospace;
		font-size: 9px;
		font-weight: 600;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 2px;
		background: rgba(96, 165, 250, 0.1);
		color: var(--accent-blue, #60a5fa);
		flex-shrink: 0;
	}

	.view-icon {
		background: rgba(167, 139, 250, 0.1);
		color: var(--accent-purple, #a78bfa);
	}

	.table-name {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.browser-main {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.browser-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.browser-placeholder-text {
		font-size: 13px;
		color: var(--text-ghost, #3f3f46);
		margin: 0;
	}

	.browser-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 10px;
		border-bottom: 1px solid var(--border, #27272a);
		background: var(--bg-surface, #0a0a0c);
		flex-shrink: 0;
		height: 32px;
	}

	.browser-table-title {
		font-family: 'Geist Mono', monospace;
		font-size: 12px;
		font-weight: 500;
		color: var(--text-primary, #fafafa);
	}

	.browser-view-tabs {
		display: flex;
		gap: 2px;
	}

	.view-tab {
		font-size: 11px;
		padding: 2px 8px;
		border: none;
		border-radius: 3px;
		background: transparent;
		color: var(--text-muted, #71717a);
		cursor: pointer;
	}

	.view-tab:hover {
		color: var(--text-secondary, #a1a1aa);
	}

	.view-tab--active {
		background: var(--bg-hover, #27272a);
		color: var(--text-primary, #fafafa);
	}

	.row-count {
		margin-left: auto;
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		color: var(--text-ghost, #3f3f46);
	}

	.browser-content {
		flex: 1;
		overflow: auto;
	}
</style>
