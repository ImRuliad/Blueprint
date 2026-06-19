<script lang="ts">
	let { visible = true }: { visible?: boolean } = $props();
</script>

{#if visible}
	<div class="safe-banner">
		<span class="safe-banner-icon">🛡</span>
		<span class="safe-banner-text">Safe Mode</span>
		<span class="safe-banner-label">— destructive query protection is active</span>
	</div>
{/if}

<style>
	.safe-banner {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 5px 12px;
		background: rgba(239, 68, 68, 0.06);
		border-bottom: 1px solid rgba(239, 68, 68, 0.15);
		font-size: 11px;
	}
	.safe-banner-icon { font-size: 14px; }
	.safe-banner-text { color: var(--accent-red); font-weight: 500; }
	.safe-banner-label { color: var(--text-dim); }
</style>
