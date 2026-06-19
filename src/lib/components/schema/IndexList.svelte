<script lang="ts">
	import type { IndexInfo } from '$lib/server/drivers/types';

	interface Props {
		indexes: IndexInfo[];
	}

	let { indexes }: Props = $props();
</script>

<div class="index-list">
	<table class="schema-table">
		<thead>
			<tr>
				<th class="col-name">Name</th>
				<th class="col-columns">Columns</th>
				<th class="col-unique">Unique</th>
				<th class="col-type">Type</th>
			</tr>
		</thead>
		<tbody>
			{#each indexes as idx (idx.name)}
				<tr class="schema-row">
					<td class="col-name">
						<span class="index-name">{idx.name}</span>
					</td>
					<td class="col-columns">
						<span class="columns-list">
							{#each idx.columns as col, i}
								<span class="col-chip">{col}</span>{#if i < idx.columns.length - 1}<span class="col-sep">, </span>{/if}
							{/each}
						</span>
					</td>
					<td class="col-unique">
						{#if idx.unique}
							<span class="badge badge-unique">UNIQUE</span>
						{:else}
							<span class="null-no">—</span>
						{/if}
					</td>
					<td class="col-type">
						{#if idx.type}
							<span class="index-type">{idx.type}</span>
						{:else}
							<span class="null-no">—</span>
						{/if}
					</td>
				</tr>
			{/each}
			{#if indexes.length === 0}
				<tr>
					<td colspan="4" class="empty-message">No indexes</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	.index-list {
		overflow-x: auto;
	}

	.schema-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 12px;
	}

	.schema-table thead th {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 6px 8px;
		text-align: left;
		border-bottom: 1px solid var(--border);
		white-space: nowrap;
	}

	.schema-row {
		border-bottom: 1px solid var(--border-subtle);
	}

	.schema-row:hover {
		background-color: var(--bg-hover);
	}

	.schema-row td {
		padding: 5px 8px;
		vertical-align: middle;
	}

	.index-name {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 12px;
		color: var(--text-primary);
	}

	.columns-list {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.col-sep {
		color: var(--text-muted);
	}

	.null-no {
		color: var(--text-ghost);
		font-size: 11px;
	}

	.badge {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 9px;
		font-weight: 600;
		padding: 1px 4px;
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.badge-unique {
		color: var(--accent-cyan);
		background-color: rgba(34, 211, 238, 0.12);
	}

	.index-type {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.empty-message {
		padding: 16px 8px;
		color: var(--text-ghost);
		font-size: 11px;
		text-align: center;
	}
</style>
