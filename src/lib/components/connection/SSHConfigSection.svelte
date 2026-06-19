<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { onMount } from 'svelte';

	interface SSHConfig {
		enabled: boolean;
		host: string;
		port: string;
		username: string;
		authMethod: 'privateKey' | 'agent' | 'password';
		privateKeyPath: string;
		password: string;
	}

	interface Props {
		value: SSHConfig;
		onchange?: (config: SSHConfig) => void;
	}

	let { value = $bindable(), onchange }: Props = $props();

	let availableKeys = $state<{ name: string; path: string }[]>([]);
	let loadingKeys = $state(false);

	onMount(async () => {
		if (value.authMethod === 'privateKey') {
			await fetchKeys();
		}
	});

	async function fetchKeys() {
		loadingKeys = true;
		try {
			const res = await fetch('/api/ssh/keys');
			if (res.ok) {
				const { data } = await res.json();
				availableKeys = data;
			}
		} catch {
			// silently ignore — user can type path manually
		} finally {
			loadingKeys = false;
		}
	}

	function update(patch: Partial<SSHConfig>) {
		value = { ...value, ...patch };
		onchange?.(value);
	}

	async function handleAuthMethodChange(method: SSHConfig['authMethod']) {
		update({ authMethod: method });
		if (method === 'privateKey' && availableKeys.length === 0) {
			await fetchKeys();
		}
	}

	const authMethods: { value: SSHConfig['authMethod']; label: string }[] = [
		{ value: 'privateKey', label: 'Private Key' },
		{ value: 'agent', label: 'SSH Agent' },
		{ value: 'password', label: 'Password' },
	];
</script>

<div class="ssh-section">
	<div class="ssh-toggle-row">
		<label class="ssh-toggle-label" for="ssh-enable">
			<span class="form-label">SSH Tunnel</span>
		</label>
		<button
			id="ssh-enable"
			class="toggle {value.enabled ? 'toggle--on' : 'toggle--off'}"
			onclick={() => update({ enabled: !value.enabled })}
			type="button"
			aria-pressed={value.enabled}
		>
			<span class="toggle-thumb"></span>
		</button>
	</div>

	{#if value.enabled}
		<div class="ssh-fields">
			<div class="form-row-pair">
				<div class="form-row" style="flex: 2;">
					<label class="form-label" for="ssh-host">SSH Host</label>
					<Input
						id="ssh-host"
						value={value.host}
						oninput={(e) => update({ host: (e.target as HTMLInputElement).value })}
						placeholder="bastion.example.com"
					/>
				</div>
				<div class="form-row" style="flex: 1;">
					<label class="form-label" for="ssh-port">Port</label>
					<Input
						id="ssh-port"
						type="number"
						value={value.port}
						oninput={(e) => update({ port: (e.target as HTMLInputElement).value })}
						placeholder="22"
					/>
				</div>
			</div>

			<div class="form-row">
				<label class="form-label" for="ssh-user">Username</label>
				<Input
					id="ssh-user"
					value={value.username}
					oninput={(e) => update({ username: (e.target as HTMLInputElement).value })}
					placeholder="ubuntu"
				/>
			</div>

			<div class="form-row">
				<label class="form-label" for="ssh-auth">Auth Method</label>
				<div class="auth-tabs" id="ssh-auth">
					{#each authMethods as method}
						<button
							class="auth-tab {value.authMethod === method.value ? 'auth-tab--active' : ''}"
							onclick={() => handleAuthMethodChange(method.value)}
							type="button"
						>
							{method.label}
						</button>
					{/each}
				</div>
			</div>

			{#if value.authMethod === 'privateKey'}
				<div class="form-row">
					<label class="form-label" for="ssh-key-path">Private Key</label>
					{#if availableKeys.length > 0}
						<div class="key-select-row">
							<Input
								id="ssh-key-path"
								value={value.privateKeyPath}
								oninput={(e) => update({ privateKeyPath: (e.target as HTMLInputElement).value })}
								placeholder="~/.ssh/id_ed25519"
							/>
							<div class="key-dropdown-wrapper">
								<select
									class="key-select"
									onchange={(e) => {
										const path = (e.target as HTMLSelectElement).value;
										if (path) update({ privateKeyPath: path });
									}}
									aria-label="Select key file"
								>
									<option value="">Browse...</option>
									{#each availableKeys as key}
										<option value={key.path}>{key.name}</option>
									{/each}
								</select>
							</div>
						</div>
					{:else}
						<Input
							id="ssh-key-path"
							value={value.privateKeyPath}
							oninput={(e) => update({ privateKeyPath: (e.target as HTMLInputElement).value })}
							placeholder="~/.ssh/id_ed25519"
						/>
					{/if}
				</div>
			{:else if value.authMethod === 'password'}
				<div class="form-row">
					<label class="form-label" for="ssh-password">SSH Password</label>
					<Input
						id="ssh-password"
						type="password"
						value={value.password}
						oninput={(e) => update({ password: (e.target as HTMLInputElement).value })}
						placeholder="SSH password"
					/>
				</div>
			{:else if value.authMethod === 'agent'}
				<p class="agent-note">
					Connections will use your SSH agent (<code>SSH_AUTH_SOCK</code>).
				</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.ssh-section {
		display: flex;
		flex-direction: column;
		gap: 10px;
		border-top: 1px solid var(--border-default);
		padding-top: 10px;
		margin-top: 4px;
	}

	.ssh-toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.ssh-toggle-label {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.ssh-fields {
		display: flex;
		flex-direction: column;
		gap: 10px;
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

	/* Toggle switch */
	.toggle {
		position: relative;
		width: 36px;
		height: 20px;
		border-radius: 10px;
		border: none;
		cursor: pointer;
		transition: background-color 0.2s;
		flex-shrink: 0;
	}

	.toggle--on {
		background-color: var(--accent-blue, #3b82f6);
	}

	.toggle--off {
		background-color: var(--border-default);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		transition: left 0.2s;
	}

	.toggle--on .toggle-thumb {
		left: 18px;
	}

	.toggle--off .toggle-thumb {
		left: 2px;
	}

	/* Auth method tabs */
	.auth-tabs {
		display: flex;
		gap: 2px;
		background-color: var(--bg-subtle, rgba(0, 0, 0, 0.05));
		border-radius: var(--radius-sm);
		padding: 2px;
	}

	.auth-tab {
		flex: 1;
		padding: 4px 8px;
		font-size: 11px;
		border: none;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s;
		white-space: nowrap;
	}

	.auth-tab--active {
		background-color: var(--bg-elevated, white);
		color: var(--text-primary);
		font-weight: 500;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	/* Key file browse */
	.key-select-row {
		display: flex;
		gap: 6px;
	}

	.key-select-row :global(input) {
		flex: 1;
	}

	.key-dropdown-wrapper {
		flex-shrink: 0;
	}

	.key-select {
		height: 36px;
		padding: 0 8px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: var(--bg-elevated, white);
		color: var(--text-primary);
		font-size: 12px;
		cursor: pointer;
	}

	.agent-note {
		font-size: 12px;
		color: var(--text-muted);
		margin: 0;
	}

	.agent-note code {
		font-family: var(--font-mono, monospace);
		font-size: 11px;
		background: var(--bg-subtle);
		padding: 1px 4px;
		border-radius: 3px;
	}
</style>
