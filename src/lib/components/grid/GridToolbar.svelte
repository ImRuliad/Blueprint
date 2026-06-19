<script lang="ts">
	export type ViewMode = 'data' | 'structure' | 'query';

	interface Props {
		viewMode?: ViewMode;
		rowCount?: number;
		columnCount?: number;
		visibleColumns?: string[];
		allColumns?: string[];
		pendingChangeCount?: number;
		onViewChange?: (mode: ViewMode) => void;
		onToggleColumn?: (column: string) => void;
		onExport?: () => void;
		onReview?: () => void;
		onCommit?: () => void;
		onAddRow?: () => void;
	}

	let {
		viewMode = 'data',
		rowCount = 0,
		columnCount = 0,
		visibleColumns = [],
		allColumns = [],
		pendingChangeCount = 0,
		onViewChange,
		onToggleColumn,
		onExport,
		onReview,
		onCommit,
		onAddRow,
	}: Props = $props();

	let showColumnPicker = $state(false);

	const views: { id: ViewMode; label: string }[] = [
		{ id: 'data', label: 'Data' },
		{ id: 'structure', label: 'Structure' },
		{ id: 'query', label: 'Query' },
	];

	function toggleColumnPicker() {
		showColumnPicker = !showColumnPicker;
	}

	function isVisible(col: string): boolean {
		return visibleColumns.length === 0 || visibleColumns.includes(col);
	}
</script>

<div class="toolbar" data-testid="grid-toolbar">
	<!-- View switcher -->
	<div class="toolbar-views">
		{#each views as view}
			<button
				class="toolbar-view-btn {viewMode === view.id ? 'toolbar-view-btn--active' : ''}"
				onclick={() => onViewChange?.(view.id)}
			>
				{view.label}
			</button>
		{/each}
	</div>

	<div class="toolbar-spacer"></div>

	<!-- Pending changes indicator -->
	{#if pendingChangeCount > 0}
		<div class="toolbar-changes" data-testid="pending-changes-badge">
			<span class="toolbar-changes-badge">{pendingChangeCount}</span>
			<button class="toolbar-btn toolbar-btn--review" onclick={() => onReview?.()}>
				Review
			</button>
			<button class="toolbar-btn toolbar-btn--commit" onclick={() => onCommit?.()}>
				Commit
			</button>
		</div>
	{/if}

	<!-- Add row button -->
	{#if viewMode === 'data'}
		<button class="toolbar-btn" onclick={() => onAddRow?.()}>
			+ Row
		</button>
	{/if}

	<!-- Metadata -->
	<div class="toolbar-meta">
		<span class="toolbar-meta-item">{rowCount} rows</span>
		<span class="toolbar-meta-sep">-</span>
		<span class="toolbar-meta-item">{columnCount} cols</span>
	</div>

	<!-- Column visibility -->
	{#if allColumns.length > 0}
		<div class="toolbar-col-picker">
			<button class="toolbar-btn" onclick={toggleColumnPicker} aria-pressed={showColumnPicker}>
				Columns
			</button>
			{#if showColumnPicker}
				<div class="col-picker-dropdown">
					{#each allColumns as col}
						<label class="col-picker-item">
							<input
								type="checkbox"
								checked={isVisible(col)}
								onchange={() => onToggleColumn?.(col)}
							/>
							<span class="col-picker-name">{col}</span>
						</label>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Export -->
	<button class="toolbar-btn" onclick={() => onExport?.()}>
		Export
	</button>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 4px;
		height: 32px;
		padding: 0 8px;
		background: var(--bg-elevated);
		border-bottom: 1px solid var(--border-subtle);
		flex-shrink: 0;
	}

	.toolbar-views {
		display: flex;
		align-items: center;
		gap: 1px;
		background: var(--bg-muted);
		border-radius: var(--radius-sm);
		padding: 2px;
	}

	.toolbar-view-btn {
		padding: 2px 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		background: none;
		border: none;
		border-radius: 3px;
		cursor: pointer;
		transition: color 0.1s, background 0.1s;
	}

	.toolbar-view-btn:hover {
		color: var(--text-secondary);
	}

	.toolbar-view-btn--active {
		color: var(--text-primary);
		background: var(--bg-elevated);
	}

	.toolbar-spacer {
		flex: 1;
	}

	.toolbar-changes {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.toolbar-changes-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 18px;
		height: 18px;
		padding: 0 5px;
		font-size: 10px;
		font-weight: 700;
		color: var(--text-primary);
		background: var(--accent-amber);
		border-radius: 9px;
	}

	.toolbar-meta {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 11px;
		color: var(--text-muted);
	}

	.toolbar-meta-item {
		color: var(--text-dim);
	}

	.toolbar-meta-sep {
		color: var(--text-ghost);
	}

	.toolbar-col-picker {
		position: relative;
	}

	.toolbar-btn {
		padding: 2px 8px;
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
		background: var(--bg-muted);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.toolbar-btn:hover {
		color: var(--text-secondary);
		background: var(--bg-hover);
	}

	.toolbar-btn--review {
		color: var(--accent-amber);
		border-color: var(--accent-amber);
	}

	.toolbar-btn--review:hover {
		color: var(--text-primary);
		background: rgba(245, 158, 11, 0.1);
	}

	.toolbar-btn--commit {
		color: var(--accent-green);
		border-color: var(--accent-green);
	}

	.toolbar-btn--commit:hover {
		color: var(--text-primary);
		background: rgba(34, 197, 94, 0.1);
	}

	.col-picker-dropdown {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		min-width: 160px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 4px;
		z-index: 10;
		box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
		max-height: 240px;
		overflow-y: auto;
	}

	.col-picker-item {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 6px;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: 11px;
		color: var(--text-secondary);
	}

	.col-picker-item:hover {
		background: var(--bg-hover);
	}

	.col-picker-name {
		font-family: 'Geist Mono', ui-monospace, monospace;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
