<script lang="ts">
	import '@fontsource/geist-sans/400.css';
	import '@fontsource/geist-sans/500.css';
	import '@fontsource/geist-sans/600.css';
	import '@fontsource/geist-mono/400.css';
	import '@fontsource/geist-mono/500.css';
	import '@fontsource/geist-mono/600.css';
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<aside class="sidebar">
		<div class="sidebar-header">
			<span class="text-logo">Blueprint</span>
		</div>
		<div class="sidebar-search">
			<input type="text" placeholder="Search connections..." class="search-input" />
		</div>
		<div class="sidebar-section">
			<span class="text-section-label">Connections</span>
		</div>
		<div class="sidebar-empty">
			<span style="color: var(--text-ghost); font-size: 11px;">No connections yet</span>
		</div>
	</aside>

	<main class="content">
		<div class="tab-bar"></div>
		<div class="page-content">
			{@render children()}
		</div>
		<div class="status-bar">
			<span class="text-data-cell" style="color: var(--text-ghost);">Ready</span>
		</div>
	</main>
</div>

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
		padding: 8px 12px 4px;
		flex-shrink: 0;
	}

	.sidebar-empty {
		padding: 8px 12px;
		flex-shrink: 0;
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
