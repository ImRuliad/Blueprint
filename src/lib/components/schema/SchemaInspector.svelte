<script lang="ts">
	import type { TableSchema } from '$lib/server/drivers/types';
	import ColumnList from './ColumnList.svelte';
	import IndexList from './IndexList.svelte';
	import ForeignKeyList from './ForeignKeyList.svelte';

	type SubTab = 'columns' | 'indexes' | 'foreign-keys';

	interface Props {
		connectionId: string;
		tableName: string;
		schema: TableSchema | null;
		loading?: boolean;
		error?: string | null;
		onNavigateToTable?: (tableName: string) => void;
	}

	let {
		connectionId,
		tableName,
		schema,
		loading = false,
		error = null,
		onNavigateToTable,
	}: Props = $props();

	let activeTab = $state<SubTab>('columns');
</script>

<div class="schema-inspector">
	<div class="inspector-header">
		<span class="table-name">{tableName}</span>
		{#if schema}
			<span class="col-count">{schema.columns.length} columns</span>
		{/if}
	</div>

	<div class="sub-tabs">
		<button
			class="sub-tab"
			class:sub-tab--active={activeTab === 'columns'}
			onclick={() => (activeTab = 'columns')}
		>
			Columns
			{#if schema}
				<span class="tab-count">{schema.columns.length}</span>
			{/if}
		</button>
		<button
			class="sub-tab"
			class:sub-tab--active={activeTab === 'indexes'}
			onclick={() => (activeTab = 'indexes')}
		>
			Indexes
			{#if schema}
				<span class="tab-count">{schema.indexes.length}</span>
			{/if}
		</button>
		<button
			class="sub-tab"
			class:sub-tab--active={activeTab === 'foreign-keys'}
			onclick={() => (activeTab = 'foreign-keys')}
		>
			Foreign Keys
			{#if schema}
				<span class="tab-count">{schema.foreignKeys.length}</span>
			{/if}
		</button>
	</div>

	<div class="inspector-body">
		{#if loading}
			<div class="state-message">
				<span class="state-text">Loading schema...</span>
			</div>
		{:else if error}
			<div class="state-message state-message--error">
				<span class="state-text">{error}</span>
			</div>
		{:else if schema}
			{#if activeTab === 'columns'}
				<ColumnList columns={schema.columns} />
			{:else if activeTab === 'indexes'}
				<IndexList indexes={schema.indexes} />
			{:else if activeTab === 'foreign-keys'}
				<ForeignKeyList foreignKeys={schema.foreignKeys} {onNavigateToTable} />
			{/if}
		{:else}
			<div class="state-message">
				<span class="state-text">No schema loaded</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.schema-inspector {
		display: flex;
		flex-direction: column;
		height: 100%;
		background-color: var(--bg-surface);
	}

	.inspector-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px 8px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.table-name {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 13px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.col-count {
		font-size: 11px;
		color: var(--text-ghost);
	}

	.sub-tabs {
		display: flex;
		gap: 0;
		padding: 0 12px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}

	.sub-tab {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 8px 12px 7px;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-size: 12px;
		color: var(--text-muted);
		white-space: nowrap;
		margin-bottom: -1px;
	}

	.sub-tab:hover {
		color: var(--text-secondary);
	}

	.sub-tab--active {
		color: var(--text-primary);
		border-bottom-color: var(--accent-blue);
	}

	.tab-count {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		color: var(--text-ghost);
		background-color: var(--bg-muted);
		padding: 0 4px;
		border-radius: var(--radius-sm);
	}

	.inspector-body {
		flex: 1;
		overflow-y: auto;
	}

	.state-message {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 32px 16px;
	}

	.state-text {
		font-size: 12px;
		color: var(--text-ghost);
	}

	.state-message--error .state-text {
		color: var(--accent-red);
	}
</style>
