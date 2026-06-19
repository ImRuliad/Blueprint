<script lang="ts">
	interface Props {
		dialect?: string;
		historyOpen?: boolean;
		loading?: boolean;
		onRun?: () => void;
		onToggleHistory?: () => void;
	}

	let {
		dialect = 'SQL',
		historyOpen = $bindable(false),
		loading = false,
		onRun,
		onToggleHistory,
	}: Props = $props();
</script>

<div class="toolbar">
	<button
		class="toolbar-run"
		onclick={onRun}
		disabled={loading}
		title="Run query (⌘↵)"
	>
		{#if loading}
			<span class="toolbar-run-spinner"></span>
			<span>Running</span>
		{:else}
			<svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
				<path d="M2 1.5l9 4.5-9 4.5V1.5z" />
			</svg>
			<span>Run</span>
			<span class="toolbar-run-hint">⌘↵</span>
		{/if}
	</button>

	<div class="toolbar-spacer"></div>

	<span class="toolbar-dialect">{dialect.toUpperCase()}</span>

	<button
		class="toolbar-history {historyOpen ? 'toolbar-history--active' : ''}"
		onclick={() => {
			historyOpen = !historyOpen;
			onToggleHistory?.();
		}}
		title="Toggle query history"
	>
		<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
			<circle cx="7" cy="7" r="5.5" />
			<path d="M7 4v3l2 1.5" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
		History
	</button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 10px;
		height: 36px;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-default);
		flex-shrink: 0;
	}

	.toolbar-run {
		display: flex;
		align-items: center;
		gap: 5px;
		padding: 0 10px;
		height: 26px;
		background: var(--accent-green, #22c55e);
		color: #fff;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 12px;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.toolbar-run:hover:not(:disabled) {
		opacity: 0.88;
	}

	.toolbar-run:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.toolbar-run-hint {
		font-size: 10px;
		opacity: 0.75;
		margin-left: 2px;
	}

	.toolbar-run-spinner {
		width: 10px;
		height: 10px;
		border: 1.5px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	.toolbar-spacer {
		flex: 1;
	}

	.toolbar-dialect {
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.06em;
		color: var(--text-muted);
		padding: 2px 6px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
	}

	.toolbar-history {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 8px;
		height: 26px;
		background: transparent;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		font-size: 12px;
		cursor: pointer;
		transition: background-color 0.1s, border-color 0.1s, color 0.1s;
	}

	.toolbar-history:hover {
		background: var(--bg-hover);
		border-color: var(--border-focus);
		color: var(--text-primary);
	}

	.toolbar-history--active {
		background: var(--bg-hover);
		border-color: var(--border-focus);
		color: var(--text-primary);
	}
</style>
