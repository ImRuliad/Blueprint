<script lang="ts">
	import type { GridFilter } from '$lib/stores/grid';

	interface Props {
		filters?: GridFilter[];
		availableColumns?: string[];
		onAddFilter?: (filter: GridFilter) => void;
		onRemoveFilter?: (index: number) => void;
	}

	let {
		filters = [],
		availableColumns = [],
		onAddFilter,
		onRemoveFilter,
	}: Props = $props();

	const OPERATORS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'IS NULL', 'IS NOT NULL'];

	let showAddForm = $state(false);
	let newColumn = $state('');
	let newOperator = $state('=');
	let newValue = $state('');

	const noValueOps = new Set(['IS NULL', 'IS NOT NULL']);

	function openAddForm() {
		newColumn = availableColumns[0] ?? '';
		newOperator = '=';
		newValue = '';
		showAddForm = true;
	}

	function cancelAdd() {
		showAddForm = false;
	}

	function submitFilter(e: Event) {
		e.preventDefault();
		if (!newColumn) return;
		onAddFilter?.({
			column: newColumn,
			operator: newOperator,
			value: noValueOps.has(newOperator) ? '' : newValue,
		});
		showAddForm = false;
		newValue = '';
	}

	function chipLabel(filter: GridFilter): string {
		if (noValueOps.has(filter.operator)) {
			return `${filter.column} ${filter.operator}`;
		}
		return `${filter.column} ${filter.operator} ${filter.value}`;
	}
</script>

<div class="filter-bar" data-testid="filter-bar">
	<!-- Active filter chips -->
	<div class="filter-chips">
		{#each filters as filter, i}
			<div class="filter-chip">
				<span class="filter-chip-label">{chipLabel(filter)}</span>
				<button
					class="filter-chip-remove"
					onclick={() => onRemoveFilter?.(i)}
					aria-label="Remove filter"
				>
					×
				</button>
			</div>
		{/each}
	</div>

	<!-- Add filter -->
	{#if !showAddForm}
		<button class="filter-add-btn" onclick={openAddForm}>
			+ Filter
		</button>
	{:else}
		<form class="filter-form" onsubmit={submitFilter}>
			<select class="filter-select" bind:value={newColumn}>
				{#each availableColumns as col}
					<option value={col}>{col}</option>
				{/each}
			</select>

			<select class="filter-select" bind:value={newOperator}>
				{#each OPERATORS as op}
					<option value={op}>{op}</option>
				{/each}
			</select>

			{#if !noValueOps.has(newOperator)}
				<input
					class="filter-input"
					type="text"
					placeholder="value"
					bind:value={newValue}
				/>
			{/if}

			<button class="filter-form-btn filter-form-btn--apply" type="submit">Apply</button>
			<button class="filter-form-btn" type="button" onclick={cancelAdd}>Cancel</button>
		</form>
	{/if}
</div>

<style>
	.filter-bar {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px 8px;
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border-subtle);
		min-height: 28px;
		flex-shrink: 0;
	}

	.filter-chips {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 4px;
	}

	.filter-chip {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 1px 6px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		font-size: 11px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		color: var(--text-secondary);
	}

	.filter-chip-label {
		max-width: 240px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.filter-chip-remove {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0 2px;
		font-size: 13px;
		line-height: 1;
	}

	.filter-chip-remove:hover {
		color: var(--accent-red);
	}

	.filter-add-btn {
		padding: 1px 8px;
		font-size: 11px;
		color: var(--text-muted);
		background: none;
		border: 1px dashed var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.filter-add-btn:hover {
		color: var(--text-secondary);
		border-color: var(--border-subtle);
		background: var(--bg-hover);
	}

	.filter-form {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.filter-select,
	.filter-input {
		height: 22px;
		padding: 0 6px;
		font-size: 11px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		color: var(--text-primary);
		background: var(--bg-muted);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		outline: none;
	}

	.filter-select:focus,
	.filter-input:focus {
		border-color: var(--accent-blue);
	}

	.filter-form-btn {
		padding: 1px 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		background: var(--bg-muted);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
		height: 22px;
	}

	.filter-form-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-hover);
	}

	.filter-form-btn--apply {
		color: var(--text-primary);
		background: var(--bg-elevated);
		border-color: var(--border);
	}

	.filter-form-btn--apply:hover {
		background: var(--bg-hover);
	}
</style>
