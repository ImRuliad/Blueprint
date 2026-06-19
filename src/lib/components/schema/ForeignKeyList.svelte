<script lang="ts">
	import type { ForeignKeyInfo } from '$lib/server/drivers/types';

	interface Props {
		foreignKeys: ForeignKeyInfo[];
		onNavigateToTable?: (tableName: string) => void;
	}

	let { foreignKeys, onNavigateToTable }: Props = $props();
</script>

<div class="fk-list">
	<table class="schema-table">
		<thead>
			<tr>
				<th class="col-name">Constraint</th>
				<th class="col-column">Column</th>
				<th class="col-ref">References</th>
				<th class="col-delete">On Delete</th>
				<th class="col-update">On Update</th>
			</tr>
		</thead>
		<tbody>
			{#each foreignKeys as fk (fk.constraintName)}
				<tr class="schema-row">
					<td class="col-name">
						<span class="constraint-name">{fk.constraintName}</span>
					</td>
					<td class="col-column">
						<span class="fk-column">{fk.column}</span>
					</td>
					<td class="col-ref">
						{#if onNavigateToTable}
							<button
								class="ref-link"
								onclick={() => onNavigateToTable?.(fk.referencedTable)}
								title="Open {fk.referencedTable}"
							>
								<span class="ref-table">{fk.referencedTable}</span>.<span class="ref-col">{fk.referencedColumn}</span>
							</button>
						{:else}
							<span class="ref-plain">
								<span class="ref-table">{fk.referencedTable}</span>.<span class="ref-col">{fk.referencedColumn}</span>
							</span>
						{/if}
					</td>
					<td class="col-delete">
						{#if fk.onDelete}
							<span class="action-badge">{fk.onDelete}</span>
						{:else}
							<span class="null-no">—</span>
						{/if}
					</td>
					<td class="col-update">
						{#if fk.onUpdate}
							<span class="action-badge">{fk.onUpdate}</span>
						{:else}
							<span class="null-no">—</span>
						{/if}
					</td>
				</tr>
			{/each}
			{#if foreignKeys.length === 0}
				<tr>
					<td colspan="5" class="empty-message">No foreign keys</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>

<style>
	.fk-list {
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

	.constraint-name {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.fk-column {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 12px;
		color: var(--text-primary);
	}

	.ref-link {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		font-size: 12px;
	}

	.ref-link:hover .ref-table {
		text-decoration: underline;
	}

	.ref-plain {
		font-size: 12px;
	}

	.ref-table {
		font-family: 'Geist Mono', ui-monospace, monospace;
		color: var(--accent-blue);
	}

	.ref-col {
		font-family: 'Geist Mono', ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.action-badge {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		font-weight: 500;
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.null-no {
		color: var(--text-ghost);
		font-size: 11px;
	}

	.empty-message {
		padding: 16px 8px;
		color: var(--text-ghost);
		font-size: 11px;
		text-align: center;
	}
</style>
