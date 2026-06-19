<script lang="ts">
	import { closeTab, closeOtherTabs, closeAllTabs, openTab, tabs, type Tab } from '$lib/stores/tabs';
	import { get } from 'svelte/store';

	interface Props {
		x: number;
		y: number;
		tabId: string;
		onclose: () => void;
	}

	let { x, y, tabId, onclose }: Props = $props();

	function handleClose() {
		closeTab(tabId);
		onclose();
	}

	function handleCloseOthers() {
		closeOtherTabs(tabId);
		onclose();
	}

	function handleCloseAll() {
		closeAllTabs();
		onclose();
	}

	function handleDuplicate() {
		const allTabs = get(tabs);
		const source = allTabs.find((t: Tab) => t.id === tabId);
		if (source) {
			openTab({
				type: source.type,
				title: source.title,
				connectionId: source.connectionId,
				params: { ...source.params },
				closable: source.closable
			});
		}
		onclose();
	}

	function handleBackdropClick() {
		onclose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onclose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
<div class="context-backdrop" onclick={handleBackdropClick} oncontextmenu={(e) => { e.preventDefault(); handleBackdropClick(); }}></div>

<div class="context-menu" style="left: {x}px; top: {y}px;" role="menu">
	<button class="context-item" role="menuitem" onclick={handleClose}>Close</button>
	<button class="context-item" role="menuitem" onclick={handleCloseOthers}>Close Others</button>
	<button class="context-item" role="menuitem" onclick={handleCloseAll}>Close All</button>
	<div class="context-separator"></div>
	<button class="context-item" role="menuitem" onclick={handleDuplicate}>Duplicate</button>
</div>

<style>
	.context-backdrop {
		position: fixed;
		inset: 0;
		z-index: 99;
	}

	.context-menu {
		position: fixed;
		z-index: 100;
		min-width: 160px;
		padding: 4px 0;
		background-color: var(--bg-elevated);
		border: 1px solid var(--border, #27272a);
		border-radius: var(--radius-md, 6px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
	}

	.context-item {
		display: block;
		width: 100%;
		padding: 6px 12px;
		border: none;
		background: none;
		color: var(--text-secondary);
		font-size: 12px;
		font-family: inherit;
		text-align: left;
		cursor: pointer;
		transition: background-color 0.1s;
	}

	.context-item:hover {
		background-color: var(--bg-hover);
		color: var(--text-primary);
	}

	.context-separator {
		height: 1px;
		margin: 4px 0;
		background-color: var(--border, #27272a);
	}
</style>
