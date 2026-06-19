<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { refreshConnections } from '$lib/stores/connections';
	import type { ConnectionWithStatus } from '$lib/stores/connections';

	interface Props {
		open: boolean;
		connection: ConnectionWithStatus | null;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), connection, onOpenChange }: Props = $props();

	let password = $state('');
	let connecting = $state(false);
	let testing = $state(false);
	let testResult = $state<{ ok: boolean; error?: string; latencyMs?: number } | null>(null);

	function reset() {
		password = '';
		connecting = false;
		testing = false;
		testResult = null;
	}

	function handleOpenChange(v: boolean) {
		if (!v) reset();
		open = v;
		onOpenChange?.(v);
	}

	async function testConnection() {
		if (!connection) return;
		testing = true;
		testResult = null;
		try {
			const res = await fetch('/api/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					connectionId: connection.id,
					password: password || undefined,
					testOnly: true,
				}),
			});
			const result = await res.json();
			testResult = res.ok ? result.data : { ok: false, error: result.error?.message ?? 'Test failed' };
		} catch (err) {
			testResult = { ok: false, error: err instanceof Error ? err.message : 'Test failed' };
		} finally {
			testing = false;
		}
	}

	async function connect() {
		if (!connection) return;
		connecting = true;
		try {
			const res = await fetch('/api/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					connectionId: connection.id,
					password: password || undefined,
				}),
			});
			if (res.ok) {
				await refreshConnections();
				handleOpenChange(false);
			} else {
				const result = await res.json();
				testResult = { ok: false, error: result.error?.message ?? 'Connection failed' };
			}
		} catch (err) {
			testResult = { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
		} finally {
			connecting = false;
		}
	}

	function engineLabel(engine: string): string {
		switch (engine) {
			case 'postgresql': return 'PostgreSQL';
			case 'mysql': return 'MySQL';
			case 'sqlite': return 'SQLite';
			case 'mongodb': return 'MongoDB';
			default: return engine;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[400px]">
		<Dialog.Header>
			<Dialog.Title>Connect</Dialog.Title>
			<Dialog.Description>
				{#if connection}
					{connection.name} ({engineLabel(connection.engine)})
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		{#if connection}
			<div class="pw-fields">
				{#if connection.host}
					<div class="pw-info-row">
						<span class="pw-info-label">Host</span>
						<span class="pw-info-value">{connection.host}:{connection.port}</span>
					</div>
				{/if}
				{#if connection.database}
					<div class="pw-info-row">
						<span class="pw-info-label">Database</span>
						<span class="pw-info-value">{connection.database}</span>
					</div>
				{/if}

				{#if connection.engine === 'postgresql' || connection.engine === 'mysql'}
					<div class="pw-field">
						<label class="pw-label" for="pw-input">Password</label>
						<Input id="pw-input" type="password" bind:value={password} placeholder="Enter password" />
					</div>
				{/if}

				<div class="pw-warning">
					Passwords are never stored.
				</div>

				{#if testResult}
					<div class="test-result {testResult.ok ? 'test-ok' : 'test-err'}">
						{#if testResult.ok}
							Connected ({testResult.latencyMs?.toFixed(0)}ms)
						{:else}
							{testResult.error}
						{/if}
					</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={testConnection} disabled={connecting || testing}>
					{testing ? 'Testing...' : 'Test'}
				</Button>
				<Button variant="outline" size="sm" onclick={() => handleOpenChange(false)} disabled={connecting}>
					Cancel
				</Button>
				<Button size="sm" onclick={connect} disabled={connecting}>
					{connecting ? 'Connecting...' : 'Connect'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.pw-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0;
	}

	.pw-info-row {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
	}

	.pw-info-label {
		color: var(--text-muted);
	}

	.pw-info-value {
		color: var(--text-secondary);
		font-family: 'Geist Mono', ui-monospace, monospace;
	}

	.pw-field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.pw-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.pw-warning {
		font-size: 11px;
		color: var(--text-ghost);
		font-style: italic;
	}

	.test-result {
		font-size: 12px;
		padding: 6px 8px;
		border-radius: var(--radius-sm);
	}

	.test-ok {
		color: var(--accent-green);
		background-color: rgba(34, 197, 94, 0.08);
	}

	.test-err {
		color: var(--accent-red);
		background-color: rgba(239, 68, 68, 0.08);
	}
</style>
