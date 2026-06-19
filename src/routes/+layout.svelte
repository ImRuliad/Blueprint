<script lang="ts">
	import '@fontsource/geist-sans/400.css';
	import '@fontsource/geist-sans/500.css';
	import '@fontsource/geist-sans/600.css';
	import '@fontsource/geist-mono/400.css';
	import '@fontsource/geist-mono/500.css';
	import '@fontsource/geist-mono/600.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import ConnectionSidebar from '$lib/components/connection/ConnectionSidebar.svelte';
	import ConnectionForm from '$lib/components/connection/ConnectionForm.svelte';
	import PasswordDialog from '$lib/components/connection/PasswordDialog.svelte';
	import { refreshConnections } from '$lib/stores/connections';
	import type { ConnectionWithStatus } from '$lib/stores/connections';
	import TabBar from '$lib/components/layout/TabBar.svelte';
	import { restoreTabs } from '$lib/stores/tabs';
	import { handleKeyboardShortcut } from '$lib/utils/keyboard';
	import { onMount } from 'svelte';

	let { children } = $props();

	let connectionFormOpen = $state(false);
	let passwordDialogOpen = $state(false);
	let selectedConnection = $state<ConnectionWithStatus | null>(null);

	onMount(() => {
		refreshConnections();
		restoreTabs();
	});

	function handleNewConnection() {
		connectionFormOpen = true;
	}

	function handleSelectConnection(conn: ConnectionWithStatus) {
		if (conn.connected) {
			return;
		}
		selectedConnection = conn;
		passwordDialogOpen = true;
	}
</script>

<svelte:window onkeydown={handleKeyboardShortcut} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<aside class="sidebar">
		<ConnectionSidebar
			onNewConnection={handleNewConnection}
			onSelectConnection={handleSelectConnection}
		/>
	</aside>

	<main class="content">
		<div class="tab-bar">
			<TabBar />
		</div>
		<div class="page-content">
			{@render children()}
		</div>
		<div class="status-bar">
			<span class="text-data-cell" style="color: var(--text-ghost);">Ready</span>
		</div>
	</main>
</div>

<ConnectionForm bind:open={connectionFormOpen} />
<PasswordDialog bind:open={passwordDialogOpen} connection={selectedConnection} />

<style>
	.app-shell {
		display: grid;
		grid-template-columns: 220px 1fr;
		height: 100vh;
		overflow: hidden;
		background-color: var(--bg-root);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		background-color: var(--bg-sidebar);
		border-right: 1px solid var(--border-default);
		overflow: hidden;
	}

	.content {
		display: grid;
		grid-template-rows: 32px 1fr 24px;
		overflow: hidden;
	}

	.tab-bar {
		background-color: var(--bg-panel);
		border-bottom: 1px solid var(--border-default);
	}

	.page-content {
		overflow: auto;
	}

	.status-bar {
		display: flex;
		align-items: center;
		padding: 0 12px;
		background-color: var(--bg-panel);
		border-top: 1px solid var(--border-default);
	}
</style>
