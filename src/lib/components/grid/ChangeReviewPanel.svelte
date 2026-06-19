<script lang="ts">
	import type { PendingChange } from '$lib/stores/changes';
	import { generateSQL } from '$lib/server/mutations/generator';
	import type { EngineType } from '$lib/server/drivers/types';

	interface Props {
		changes?: PendingChange[];
		engine?: EngineType;
		commitError?: string | null;
		committing?: boolean;
		onRevert?: (changeId: string) => void;
		onRevertAll?: () => void;
		onCommit?: () => void;
		onClose?: () => void;
	}

	let {
		changes = [],
		engine = 'postgresql',
		commitError = null,
		committing = false,
		onRevert,
		onRevertAll,
		onCommit,
		onClose,
	}: Props = $props();

	function operationIcon(op: PendingChange['operation']): string {
		switch (op) {
			case 'update': return 'pencil';
			case 'insert': return 'plus';
			case 'delete': return 'trash';
		}
	}

	function operationLabel(op: PendingChange['operation']): string {
		switch (op) {
			case 'update': return 'UPDATE';
			case 'insert': return 'INSERT';
			case 'delete': return 'DELETE';
		}
	}

	function operationClass(op: PendingChange['operation']): string {
		switch (op) {
			case 'update': return 'change-item--update';
			case 'insert': return 'change-item--insert';
			case 'delete': return 'change-item--delete';
		}
	}

	function getPreviewSQL(change: PendingChange): string {
		try {
			const { sql } = generateSQL(
				{
					operation: change.operation,
					tableName: change.tableName,
					pk: change.pk,
					column: change.column,
					newValue: change.newValue,
					row: change.row,
				},
				engine
			);
			return sql;
		} catch {
			return '-- unable to generate preview --';
		}
	}
</script>

<div class="review-panel" data-testid="change-review-panel">
	<div class="review-header">
		<span class="review-title">Pending Changes ({changes.length})</span>
		<button class="review-close-btn" onclick={() => onClose?.()} aria-label="Close">
			&times;
		</button>
	</div>

	{#if commitError}
		<div class="review-error" data-testid="commit-error">
			{commitError}
		</div>
	{/if}

	<div class="review-list">
		{#each changes as change}
			<div class="change-item {operationClass(change.operation)}" data-testid="change-item">
				<div class="change-item-header">
					<span class="change-op-badge">{operationLabel(change.operation)}</span>
					<span class="change-table">{change.tableName}</span>
					<button
						class="change-revert-btn"
						onclick={() => onRevert?.(change.id)}
						aria-label="Revert change"
					>
						Revert
					</button>
				</div>
				<pre class="change-sql">{getPreviewSQL(change)}</pre>
			</div>
		{/each}
	</div>

	{#if changes.length === 0}
		<div class="review-empty">No pending changes</div>
	{/if}

	<div class="review-footer">
		<button
			class="review-btn review-btn--revert"
			onclick={() => onRevertAll?.()}
			disabled={changes.length === 0}
		>
			Revert All
		</button>
		<button
			class="review-btn review-btn--commit"
			onclick={() => onCommit?.()}
			disabled={changes.length === 0 || committing}
		>
			{committing ? 'Committing...' : 'Commit'}
		</button>
	</div>
</div>

<style>
	.review-panel {
		display: flex;
		flex-direction: column;
		width: 360px;
		height: 100%;
		background: var(--bg-elevated);
		border-left: 1px solid var(--border);
		overflow: hidden;
		flex-shrink: 0;
	}

	.review-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-subtle);
	}

	.review-title {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-primary);
	}

	.review-close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 18px;
		line-height: 1;
		padding: 0 4px;
	}

	.review-close-btn:hover {
		color: var(--text-primary);
	}

	.review-error {
		padding: 8px 12px;
		background: rgba(239, 68, 68, 0.1);
		border-bottom: 1px solid var(--border-subtle);
		color: var(--accent-red);
		font-size: 11px;
	}

	.review-list {
		flex: 1;
		overflow-y: auto;
		padding: 4px;
	}

	.change-item {
		margin-bottom: 4px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.change-item--update {
		border-left: 3px solid var(--accent-amber);
	}

	.change-item--insert {
		border-left: 3px solid var(--accent-green);
	}

	.change-item--delete {
		border-left: 3px solid var(--accent-red);
	}

	.change-item-header {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		background: var(--bg-muted);
	}

	.change-op-badge {
		font-size: 9px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--text-muted);
	}

	.change-table {
		flex: 1;
		font-size: 11px;
		font-family: 'Geist Mono', ui-monospace, monospace;
		color: var(--text-secondary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.change-revert-btn {
		font-size: 10px;
		color: var(--text-muted);
		background: none;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		padding: 1px 6px;
		cursor: pointer;
	}

	.change-revert-btn:hover {
		color: var(--accent-red);
		border-color: var(--accent-red);
	}

	.change-sql {
		padding: 4px 8px;
		margin: 0;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 10px;
		color: var(--text-dim);
		white-space: pre-wrap;
		word-break: break-all;
		background: var(--bg-surface);
	}

	.review-empty {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		font-size: 12px;
		color: var(--text-muted);
	}

	.review-footer {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		padding: 8px 12px;
		border-top: 1px solid var(--border-subtle);
	}

	.review-btn {
		padding: 4px 12px;
		font-size: 11px;
		font-weight: 500;
		border-radius: var(--radius-sm);
		cursor: pointer;
		border: 1px solid var(--border-subtle);
	}

	.review-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.review-btn--revert {
		color: var(--text-muted);
		background: var(--bg-muted);
	}

	.review-btn--revert:hover:not(:disabled) {
		color: var(--text-secondary);
		background: var(--bg-hover);
	}

	.review-btn--commit {
		color: var(--text-primary);
		background: var(--accent-green);
		border-color: var(--accent-green);
	}

	.review-btn--commit:hover:not(:disabled) {
		opacity: 0.9;
	}
</style>
