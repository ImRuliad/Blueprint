<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { refreshConnections } from '$lib/stores/connections';
	import type { EngineType } from '$lib/server/drivers/types';

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
	}

	let { open = $bindable(false), onOpenChange }: Props = $props();

	let engine = $state<EngineType | null>(null);
	let name = $state('');
	let host = $state('');
	let port = $state('');
	let database = $state('');
	let username = $state('');
	let sqlitePath = $state('');
	let connectionString = $state('');
	let groupName = $state('');
	let color = $state('#60a5fa');
	let testResult = $state<{ ok: boolean; error?: string; latencyMs?: number } | null>(null);
	let saving = $state(false);
	let testing = $state(false);

	const engines: { type: EngineType; label: string; badge: string; cls: string; defaultPort: string }[] = [
		{ type: 'postgresql', label: 'PostgreSQL', badge: 'PG', cls: 'engine-badge--pg', defaultPort: '5432' },
		{ type: 'mysql', label: 'MySQL', badge: 'MY', cls: 'engine-badge--my', defaultPort: '3306' },
		{ type: 'sqlite', label: 'SQLite', badge: 'SQ', cls: 'engine-badge--sq', defaultPort: '' },
		{ type: 'mongodb', label: 'MongoDB', badge: 'MG', cls: 'engine-badge--mg', defaultPort: '' },
	];

	function selectEngine(e: EngineType) {
		engine = e;
		testResult = null;
		const info = engines.find((x) => x.type === e);
		if (info?.defaultPort) port = info.defaultPort;
	}

	function resetForm() {
		engine = null;
		name = '';
		host = '';
		port = '';
		database = '';
		username = '';
		sqlitePath = '';
		connectionString = '';
		groupName = '';
		color = '#60a5fa';
		testResult = null;
		saving = false;
		testing = false;
	}

	function handleOpenChange(v: boolean) {
		if (!v) resetForm();
		open = v;
		onOpenChange?.(v);
	}

	function buildBody() {
		return {
			name,
			engine,
			host: host || null,
			port: port ? Number(port) : null,
			database: database || null,
			username: username || null,
			sqlitePath: sqlitePath || null,
			connectionString: connectionString || null,
			groupName: groupName || null,
			color: color || null,
		};
	}

	async function testConnection() {
		if (!engine) return;
		testing = true;
		testResult = null;
		try {
			// First save temporarily to get an ID, then test
			const saveRes = await fetch('/api/connections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildBody()),
			});
			if (!saveRes.ok) {
				const err = await saveRes.json();
				testResult = { ok: false, error: err.error?.message ?? 'Failed to save connection' };
				return;
			}
			const { data: saved } = await saveRes.json();

			const res = await fetch('/api/connect', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ connectionId: saved.id, testOnly: true }),
			});
			const result = await res.json();
			testResult = res.ok ? result.data : { ok: false, error: result.error?.message ?? 'Test failed' };

			// Clean up temp connection
			await fetch(`/api/connections/${saved.id}`, { method: 'DELETE' });
		} catch (err) {
			testResult = { ok: false, error: err instanceof Error ? err.message : 'Test failed' };
		} finally {
			testing = false;
		}
	}

	async function save() {
		if (!engine || !name) return;
		saving = true;
		try {
			const res = await fetch('/api/connections', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(buildBody()),
			});
			if (res.ok) {
				await refreshConnections();
				handleOpenChange(false);
			}
		} finally {
			saving = false;
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title>New Connection</Dialog.Title>
			<Dialog.Description>Configure a database connection</Dialog.Description>
		</Dialog.Header>

		{#if !engine}
			<div class="engine-grid">
				{#each engines as e}
					<button class="engine-card" onclick={() => selectEngine(e.type)}>
						<span class="engine-badge {e.cls}" style="font-size: 12px; padding: 2px 6px;">{e.badge}</span>
						<span class="engine-card-label">{e.label}</span>
					</button>
				{/each}
			</div>
		{:else}
			<div class="form-fields">
				<div class="form-row">
					<label class="form-label" for="conn-name">Name</label>
					<Input id="conn-name" bind:value={name} placeholder="My Database" />
				</div>

				{#if engine === 'postgresql' || engine === 'mysql'}
					<div class="form-row-pair">
						<div class="form-row" style="flex: 2;">
							<label class="form-label" for="conn-host">Host</label>
							<Input id="conn-host" bind:value={host} placeholder="localhost" />
						</div>
						<div class="form-row" style="flex: 1;">
							<label class="form-label" for="conn-port">Port</label>
							<Input id="conn-port" bind:value={port} type="number" />
						</div>
					</div>
					<div class="form-row">
						<label class="form-label" for="conn-database">Database</label>
						<Input id="conn-database" bind:value={database} placeholder="mydb" />
					</div>
					<div class="form-row">
						<label class="form-label" for="conn-user">Username</label>
						<Input id="conn-user" bind:value={username} placeholder="postgres" />
					</div>
				{:else if engine === 'sqlite'}
					<div class="form-row">
						<label class="form-label" for="conn-path">File Path</label>
						<Input id="conn-path" bind:value={sqlitePath} placeholder="/path/to/database.db" />
					</div>
				{:else if engine === 'mongodb'}
					<div class="form-row">
						<label class="form-label" for="conn-uri">Connection String</label>
						<Input id="conn-uri" bind:value={connectionString} placeholder="mongodb://localhost:27017" />
					</div>
					<div class="form-row">
						<label class="form-label" for="conn-database-mg">Database</label>
						<Input id="conn-database-mg" bind:value={database} placeholder="mydb" />
					</div>
				{/if}

				<div class="form-row-pair">
					<div class="form-row" style="flex: 2;">
						<label class="form-label" for="conn-group">Group</label>
						<Input id="conn-group" bind:value={groupName} placeholder="Production" />
					</div>
					<div class="form-row" style="flex: 1;">
						<label class="form-label" for="conn-color">Color</label>
						<input id="conn-color" type="color" bind:value={color} class="color-input" />
					</div>
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
				<Button variant="outline" size="sm" onclick={() => { engine = null; }} disabled={saving || testing}>
					Back
				</Button>
				<Button variant="outline" size="sm" onclick={testConnection} disabled={saving || testing || !name}>
					{testing ? 'Testing...' : 'Test Connection'}
				</Button>
				<Button size="sm" onclick={save} disabled={saving || !name}>
					{saving ? 'Saving...' : 'Save'}
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.engine-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		padding: 8px 0;
	}

	.engine-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 16px 12px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;
		transition: border-color 0.15s, background-color 0.15s;
	}

	.engine-card:hover {
		border-color: var(--border-focus);
		background-color: var(--bg-hover);
	}

	.engine-card-label {
		font-size: 12px;
		color: var(--text-secondary);
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0;
	}

	.form-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.form-row-pair {
		display: flex;
		gap: 8px;
	}

	.form-label {
		font-size: 11px;
		font-weight: 500;
		color: var(--text-muted);
	}

	.color-input {
		width: 100%;
		height: 36px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: transparent;
		cursor: pointer;
		padding: 2px;
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
