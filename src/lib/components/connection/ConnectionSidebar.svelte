<script lang="ts">
	import { connections, connectionGroups, refreshConnections } from '$lib/stores/connections';
	import type { ConnectionWithStatus } from '$lib/stores/connections';

	let searchQuery = $state('');

	let filteredGroups = $derived.by(() => {
		const groups = $connectionGroups;
		if (!searchQuery.trim()) return groups;
		const q = searchQuery.toLowerCase();
		const filtered = new Map<string, ConnectionWithStatus[]>();
		for (const [key, list] of groups) {
			const matches = list.filter(
				(c) =>
					c.name.toLowerCase().includes(q) ||
					c.engine.toLowerCase().includes(q) ||
					(c.host ?? '').toLowerCase().includes(q) ||
					(c.database ?? '').toLowerCase().includes(q)
			);
			if (matches.length > 0) {
				filtered.set(key, matches);
			}
		}
		return filtered;
	});

	function engineBadge(engine: string): { label: string; cls: string } {
		switch (engine) {
			case 'postgresql': return { label: 'PG', cls: 'engine-badge--pg' };
			case 'mysql': return { label: 'MY', cls: 'engine-badge--my' };
			case 'sqlite': return { label: 'SQ', cls: 'engine-badge--sq' };
			case 'mongodb': return { label: 'MG', cls: 'engine-badge--mg' };
			default: return { label: '??', cls: '' };
		}
	}

	interface Props {
		onNewConnection?: () => void;
		onSelectConnection?: (conn: ConnectionWithStatus) => void;
	}

	let { onNewConnection, onSelectConnection }: Props = $props();
</script>

<div class="sidebar-header">
	<span class="text-logo">Blueprint</span>
</div>

<div class="sidebar-search">
	<input
		type="text"
		placeholder="Search connections..."
		class="search-input"
		bind:value={searchQuery}
	/>
</div>

<div class="sidebar-section">
	<span class="text-section-label">Connections</span>
	<button class="sidebar-add-btn" onclick={onNewConnection} title="New connection">+</button>
</div>

<div class="sidebar-list">
	{#if $connections.length === 0}
		<div class="sidebar-empty">
			<span class="sidebar-empty-text">No connections yet</span>
		</div>
	{:else}
		{#each [...filteredGroups] as [groupName, groupConns]}
			{#if groupName}
				<div class="sidebar-group-label">
					<span class="text-section-label">{groupName}</span>
				</div>
			{/if}
			{#each groupConns as conn (conn.id)}
				<button
					class="sidebar-conn-item"
					onclick={() => onSelectConnection?.(conn)}
				>
					<span class="status-dot {conn.connected ? 'status-dot--connected' : 'status-dot--disconnected'}"></span>
					<span class="sidebar-conn-name">{conn.name}</span>
					<span class="engine-badge {engineBadge(conn.engine).cls}">{engineBadge(conn.engine).label}</span>
				</button>
			{/each}
		{/each}
	{/if}
</div>

<style>
	.sidebar-header {
		display: flex;
		align-items: center;
		height: 48px;
		padding: 0 12px;
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}

	.sidebar-search {
		padding: 8px;
		flex-shrink: 0;
	}

	.search-input {
		width: 100%;
		height: 28px;
		padding: 0 8px;
		background-color: var(--bg-input);
		border: 1px solid var(--border-default);
		border-radius: 4px;
		color: var(--text-primary);
		font-size: 12px;
		outline: none;
		box-sizing: border-box;
	}

	.search-input::placeholder {
		color: var(--text-ghost);
	}

	.search-input:focus {
		border-color: var(--border-focus);
	}

	.sidebar-section {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px 4px;
		flex-shrink: 0;
	}

	.sidebar-add-btn {
		background: none;
		border: none;
		color: var(--text-ghost);
		font-size: 16px;
		cursor: pointer;
		padding: 0 4px;
		line-height: 1;
	}

	.sidebar-add-btn:hover {
		color: var(--text-secondary);
	}

	.sidebar-list {
		flex: 1;
		overflow-y: auto;
		padding: 0 4px;
	}

	.sidebar-empty {
		padding: 8px 12px;
	}

	.sidebar-empty-text {
		color: var(--text-ghost);
		font-size: 11px;
	}

	.sidebar-group-label {
		padding: 10px 8px 2px;
	}

	.sidebar-conn-item {
		display: flex;
		align-items: center;
		gap: 6px;
		width: 100%;
		padding: 4px 8px;
		border: none;
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		text-align: left;
	}

	.sidebar-conn-item:hover {
		background-color: var(--bg-hover);
	}

	.sidebar-conn-name {
		flex: 1;
		font-size: 12px;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
