<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		connectionId: string;
		tableName: string;
	}

	let { open = $bindable(false), onOpenChange, connectionId, tableName }: Props = $props();

	type ExportFormat = 'csv' | 'sql' | 'ndjson';

	interface FormatCard {
		id: ExportFormat;
		label: string;
		description: string;
		ext: string;
	}

	const formats: FormatCard[] = [
		{ id: 'csv', label: 'CSV', description: 'Spreadsheet-compatible, RFC 4180', ext: '.csv' },
		{ id: 'sql', label: 'SQL', description: 'INSERT statements + CREATE TABLE', ext: '.sql' },
		{ id: 'ndjson', label: 'NDJSON', description: 'One JSON doc per line (MongoDB)', ext: '.ndjson' },
	];

	let selectedFormat = $state<ExportFormat>('csv');
	let includeDdl = $state(true);
	let dropIfExists = $state(false);
	let includeHeader = $state(true);
	let nullValue = $state('');

	type ExportState = 'idle' | 'running' | 'done' | 'error' | 'cancelled';
	let exportState = $state<ExportState>('idle');
	let bytesReceived = $state(0);
	let errorMessage = $state('');
	let abortController = $state<AbortController | null>(null);

	function handleOpenChange(v: boolean) {
		if (!v) resetState();
		open = v;
		onOpenChange?.(v);
	}

	function resetState() {
		exportState = 'idle';
		bytesReceived = 0;
		errorMessage = '';
		abortController = null;
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function startExport() {
		exportState = 'running';
		bytesReceived = 0;
		errorMessage = '';
		abortController = new AbortController();

		try {
			const body: Record<string, unknown> = {
				connectionId,
				tableName,
				format: selectedFormat,
				options: {} as Record<string, unknown>,
			};

			const opts = body.options as Record<string, unknown>;
			if (selectedFormat === 'csv') {
				opts.includeHeader = includeHeader;
				opts.nullValue = nullValue;
			} else if (selectedFormat === 'sql') {
				opts.includeDdl = includeDdl;
				opts.dropIfExists = dropIfExists;
			}

			const res = await fetch('/api/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
				signal: abortController.signal,
			});

			if (!res.ok || !res.body) {
				const errBody = await res.json().catch(() => ({ error: { message: 'Export failed' } }));
				throw new Error(errBody.error?.message ?? 'Export failed');
			}

			// Stream the response body to a download
			const reader = res.body.getReader();
			const chunks: Uint8Array[] = [];

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				chunks.push(value);
				bytesReceived += value.byteLength;
			}

			// Trigger browser download
			const blob = new Blob(chunks, { type: res.headers.get('content-type') ?? 'application/octet-stream' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${tableName}-export.${selectedFormat === 'ndjson' ? 'ndjson' : selectedFormat}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);

			exportState = 'done';
		} catch (err) {
			if (err instanceof Error && err.name === 'AbortError') {
				exportState = 'cancelled';
			} else {
				exportState = 'error';
				errorMessage = err instanceof Error ? err.message : 'Export failed';
			}
		}
	}

	function cancelExport() {
		abortController?.abort();
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[500px]">
		<Dialog.Header>
			<Dialog.Title>Export — {tableName}</Dialog.Title>
			<Dialog.Description>Choose a format and download table data</Dialog.Description>
		</Dialog.Header>

		{#if exportState === 'idle' || exportState === 'error' || exportState === 'cancelled'}
			<div class="export-body">
				<!-- Format cards -->
				<div class="format-grid">
					{#each formats as fmt}
						<button
							class="format-card {selectedFormat === fmt.id ? 'format-card--active' : ''}"
							onclick={() => { selectedFormat = fmt.id; }}
						>
							<span class="format-label">{fmt.label}</span>
							<span class="format-ext">{fmt.ext}</span>
							<span class="format-desc">{fmt.description}</span>
						</button>
					{/each}
				</div>

				<!-- Per-format options -->
				{#if selectedFormat === 'csv'}
					<div class="options-section">
						<label class="option-row">
							<input type="checkbox" bind:checked={includeHeader} />
							<span>Include header row</span>
						</label>
						<div class="option-field">
							<span class="option-label">NULL representation</span>
							<input
								class="option-input"
								type="text"
								bind:value={nullValue}
								placeholder="(empty)"
							/>
						</div>
					</div>
				{:else if selectedFormat === 'sql'}
					<div class="options-section">
						<label class="option-row">
							<input type="checkbox" bind:checked={includeDdl} />
							<span>Include CREATE TABLE</span>
						</label>
						{#if includeDdl}
							<label class="option-row option-row--indent">
								<input type="checkbox" bind:checked={dropIfExists} />
								<span>DROP TABLE IF EXISTS first</span>
							</label>
						{/if}
					</div>
				{/if}

				{#if exportState === 'error'}
					<div class="status-banner status-banner--error">{errorMessage}</div>
				{/if}
				{#if exportState === 'cancelled'}
					<div class="status-banner status-banner--warn">Export cancelled</div>
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={() => handleOpenChange(false)}>Cancel</Button>
				<Button size="sm" onclick={startExport}>Export</Button>
			</Dialog.Footer>
		{:else if exportState === 'running'}
			<div class="export-progress">
				<div class="progress-label">
					<span>Downloading…</span>
					<span class="progress-bytes">{formatBytes(bytesReceived)}</span>
				</div>
				<div class="progress-bar-track">
					<div class="progress-bar-fill progress-bar-fill--indeterminate"></div>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="destructive" size="sm" onclick={cancelExport}>Cancel</Button>
			</Dialog.Footer>
		{:else if exportState === 'done'}
			<div class="export-progress">
				<div class="status-banner status-banner--ok">
					Export complete — {formatBytes(bytesReceived)} downloaded
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={() => { resetState(); }}>Export Again</Button>
				<Button size="sm" onclick={() => handleOpenChange(false)}>Done</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.export-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Format cards */
	.format-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
	}

	.format-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 14px 10px;
		border: 1.5px solid var(--border-default);
		border-radius: var(--radius-md);
		background: transparent;
		cursor: pointer;
		transition: border-color 0.12s, background-color 0.12s;
		text-align: center;
	}

	.format-card:hover {
		border-color: var(--border-focus);
		background-color: var(--bg-hover);
	}

	.format-card--active {
		border-color: var(--accent-blue);
		background-color: rgba(96, 165, 250, 0.06);
	}

	.format-label {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-primary);
		font-family: 'Geist Mono', monospace;
	}

	.format-ext {
		font-size: 11px;
		color: var(--text-ghost);
		font-family: 'Geist Mono', monospace;
	}

	.format-desc {
		font-size: 11px;
		color: var(--text-muted);
		margin-top: 2px;
	}

	/* Options */
	.options-section {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.option-row {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--text-secondary);
		cursor: pointer;
		user-select: none;
	}

	.option-row--indent {
		padding-left: 16px;
	}

	.option-field {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.option-label {
		font-size: 12px;
		color: var(--text-muted);
		white-space: nowrap;
	}

	.option-input {
		flex: 1;
		height: 28px;
		padding: 0 8px;
		font-size: 12px;
		background: var(--bg-input);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		color: var(--text-primary);
		outline: none;
	}

	.option-input:focus {
		border-color: var(--border-focus);
	}

	/* Progress */
	.export-progress {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0;
	}

	.progress-label {
		display: flex;
		justify-content: space-between;
		font-size: 12px;
		color: var(--text-secondary);
	}

	.progress-bytes {
		font-family: 'Geist Mono', monospace;
		color: var(--text-muted);
	}

	.progress-bar-track {
		height: 6px;
		background: var(--bg-panel);
		border-radius: 3px;
		overflow: hidden;
		border: 1px solid var(--border-default);
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--accent-green);
		border-radius: 3px;
		transition: width 0.2s ease;
	}

	.progress-bar-fill--indeterminate {
		width: 40%;
		animation: indeterminate 1.4s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0%   { transform: translateX(-100%); }
		100% { transform: translateX(300%); }
	}

	/* Status banners */
	.status-banner {
		padding: 8px 10px;
		border-radius: var(--radius-sm);
		font-size: 12px;
	}

	.status-banner--ok {
		color: var(--accent-green);
		background-color: rgba(34, 197, 94, 0.08);
	}

	.status-banner--error {
		color: var(--accent-red);
		background-color: rgba(239, 68, 68, 0.08);
	}

	.status-banner--warn {
		color: var(--text-muted);
		background-color: var(--bg-panel);
	}
</style>
