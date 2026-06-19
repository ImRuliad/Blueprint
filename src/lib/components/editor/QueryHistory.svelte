<script lang="ts">
	interface HistoryEntry {
		id: string;
		connectionId: string;
		sql: string;
		executedAt: string;
		durationMs: number | null;
		rowCount: number | null;
		error: string | null;
	}

	interface Props {
		entries?: HistoryEntry[];
		onSelect?: (sql: string) => void;
	}

	let { entries = [], onSelect }: Props = $props();

	let search = $state('');

	const filtered = $derived(
		search.trim()
			? entries.filter((e) => e.sql.toLowerCase().includes(search.toLowerCase()))
			: entries
	);

	function formatTime(iso: string): string {
		const d = new Date(iso);
		const now = new Date();
		const diffMs = now.getTime() - d.getTime();
		const diffMin = Math.floor(diffMs / 60000);
		if (diffMin < 1) return 'just now';
		if (diffMin < 60) return `${diffMin}m ago`;
		const diffH = Math.floor(diffMin / 60);
		if (diffH < 24) return `${diffH}h ago`;
		return d.toLocaleDateString();
	}

	function sqlPreview(sql: string): string {
		return sql.replace(/\s+/g, ' ').trim().slice(0, 80);
	}
</script>

<div class="history-panel">
	<div class="history-header">
		<span class="history-title">Query History</span>
	</div>
	<div class="history-search-wrap">
		<input
			class="history-search"
			type="text"
			placeholder="Search queries..."
			bind:value={search}
		/>
	</div>
	<div class="history-list">
		{#if filtered.length === 0}
			<div class="history-empty">
				{search ? 'No matching queries' : 'No history yet'}
			</div>
		{:else}
			{#each filtered as entry (entry.id)}
				<button
					class="history-item {entry.error ? 'history-item--error' : ''}"
					onclick={() => onSelect?.(entry.sql)}
					title={entry.sql}
				>
					<span class="history-item-sql">{sqlPreview(entry.sql)}</span>
					<span class="history-item-meta">
						<span class="history-item-time">{formatTime(entry.executedAt)}</span>
						{#if entry.error}
							<span class="history-item-err-badge">error</span>
						{:else}
							{#if entry.rowCount !== null}
								<span class="history-item-rows">{entry.rowCount} rows</span>
							{/if}
							{#if entry.durationMs !== null}
								<span class="history-item-dur">{entry.durationMs}ms</span>
							{/if}
						{/if}
					</span>
				</button>
			{/each}
		{/if}
	</div>
</div>

<style>
	.history-panel {
		width: 280px;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-default);
		flex-shrink: 0;
	}

	.history-header {
		display: flex;
		align-items: center;
		padding: 0 12px;
		height: 36px;
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}

	.history-title {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.history-search-wrap {
		padding: 8px;
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}

	.history-search {
		width: 100%;
		height: 28px;
		padding: 0 8px;
		background: var(--bg-input, var(--bg-primary));
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		font-size: 12px;
		outline: none;
		box-sizing: border-box;
	}

	.history-search::placeholder {
		color: var(--text-muted);
	}

	.history-search:focus {
		border-color: var(--border-focus);
	}

	.history-list {
		flex: 1;
		overflow-y: auto;
	}

	.history-empty {
		padding: 24px 12px;
		text-align: center;
		font-size: 12px;
		color: var(--text-muted);
	}

	.history-item {
		display: flex;
		flex-direction: column;
		gap: 4px;
		width: 100%;
		padding: 8px 12px;
		background: transparent;
		border: none;
		border-bottom: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.04));
		cursor: pointer;
		text-align: left;
		transition: background-color 0.1s;
	}

	.history-item:hover {
		background: var(--bg-hover);
	}

	.history-item--error .history-item-sql {
		color: var(--accent-red);
	}

	.history-item-sql {
		font-size: 11px;
		font-family: var(--font-mono, 'Geist Mono', monospace);
		color: var(--text-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.history-item-meta {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.history-item-time {
		font-size: 10px;
		color: var(--text-muted);
	}

	.history-item-rows {
		font-size: 10px;
		color: var(--text-muted);
	}

	.history-item-dur {
		font-size: 10px;
		color: var(--text-muted);
		margin-left: auto;
	}

	.history-item-err-badge {
		font-size: 9px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-red);
		background: rgba(239, 68, 68, 0.1);
		padding: 1px 4px;
		border-radius: 2px;
	}
</style>
