<script lang="ts">
	import { tabs, activeTabId, openTab, closeTab, setActiveTab, reorderTabs } from '$lib/stores/tabs';
	import TabContextMenu from './TabContextMenu.svelte';

	let contextMenu = $state<{ x: number; y: number; tabId: string } | null>(null);
	let dragFromIndex = $state<number | null>(null);
	let dragOverIndex = $state<number | null>(null);

	function handleNewTab() {
		openTab({
			type: 'sql-editor',
			title: 'New Query',
			connectionId: '',
			params: {},
			closable: true
		});
	}

	function handleContextMenu(e: MouseEvent, tabId: string) {
		e.preventDefault();
		contextMenu = { x: e.clientX, y: e.clientY, tabId };
	}

	function handleCloseContextMenu() {
		contextMenu = null;
	}

	function handleDragStart(e: DragEvent, index: number) {
		dragFromIndex = index;
		if (e.dataTransfer) {
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', String(index));
		}
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (e.dataTransfer) {
			e.dataTransfer.dropEffect = 'move';
		}
		dragOverIndex = index;
	}

	function handleDrop(e: DragEvent, toIndex: number) {
		e.preventDefault();
		if (dragFromIndex !== null && dragFromIndex !== toIndex) {
			reorderTabs(dragFromIndex, toIndex);
		}
		dragFromIndex = null;
		dragOverIndex = null;
	}

	function handleDragEnd() {
		dragFromIndex = null;
		dragOverIndex = null;
	}

	function handleTabClose(e: MouseEvent, tabId: string) {
		e.stopPropagation();
		closeTab(tabId);
	}
</script>

<div class="tab-bar-inner" role="tablist">
	{#if $tabs.length === 0}
		<span class="tab-bar-empty">No tabs open</span>
	{:else}
		{#each $tabs as tab, index (tab.id)}
			<div
				class="tab"
				class:tab--active={$activeTabId === tab.id}
				class:tab--drag-over={dragOverIndex === index && dragFromIndex !== index}
				role="tab"
				tabindex="0"
				aria-selected={$activeTabId === tab.id}
				draggable="true"
				onclick={() => setActiveTab(tab.id)}
				onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveTab(tab.id); }}
				oncontextmenu={(e) => handleContextMenu(e, tab.id)}
				ondragstart={(e) => handleDragStart(e, index)}
				ondragover={(e) => handleDragOver(e, index)}
				ondrop={(e) => handleDrop(e, index)}
				ondragend={handleDragEnd}
			>
				<span class="tab-title">{tab.title}</span>
				{#if tab.closable}
					<button
						class="tab-close"
						aria-label="Close tab"
						onclick={(e) => handleTabClose(e, tab.id)}
					>
						&times;
					</button>
				{/if}
			</div>
		{/each}
	{/if}
	<button class="tab-new" aria-label="New tab" onclick={handleNewTab}>
		+
	</button>
</div>

{#if contextMenu}
	<TabContextMenu
		x={contextMenu.x}
		y={contextMenu.y}
		tabId={contextMenu.tabId}
		onclose={handleCloseContextMenu}
	/>
{/if}

<style>
	.tab-bar-inner {
		display: flex;
		align-items: stretch;
		height: 100%;
		gap: 0;
		overflow-x: auto;
		overflow-y: hidden;
		scrollbar-width: none;
	}

	.tab-bar-inner::-webkit-scrollbar {
		display: none;
	}

	.tab-bar-empty {
		display: flex;
		align-items: center;
		padding: 0 12px;
		font-size: 11px;
		color: var(--text-ghost);
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 0 10px;
		height: 100%;
		border: none;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--text-dim);
		font-size: 11px;
		font-family: inherit;
		cursor: pointer;
		white-space: nowrap;
		flex-shrink: 0;
		transition: color 0.1s, border-color 0.1s;
	}

	.tab:hover {
		color: var(--text-secondary);
	}

	.tab--active {
		color: var(--text-primary);
		border-bottom-color: var(--text-primary);
	}

	.tab--drag-over {
		border-left: 2px solid var(--accent-blue);
	}

	.tab-title {
		max-width: 140px;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tab-close {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 16px;
		height: 16px;
		border: none;
		border-radius: 2px;
		background: none;
		color: var(--text-ghost);
		font-size: 14px;
		line-height: 1;
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.1s, background-color 0.1s, color 0.1s;
	}

	.tab:hover .tab-close {
		opacity: 1;
	}

	.tab-close:hover {
		background-color: var(--bg-hover);
		color: var(--text-secondary);
	}

	.tab-new {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 100%;
		border: none;
		background: none;
		color: var(--text-ghost);
		font-size: 16px;
		cursor: pointer;
		flex-shrink: 0;
		transition: color 0.1s;
	}

	.tab-new:hover {
		color: var(--text-secondary);
	}
</style>
