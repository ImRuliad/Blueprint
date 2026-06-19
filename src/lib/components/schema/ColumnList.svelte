<script lang="ts">
	import type { ColumnInfo } from '$lib/server/drivers/types';

	interface Props {
		columns: ColumnInfo[];
	}

	let { columns }: Props = $props();
</script>

<div class="column-list">
	<table class="schema-table">
		<thead>
			<tr>
				<th class="col-name">Name</th>
				<th class="col-type">Type</th>
				<th class="col-nullable">Null</th>
				<th class="col-default">Default</th>
				<th class="col-attrs">Attrs</th>
			</tr>
		</thead>
		<tbody>
			{#each columns as col (col.name)}
				<tr class="schema-row">
					<td class="col-name">
						<span class="col-name-text">{col.name}</span>
					</td>
					<td class="col-type">
						<span class="type-label">{col.dataType}</span>
					</td>
					<td class="col-nullable">
						{#if !col.nullable}
							<span class="badge badge-nn">NN</span>
						{:else}
							<span class="null-yes">—</span>
						{/if}
					</td>
					<td class="col-default">
						{#if col.defaultValue !== null}
							<span class="default-value">{col.defaultValue}</span>
						{:else}
							<span class="value-null">null</span>
						{/if}
					</td>
					<td class="col-attrs">
						<span class="badge-row">
							{#if col.isPrimaryKey}
								<span class="badge badge-pk" title="Primary Key">&#9670;</span>
							{/if}
							{#if col.isAutoIncrement}
								<span class="badge badge-ai" title="Auto Increment">AI</span>
							{/if}
						</span>
					</td>
				</tr>
			{/each}
			{#if columns.length === 0}
				<tr>
					<td colspan="5" class="empty-message">No columns</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	.column-list {
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

	.col-name-text {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 12px;
		color: var(--text-primary);
	}

	.type-label {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		color: var(--accent-purple);
	}

	.null-yes {
		color: var(--text-ghost);
		font-size: 11px;
	}

	.default-value {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.badge-row {
		display: flex;
		gap: 4px;
		align-items: center;
	}

	.badge {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 9px;
		font-weight: 600;
		padding: 1px 4px;
		border-radius: var(--radius-sm);
		white-space: nowrap;
	}

	.badge-pk {
		color: var(--accent-amber);
		background-color: rgba(245, 158, 11, 0.12);
	}

	.badge-nn {
		color: var(--accent-amber);
		background-color: rgba(245, 158, 11, 0.12);
	}

	.badge-ai {
		color: var(--text-muted);
		background-color: var(--bg-muted);
	}

	.empty-message {
		padding: 16px 8px;
		color: var(--text-ghost);
		font-size: 11px;
		text-align: center;
	}
</style>
