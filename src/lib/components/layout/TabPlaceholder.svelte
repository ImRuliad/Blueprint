<script lang="ts">
	const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const mod = isMac ? '\u2318' : 'Ctrl';
	const alt = isMac ? '\u2325' : 'Alt';
</script>

<div class="placeholder">
	<div class="placeholder-inner">
		<p class="placeholder-message">Open a table or query to get started</p>
		<div class="placeholder-shortcuts">
			<div class="shortcut-row">
				<kbd>{mod}{alt}N</kbd>
				<span>New query tab</span>
			</div>
			<div class="shortcut-row">
				<kbd>{mod}{isMac ? '\u21E7' : '+Shift+'}W</kbd>
				<span>Close current tab</span>
			</div>
		</div>
	</div>
</div>

<style>
	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background-color: var(--bg-root);
	}

	.placeholder-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}

	.placeholder-message {
		font-size: 13px;
		color: var(--text-ghost);
		margin: 0;
	}

	.placeholder-shortcuts {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--text-ghost);
	}

	kbd {
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		padding: 2px 6px;
		border: 1px solid var(--border, #27272a);
		border-radius: 3px;
		background-color: var(--bg-elevated);
		color: var(--text-secondary);
		min-width: 52px;
		text-align: center;
	}
</style>
