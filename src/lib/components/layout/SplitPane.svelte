<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		initialRatio?: number;
		storageKey?: string;
		top: Snippet;
		bottom: Snippet;
	}

	let { initialRatio = 0.6, storageKey = 'blueprint:splitRatio', top, bottom }: Props = $props();

	let containerHeight = $state(0);
	let ratio = $state(loadRatio());
	let dragging = $state(false);
	let containerEl: HTMLDivElement | undefined = $state();

	function loadRatio(): number {
		if (typeof sessionStorage === 'undefined') return initialRatio;
		try {
			const stored = sessionStorage.getItem(storageKey);
			if (stored) {
				const val = parseFloat(stored);
				if (val > 0.1 && val < 0.9) return val;
			}
		} catch {
			// ignore
		}
		return initialRatio;
	}

	function saveRatio() {
		if (typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.setItem(storageKey, String(ratio));
		} catch {
			// ignore
		}
	}

	function handleMouseDown(e: MouseEvent) {
		e.preventDefault();
		dragging = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!dragging || !containerEl) return;
		const rect = containerEl.getBoundingClientRect();
		const newRatio = (e.clientY - rect.top) / rect.height;
		ratio = Math.max(0.1, Math.min(0.9, newRatio));
	}

	function handleMouseUp() {
		if (dragging) {
			dragging = false;
			saveRatio();
		}
	}
</script>

<svelte:window onmousemove={handleMouseMove} onmouseup={handleMouseUp} />

<div
	class="split-container"
	class:split-container--dragging={dragging}
	bind:this={containerEl}
	bind:clientHeight={containerHeight}
>
	<div class="split-top" style="height: {ratio * 100}%;">
		{@render top()}
	</div>
	<div
		class="split-handle"
		role="separator"
		aria-orientation="horizontal"
		onmousedown={handleMouseDown}
	>
		<div class="split-handle-line"></div>
	</div>
	<div class="split-bottom" style="height: {(1 - ratio) * 100}%;">
		{@render bottom()}
	</div>
</div>

<style>
	.split-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.split-container--dragging {
		cursor: row-resize;
		user-select: none;
	}

	.split-top,
	.split-bottom {
		overflow: auto;
	}

	.split-handle {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 5px;
		flex-shrink: 0;
		cursor: row-resize;
		background-color: var(--bg-root);
	}

	.split-handle:hover .split-handle-line,
	.split-container--dragging .split-handle-line {
		background-color: var(--accent-blue);
	}

	.split-handle-line {
		width: 32px;
		height: 2px;
		border-radius: 1px;
		background-color: var(--border, #27272a);
		transition: background-color 0.15s;
	}
</style>
