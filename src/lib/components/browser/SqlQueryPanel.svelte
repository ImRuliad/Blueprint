<script lang="ts">
	import SqlEditor from '$lib/components/editor/SqlEditor.svelte';
	import DataGrid from '$lib/components/grid/DataGrid.svelte';
	import type { ColumnDescriptor } from '$lib/server/drivers/types';

	interface Props {
		connectionId: string;
	}

	let { connectionId }: Props = $props();

	let sql = $state('');
	let columns = $state<ColumnDescriptor[]>([]);
	let rows = $state<Record<string, unknown>[]>([]);
	let error = $state<string | null>(null);
	let loading = $state(false);
	let durationMs = $state<number | null>(null);

	async function execute(query: string) {
		if (!query.trim()) return;
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/query', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ connectionId, sql: query }),
			});
			const data = await res.json();
			if (res.ok) {
				columns = data.data.columns;
				rows = data.data.rows;
				durationMs = data.data.durationMs;
			} else {
				error = data.error?.message ?? 'Query failed';
				columns = [];
				rows = [];
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Query failed';
		} finally {
			loading = false;
		}
	}
</script>

<div class="query-panel">
	<div class="editor-pane">
		<SqlEditor bind:value={sql} onExecute={execute} />
	</div>

	<div class="results-toolbar">
		<span class="results-label">Results</span>
		{#if durationMs !== null}
			<span class="results-meta">{rows.length} rows in {durationMs}ms</span>
		{/if}
		{#if loading}
			<span class="results-meta">Running...</span>
		{/if}
	</div>

	<div class="results-pane">
		{#if error}
			<div class="results-error">{error}</div>
		{:else if columns.length > 0}
			<DataGrid {columns} {rows} loading={loading} />
		{:else}
			<div class="results-empty">
				<p>Press <kbd>{typeof navigator !== 'undefined' && /Mac/.test(navigator.userAgent) ? '⌘' : 'Ctrl'}+Enter</kbd> to run query</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.query-panel {
		display: grid;
		grid-template-rows: 1fr auto 1fr;
		height: 100%;
		overflow: hidden;
	}

	.editor-pane {
		overflow: auto;
		border-bottom: 1px solid var(--border, #27272a);
		min-height: 80px;
	}

	.results-toolbar {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 4px 10px;
		border-bottom: 1px solid var(--border, #27272a);
		background: var(--bg-surface, #0a0a0c);
		height: 28px;
		flex-shrink: 0;
	}

	.results-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted, #71717a);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.results-meta {
		font-family: 'Geist Mono', monospace;
		font-size: 10px;
		color: var(--text-ghost, #3f3f46);
	}

	.results-pane {
		overflow: auto;
	}

	.results-error {
		padding: 12px;
		font-size: 12px;
		color: var(--accent-red, #ef4444);
		font-family: 'Geist Mono', monospace;
		white-space: pre-wrap;
	}

	.results-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		color: var(--text-ghost, #3f3f46);
		font-size: 12px;
	}

	.results-empty kbd {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		padding: 1px 5px;
		border: 1px solid var(--border, #27272a);
		border-radius: 3px;
		background: var(--bg-elevated, #18181b);
		color: var(--text-secondary, #a1a1aa);
	}
</style>
