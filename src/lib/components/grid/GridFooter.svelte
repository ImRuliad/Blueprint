<script lang="ts">
	interface Props {
		totalLoaded?: number;
		hasMore?: boolean;
		loading?: boolean;
		onLoadMore?: () => void;
		onLoadPrev?: () => void;
	}

	let {
		totalLoaded = 0,
		hasMore = false,
		loading = false,
		onLoadMore,
		onLoadPrev,
	}: Props = $props();

	function rangeLabel(): string {
		if (totalLoaded === 0) return 'No rows';
		return `Showing 1–${totalLoaded} rows${hasMore ? '+' : ''}`;
	}
</script>

<div class="grid-footer" data-testid="grid-footer">
	<span class="grid-footer-label">{rangeLabel()}</span>

	<div class="grid-footer-actions">
		{#if hasMore}
			<button
				class="grid-footer-btn"
				onclick={() => onLoadMore?.()}
				disabled={loading}
			>
				{loading ? 'Loading…' : 'Load more'}
			</button>
		{/if}
	</div>
</div>

<style>
	.grid-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 28px;
		padding: 0 8px;
		background: var(--bg-elevated);
		border-top: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.grid-footer-label {
		font-size: 11px;
		color: var(--text-muted);
		font-family: 'Geist Mono', ui-monospace, monospace;
	}

	.grid-footer-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.grid-footer-btn {
		padding: 2px 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-secondary);
		background: var(--bg-muted);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.grid-footer-btn:hover:not(:disabled) {
		color: var(--text-primary);
		background: var(--bg-hover);
	}

	.grid-footer-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
