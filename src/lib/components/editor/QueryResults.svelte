<script lang="ts">
	import type { ColumnDescriptor } from '$lib/server/drivers/types';

	interface Props {
		columns?: ColumnDescriptor[];
		rows?: Record<string, unknown>[];
		rowsAffected?: number;
		durationMs?: number;
		error?: string | null;
		loading?: boolean;
	}

	let {
		columns = [],
		rows = [],
		rowsAffected = 0,
		durationMs,
		error = null,
		loading = false,
	}: Props = $props();

	function formatCell(value: unknown): string {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'object') return JSON.stringify(value);
		return String(value);
	}

	function isCellNull(value: unknown): boolean {
		return value === null || value === undefined;
	}
</script>

<div class="results-container">
	{#if loading}
		<div class="results-state">
			<span class="results-state-text">Executing...</span>
		</div>
	{:else if error}
		<div class="results-state results-state--error">
			<span class="results-state-label">Error</span>
			<span class="results-state-message">{error}</span>
		</div>
	{:else if columns.length === 0 && rows.length === 0 && rowsAffected === 0 && durationMs === undefined}
		<div class="results-state">
			<span class="results-state-text">Run a query to see results</span>
		</div>
	{:else if columns.length === 0}
		<div class="results-meta">
			<span class="results-meta-ok">Query OK</span>
			<span class="results-meta-detail">{rowsAffected} row{rowsAffected !== 1 ? 's' : ''} affected</span>
			{#if durationMs !== undefined}
				<span class="results-meta-duration">{durationMs}ms</span>
			{/if}
		</div>
	{:else}
		<div class="results-meta">
			<span class="results-meta-ok">
				{rows.length} row{rows.length !== 1 ? 's' : ''}
			</span>
			{#if durationMs !== undefined}
				<span class="results-meta-duration">{durationMs}ms</span>
			{/if}
		</div>
		<div class="results-table-wrap">
			<table class="results-table">
				<thead>
					<tr>
						<th class="results-th results-th--rownum">#</th>
						{#each columns as col}
							<th class="results-th" title={col.dataType}>{col.name}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i}
						<tr class="results-tr">
							<td class="results-td results-td--rownum">{i + 1}</td>
							{#each columns as col}
								<td class="results-td {isCellNull(row[col.name]) ? 'results-td--null' : ''}">
									{formatCell(row[col.name])}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.results-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		background: var(--bg-primary);
	}

	.results-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 6px;
	}

	.results-state--error {
		align-items: flex-start;
		justify-content: flex-start;
		padding: 12px 16px;
	}

	.results-state-text {
		font-size: 12px;
		color: var(--text-muted);
	}

	.results-state-label {
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-red);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.results-state-message {
		font-size: 12px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: var(--accent-red);
		white-space: pre-wrap;
		word-break: break-word;
	}

	.results-meta {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px;
		border-bottom: 1px solid var(--border-default);
		font-size: 11px;
		flex-shrink: 0;
	}

	.results-meta-ok {
		color: var(--accent-green);
		font-weight: 500;
	}

	.results-meta-detail {
		color: var(--text-secondary);
	}

	.results-meta-duration {
		color: var(--text-muted);
		margin-left: auto;
	}

	.results-table-wrap {
		overflow: auto;
		flex: 1;
	}

	.results-table {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-size: 12px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
	}

	.results-th {
		position: sticky;
		top: 0;
		padding: 0 12px;
		height: 28px;
		text-align: left;
		font-weight: 500;
		font-size: 11px;
		color: var(--text-secondary);
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-default);
		white-space: nowrap;
		z-index: 1;
	}

	.results-th--rownum {
		color: var(--text-muted);
		min-width: 40px;
		text-align: right;
		padding-right: 8px;
	}

	.results-tr:hover {
		background: var(--bg-hover);
	}

	.results-td {
		padding: 0 12px;
		height: 24px;
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.04));
		white-space: nowrap;
		color: var(--text-primary);
		max-width: 400px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.results-td--rownum {
		color: var(--text-muted);
		text-align: right;
		padding-right: 8px;
		user-select: none;
	}

	.results-td--null {
		color: var(--text-muted);
		font-style: italic;
	}
</style>
