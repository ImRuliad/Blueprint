<script lang="ts">
	interface Props {
		value?: string;
		onConfirm?: (newValue: string) => void;
		onCancel?: () => void;
	}

	let {
		value = '',
		onConfirm,
		onCancel,
	}: Props = $props();

	let inputValue = $state(value);
	let inputEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		inputEl?.focus();
		inputEl?.select();
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			onCancel?.();
		} else if (e.key === 'Enter' || e.key === 'Tab') {
			e.preventDefault();
			onConfirm?.(inputValue);
		}
	}

	function handleBlur() {
		onConfirm?.(inputValue);
	}
</script>

<input
	bind:this={inputEl}
	class="cell-editor"
	type="text"
	bind:value={inputValue}
	onkeydown={handleKeydown}
	onblur={handleBlur}
	data-testid="cell-editor"
/>

<style>
	.cell-editor {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		padding: 0 8px;
		margin: 0;
		border: 2px solid var(--accent-blue);
		border-radius: 0;
		background: var(--bg-surface);
		color: var(--text-primary);
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
		outline: none;
		box-sizing: border-box;
		z-index: 5;
	}
</style>
