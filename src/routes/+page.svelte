<script lang="ts">
	import { connections } from '$lib/stores/connections';
	import ConnectionForm from '$lib/components/connection/ConnectionForm.svelte';

	let connectionFormOpen = $state(false);

	function engineBadge(engine: string): { label: string; cls: string } {
		switch (engine) {
			case 'postgresql': return { label: 'PG', cls: 'engine-badge--pg' };
			case 'mysql': return { label: 'MY', cls: 'engine-badge--my' };
			case 'sqlite': return { label: 'SQ', cls: 'engine-badge--sq' };
			case 'mongodb': return { label: 'MG', cls: 'engine-badge--mg' };
			default: return { label: '??', cls: '' };
		}
	}
</script>

<svelte:head>
	<title>Blueprint</title>
</svelte:head>

<div class="welcome">
	<div class="welcome-inner">
		<h1 class="welcome-title">Blueprint</h1>
		<p class="welcome-subtitle">Database GUI for SQLite, PostgreSQL, MySQL, and MongoDB</p>
		<span class="welcome-version">v0.1.0</span>

		<div class="welcome-actions">
			{#each $connections as conn (conn.id)}
				<div class="connection-card">
					<div class="connection-card-header">
						<span class="status-dot {conn.connected ? 'status-dot--connected' : 'status-dot--disconnected'}"></span>
						<span class="connection-card-name">{conn.name}</span>
					</div>
					<span class="engine-badge {engineBadge(conn.engine).cls}">{engineBadge(conn.engine).label}</span>
				</div>
			{/each}
			<button class="new-connection-card" onclick={() => { connectionFormOpen = true; }}>
				<span class="new-connection-plus">+</span>
				<span class="new-connection-label">New Connection</span>
			</button>
		</div>

		<div class="welcome-shortcuts">
			<div class="shortcut-row">
				<kbd>&#8984;K</kbd>
				<span>Command palette</span>
			</div>
			<div class="shortcut-row">
				<kbd>&#8984;&#8997;N</kbd>
				<span>New connection</span>
			</div>
			<div class="shortcut-row">
				<kbd>&#8984;B</kbd>
				<span>Toggle sidebar</span>
			</div>
		</div>
	</div>
</div>

<ConnectionForm bind:open={connectionFormOpen} />

<style>
	.welcome {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		background-color: var(--bg-root);
	}

	.welcome-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.welcome-title {
		font-family: 'Geist Mono', monospace;
		font-size: 24px;
		font-weight: 500;
		color: var(--text-primary);
		margin: 0;
		letter-spacing: -0.5px;
	}

	.welcome-subtitle {
		font-size: 13px;
		color: var(--text-secondary);
		margin: 0;
	}

	.welcome-version {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		color: var(--text-ghost);
	}

	.welcome-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
		margin-top: 24px;
	}

	.connection-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		width: 160px;
		height: 100px;
		border: 1px solid var(--border-default);
		border-radius: 6px;
		background: var(--bg-surface);
		cursor: pointer;
		transition: border-color 0.15s;
	}

	.connection-card:hover {
		border-color: var(--border-focus);
	}

	.connection-card-header {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.connection-card-name {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.new-connection-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		width: 160px;
		height: 100px;
		border: 1.5px dashed var(--border-default);
		border-radius: 6px;
		background: transparent;
		cursor: pointer;
		color: var(--text-secondary);
		transition: border-color 0.15s, color 0.15s;
	}

	.new-connection-card:hover {
		border-color: var(--border-focus);
		color: var(--text-primary);
	}

	.new-connection-plus {
		font-size: 24px;
		line-height: 1;
		color: var(--text-ghost);
	}

	.new-connection-label {
		font-size: 12px;
	}

	.welcome-shortcuts {
		display: flex;
		flex-direction: column;
		gap: 6px;
		margin-top: 32px;
	}

	.shortcut-row {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: var(--text-ghost);
	}

	kbd {
		font-family: 'Geist Mono', monospace;
		font-size: 11px;
		padding: 2px 6px;
		border: 1px solid var(--border-default);
		border-radius: 3px;
		background-color: var(--bg-panel);
		color: var(--text-secondary);
		min-width: 52px;
		text-align: center;
	}
</style>
