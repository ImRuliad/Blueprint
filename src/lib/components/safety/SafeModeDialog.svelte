<script lang="ts">
	import type { SafetyRisk } from '$lib/server/safety/analyzer';

	let {
		open = $bindable(false),
		risk = null,
		onConfirm = () => {},
		onCancel = () => {},
	}: {
		open?: boolean;
		risk: SafetyRisk | null;
		onConfirm?: (bypassSession: boolean) => void;
		onCancel?: () => void;
	} = $props();

	let confirmText = $state('');
	let bypassSession = $state(false);

	let isMatch = $derived(
		risk != null && confirmText.toLowerCase() === risk.affectedObject.toLowerCase()
	);

	function handleConfirm() {
		if (!isMatch) return;
		onConfirm(bypassSession);
		open = false;
		confirmText = '';
		bypassSession = false;
	}

	function handleCancel() {
		onCancel();
		open = false;
		confirmText = '';
		bypassSession = false;
	}

	const riskLabels: Record<string, string> = {
		destructive: 'DROP / TRUNCATE',
		bulk_update: 'Bulk Update/Delete',
		ddl: 'Schema Change',
		always_true_where: 'Always-True WHERE',
	};

	const riskDescriptions: Record<string, string> = {
		destructive: 'This query will permanently delete data. This action cannot be undone.',
		bulk_update: 'This query affects all rows — no WHERE clause or an always-true condition was detected.',
		ddl: 'This query modifies the database schema.',
		always_true_where: 'The WHERE clause is always true, which means all rows will be affected.',
	};
</script>

{#if open && risk}
	<div class="overlay" role="dialog" aria-modal="true">
		<div class="safe-dialog">
			<div class="safe-dialog-header">
				<div class="safe-dialog-icon">🛡</div>
				<div>
					<div class="safe-dialog-title">Destructive Query Detected</div>
					<div class="safe-dialog-risk risk-{risk.riskType}">{riskLabels[risk.riskType]}</div>
				</div>
			</div>

			<div class="safe-dialog-body">
				<p class="safe-dialog-desc">{riskDescriptions[risk.riskType]}</p>

				<div class="safe-dialog-sql">
					<code>{risk.statement}</code>
				</div>

				<div class="safe-dialog-confirm">
					<label>
						Type <strong>{risk.affectedObject}</strong> to confirm:
					</label>
					<input
						type="text"
						class="confirm-input"
						placeholder="Type table name..."
						bind:value={confirmText}
					/>
					{#if isMatch}
						<div class="confirm-match">✓ Name matches — execute button enabled</div>
					{/if}
				</div>

				<label class="safe-dialog-checkbox">
					<input type="checkbox" bind:checked={bypassSession} />
					Disable Safe Mode for this connection for the current session
				</label>
			</div>

			<div class="safe-dialog-footer">
				<button class="btn btn-ghost" onclick={handleCancel}>Cancel</button>
				<button class="btn btn-danger" disabled={!isMatch} onclick={handleConfirm}>
					Execute
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed; inset: 0;
		background: rgba(0, 0, 0, 0.65);
		display: flex; align-items: center; justify-content: center;
		z-index: 100; backdrop-filter: blur(3px);
	}
	.safe-dialog {
		background: var(--bg-elevated);
		border: 1px solid rgba(239, 68, 68, 0.25);
		border-radius: 10px; width: 440px;
		box-shadow: 0 16px 48px rgba(0,0,0,0.5);
	}
	.safe-dialog-header {
		display: flex; align-items: center; gap: 10px;
		padding: 16px 20px 12px;
		border-bottom: 1px solid var(--border);
		background: rgba(239, 68, 68, 0.03);
	}
	.safe-dialog-icon {
		width: 32px; height: 32px;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.15);
		border-radius: 8px;
		display: flex; align-items: center; justify-content: center;
		font-size: 16px;
	}
	.safe-dialog-title { font-size: 14px; font-weight: 600; color: var(--text-primary); }
	.safe-dialog-risk {
		font-size: 10px; font-weight: 500;
		padding: 2px 7px; border-radius: 3px; margin-top: 2px; display: inline-block;
	}
	.risk-destructive, .risk-always_true_where { color: var(--accent-red); background: rgba(239, 68, 68, 0.1); }
	.risk-bulk_update { color: var(--accent-amber); background: rgba(245, 158, 11, 0.1); }
	.risk-ddl { color: var(--accent-blue); background: rgba(96, 165, 250, 0.1); }
	.safe-dialog-body { padding: 16px 20px; }
	.safe-dialog-desc { font-size: 12px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 14px; }
	.safe-dialog-sql {
		background: var(--bg-root); border: 1px solid var(--border); border-radius: 6px;
		padding: 10px 12px; font-family: 'Geist Mono', monospace;
		font-size: 11px; color: var(--text-secondary); margin-bottom: 14px; overflow-x: auto;
	}
	.safe-dialog-confirm label { font-size: 11px; color: var(--text-muted); margin-bottom: 6px; display: block; }
	.safe-dialog-confirm strong { color: var(--text-primary); font-family: 'Geist Mono', monospace; }
	.confirm-input {
		width: 100%; padding: 7px 10px;
		background: var(--bg-root); border: 1px solid var(--border); border-radius: 6px;
		color: var(--text-primary); font-size: 12px; font-family: 'Geist Mono', monospace; outline: none;
	}
	.confirm-input:focus { border-color: rgba(239, 68, 68, 0.3); }
	.confirm-match { font-size: 10px; color: var(--accent-green); margin-top: 4px; }
	.safe-dialog-checkbox {
		display: flex; align-items: center; gap: 6px;
		font-size: 10px; color: var(--text-dim);
		margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);
		cursor: pointer;
	}
	.safe-dialog-checkbox input { accent-color: var(--accent-red); }
	.safe-dialog-footer {
		display: flex; gap: 8px; justify-content: flex-end; padding: 12px 20px 16px;
	}
	.btn { padding: 6px 14px; border-radius: 6px; font-size: 11px; cursor: pointer; border: none; font-weight: 500; }
	.btn-ghost { background: transparent; color: var(--text-muted); border: 1px solid var(--border); }
	.btn-danger { background: var(--accent-red); color: white; }
	.btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
