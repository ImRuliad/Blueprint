<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import type { TLSMode } from '$lib/server/tls/config';

	interface Props {
		mode: TLSMode;
		caCertPath: string;
		clientCertPath: string;
		clientKeyPath: string;
		serverName: string;
		certExpiryStatus?: 'ok' | 'expiring-soon' | 'expired' | 'unreadable' | null;
		certExpiresAt?: Date | null;
	}

	let {
		mode = $bindable<TLSMode>('disable'),
		caCertPath = $bindable(''),
		clientCertPath = $bindable(''),
		clientKeyPath = $bindable(''),
		serverName = $bindable(''),
		certExpiryStatus = null,
		certExpiresAt = null,
	}: Props = $props();

	const modeOptions: { value: TLSMode; label: string; description: string }[] = [
		{ value: 'disable', label: 'Disable', description: 'No TLS encryption' },
		{ value: 'prefer', label: 'Prefer', description: 'Use TLS if available, fallback to plaintext' },
		{ value: 'require', label: 'Require', description: 'Require TLS, skip certificate verification' },
		{ value: 'verify-ca', label: 'Verify CA', description: 'Require TLS and verify server certificate against CA' },
		{ value: 'verify-full', label: 'Verify Full', description: 'Require TLS, verify CA and server hostname' },
	];

	const showCerts = $derived(mode === 'verify-ca' || mode === 'verify-full');
	const showServerName = $derived(mode === 'verify-full');
	const showMutualTLS = $derived(mode === 'verify-ca' || mode === 'verify-full');
</script>

<div class="tls-section">
	<div class="tls-header">
		<span class="tls-badge">TLS</span>
		<span class="tls-title">TLS / SSL</span>
	</div>

	<div class="form-row">
		<label class="form-label" for="tls-mode">Mode</label>
		<select id="tls-mode" class="tls-select" bind:value={mode}>
			{#each modeOptions as opt}
				<option value={opt.value}>{opt.label} — {opt.description}</option>
			{/each}
		</select>
	</div>

	{#if showCerts}
		<div class="form-row">
			<label class="form-label" for="tls-ca">CA Certificate Path</label>
			<div class="path-row">
				<Input id="tls-ca" bind:value={caCertPath} placeholder="/path/to/ca.pem" />
			</div>
			{#if caCertPath && certExpiryStatus && certExpiryStatus !== 'ok' && certExpiryStatus !== 'unreadable'}
				<div class="cert-expiry-badge cert-expiry-badge--{certExpiryStatus}">
					{#if certExpiryStatus === 'expired'}
						Certificate expired{certExpiresAt ? ` ${certExpiresAt.toLocaleDateString()}` : ''}
					{:else if certExpiryStatus === 'expiring-soon'}
						Expires soon{certExpiresAt ? ` (${certExpiresAt.toLocaleDateString()})` : ''}
					{/if}
				</div>
			{/if}
		</div>

		{#if showServerName}
			<div class="form-row">
				<label class="form-label" for="tls-server-name">Server Name (SNI)</label>
				<Input id="tls-server-name" bind:value={serverName} placeholder="db.example.com" />
			</div>
		{/if}

		{#if showMutualTLS}
			<div class="tls-mutual-section">
				<span class="form-label tls-mutual-label">Client Certificate (mutual TLS)</span>
				<div class="form-row">
					<label class="form-label" for="tls-cert">Client Certificate Path</label>
					<Input id="tls-cert" bind:value={clientCertPath} placeholder="/path/to/client.crt" />
				</div>
				<div class="form-row">
					<label class="form-label" for="tls-key">Client Key Path</label>
					<Input id="tls-key" bind:value={clientKeyPath} placeholder="/path/to/client.key" />
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.tls-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 10px 0 0;
		border-top: 1px solid var(--border-default);
	}

	.tls-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tls-badge {
		display: inline-flex;
		align-items: center;
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		font-size: 10px;
		font-weight: 600;
		letter-spacing: 0.04em;
		background-color: rgba(139, 92, 246, 0.15);
		color: #a78bfa;
		border: 1px solid rgba(139, 92, 246, 0.3);
	}

	.tls-title {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.form-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.tls-select {
		width: 100%;
		height: 36px;
		padding: 0 8px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: var(--bg-input, transparent);
		color: var(--text-primary);
		font-size: 12px;
		cursor: pointer;
		outline: none;
	}

	.tls-select:focus {
		border-color: var(--border-focus);
	}

	.path-row {
		display: flex;
		gap: 6px;
	}

	.tls-mutual-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 8px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
	}

	.tls-mutual-label {
		color: var(--text-secondary);
		margin-bottom: 2px;
	}

	.cert-expiry-badge {
		display: inline-flex;
		align-items: center;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		font-size: 11px;
		font-weight: 500;
	}

	.cert-expiry-badge--expiring-soon {
		background-color: rgba(245, 158, 11, 0.12);
		color: #f59e0b;
		border: 1px solid rgba(245, 158, 11, 0.3);
	}

	.cert-expiry-badge--expired {
		background-color: rgba(239, 68, 68, 0.12);
		color: #ef4444;
		border: 1px solid rgba(239, 68, 68, 0.3);
	}
</style>
