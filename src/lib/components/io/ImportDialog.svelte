<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		open: boolean;
		onOpenChange?: (open: boolean) => void;
		connectionId: string;
	}

	let { open = $bindable(false), onOpenChange, connectionId }: Props = $props();

	type ImportState = 'idle' | 'running' | 'done' | 'error';

	let importState = $state<ImportState>('idle');
	let dragOver = $state(false);
	let selectedFile = $state<File | null>(null);
	let stopOnError = $state(false);
	let showPreview = $state(false);
	let previewText = $state('');
	let errorMessage = $state('');
	let result = $state<{
		ok: boolean;
		total: number;
		executed: number;
		failed: number;
		errors: Array<{ statement: string; message: string }>;
	} | null>(null);

	function handleOpenChange(v: boolean) {
		if (!v) resetState();
		open = v;
		onOpenChange?.(v);
	}

	function resetState() {
		importState = 'idle';
		dragOver = false;
		selectedFile = null;
		stopOnError = false;
		showPreview = false;
		previewText = '';
		errorMessage = '';
		result = null;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragOver = true;
	}

	function handleDragLeave() {
		dragOver = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const file = e.dataTransfer?.files[0];
		if (file) selectFile(file);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (file) selectFile(file);
	}

	async function selectFile(file: File) {
		selectedFile = file;
		showPreview = false;
		previewText = '';

		// Read first 2 KB for preview
		const text = await file.text();
		previewText = text.slice(0, 2048);
	}

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	async function startImport() {
		if (!selectedFile) return;
		importState = 'running';
		errorMessage = '';
		result = null;

		try {
			const formData = new FormData();
			formData.set('connectionId', connectionId);
			formData.set('file', selectedFile);
			formData.set('stopOnError', String(stopOnError));

			const res = await fetch('/api/import', {
				method: 'POST',
				body: formData,
			});

			const body = await res.json();

			if (!res.ok && res.status !== 422) {
				throw new Error(body.error?.message ?? 'Import failed');
			}

			result = body.data;
			importState = result?.ok ? 'done' : 'error';
		} catch (err) {
			importState = 'error';
			errorMessage = err instanceof Error ? err.message : 'Import failed';
		}
	}
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[520px]">
		<Dialog.Header>
			<Dialog.Title>Import SQL</Dialog.Title>
			<Dialog.Description>Upload a .sql file to execute in a transaction</Dialog.Description>
		</Dialog.Header>

		{#if importState === 'idle' || importState === 'error'}
			<div class="import-body">
				<!-- Drop zone -->
				{#if !selectedFile}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="drop-zone {dragOver ? 'drop-zone--active' : ''}"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
					>
						<span class="drop-icon">⬆</span>
						<span class="drop-label">Drop a .sql file here</span>
						<span class="drop-or">or</span>
						<label class="browse-label">
							Browse
							<input
								type="file"
								accept=".sql"
								class="file-input-hidden"
								onchange={handleFileInput}
							/>
						</label>
					</div>
				{:else}
					<!-- File info card -->
					<div class="file-card">
						<div class="file-card-info">
							<span class="file-icon">📄</span>
							<div class="file-meta">
								<span class="file-name">{selectedFile.name}</span>
								<span class="file-size">{formatSize(selectedFile.size)}</span>
							</div>
						</div>
						<button class="file-remove" onclick={() => { selectedFile = null; previewText = ''; }}>✕</button>
					</div>

					<!-- SQL preview -->
					{#if previewText}
						<div class="preview-section">
							<button class="preview-toggle" onclick={() => { showPreview = !showPreview; }}>
								{showPreview ? '▾' : '▸'} SQL Preview
							</button>
							{#if showPreview}
								<div class="preview-container">
									<pre class="preview-code">{previewText}{previewText.length >= 2048 ? '\n… (truncated)' : ''}</pre>
									<div class="preview-fade"></div>
								</div>
							{/if}
						</div>
					{/if}

					<!-- Options -->
					<div class="options-section">
						<label class="option-row">
							<input type="checkbox" bind:checked={stopOnError} />
							<span>Stop on first error (rollback immediately)</span>
						</label>
					</div>

					{#if importState === 'error' && errorMessage}
						<div class="status-banner status-banner--error">{errorMessage}</div>
					{/if}

					{#if importState === 'error' && result && result.errors.length > 0}
						<div class="error-list">
							<div class="error-list-title">Statement errors ({result.errors.length})</div>
							{#each result.errors.slice(0, 5) as err}
								<div class="error-item">
									<code class="error-stmt">{err.statement.slice(0, 80)}{err.statement.length > 80 ? '…' : ''}</code>
									<span class="error-msg">{err.message}</span>
								</div>
							{/each}
							{#if result.errors.length > 5}
								<span class="error-more">…and {result.errors.length - 5} more</span>
							{/if}
						</div>
					{/if}
				{/if}
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={() => handleOpenChange(false)}>Cancel</Button>
				{#if selectedFile}
					<Button size="sm" onclick={startImport} disabled={!selectedFile}>
						{importState === 'error' ? 'Retry Import' : 'Import'}
					</Button>
				{/if}
			</Dialog.Footer>
		{:else if importState === 'running'}
			<div class="import-progress">
				<div class="progress-label">Executing statements…</div>
				<div class="progress-bar-track">
					<div class="progress-bar-fill progress-bar-fill--indeterminate"></div>
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" disabled>Running…</Button>
			</Dialog.Footer>
		{:else if importState === 'done'}
			<div class="import-result">
				<div class="status-banner status-banner--ok">
					Import complete — {result?.executed} of {result?.total} statements executed
				</div>
			</div>

			<Dialog.Footer>
				<Button variant="outline" size="sm" onclick={resetState}>Import Another</Button>
				<Button size="sm" onclick={() => handleOpenChange(false)}>Done</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<style>
	.import-body {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	/* Drop zone */
	.drop-zone {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 32px 20px;
		border: 2px dashed var(--border-default);
		border-radius: var(--radius-md);
		background: var(--bg-panel);
		transition: border-color 0.12s, background-color 0.12s;
		cursor: default;
	}

	.drop-zone--active {
		border-color: var(--accent-blue);
		background-color: rgba(96, 165, 250, 0.06);
	}

	.drop-icon {
		font-size: 24px;
		color: var(--text-ghost);
	}

	.drop-label {
		font-size: 13px;
		color: var(--text-secondary);
	}

	.drop-or {
		font-size: 12px;
		color: var(--text-ghost);
	}

	.browse-label {
		font-size: 12px;
		padding: 4px 12px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		color: var(--text-secondary);
		background: var(--bg-surface);
		cursor: pointer;
		transition: border-color 0.12s;
	}

	.browse-label:hover {
		border-color: var(--border-focus);
		color: var(--text-primary);
	}

	.file-input-hidden {
		display: none;
	}

	/* File info card */
	.file-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 10px 12px;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.file-card-info {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.file-icon {
		font-size: 18px;
	}

	.file-meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.file-name {
		font-size: 13px;
		font-weight: 500;
		color: var(--text-primary);
		font-family: 'Geist Mono', monospace;
	}

	.file-size {
		font-size: 11px;
		color: var(--text-muted);
	}

	.file-remove {
		font-size: 12px;
		color: var(--text-ghost);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		transition: color 0.12s, background-color 0.12s;
	}

	.file-remove:hover {
		color: var(--accent-red);
		background-color: rgba(239, 68, 68, 0.08);
	}

	/* SQL preview */
	.preview-section {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.preview-toggle {
		font-size: 12px;
		color: var(--text-muted);
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
		transition: color 0.12s;
	}

	.preview-toggle:hover {
		color: var(--text-secondary);
	}

	.preview-container {
		position: relative;
		max-height: 140px;
		overflow: hidden;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-sm);
	}

	.preview-code {
		margin: 0;
		padding: 10px 12px;
		font-size: 11px;
		font-family: 'Geist Mono', monospace;
		color: var(--text-secondary);
		background: var(--bg-panel);
		white-space: pre-wrap;
		word-break: break-all;
		overflow: hidden;
		line-height: 1.5;
	}

	.preview-fade {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 40px;
		background: linear-gradient(transparent, var(--bg-panel));
		pointer-events: none;
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

	/* Progress */
	.import-progress {
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding: 4px 0;
	}

	.progress-label {
		font-size: 12px;
		color: var(--text-secondary);
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
	}

	.progress-bar-fill--indeterminate {
		width: 40%;
		animation: indeterminate 1.4s ease-in-out infinite;
	}

	@keyframes indeterminate {
		0%   { transform: translateX(-100%); }
		100% { transform: translateX(300%); }
	}

	/* Import result */
	.import-result {
		padding: 4px 0;
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

	/* Error list */
	.error-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 10px 12px;
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--radius-sm);
		background: rgba(239, 68, 68, 0.04);
	}

	.error-list-title {
		font-size: 11px;
		font-weight: 600;
		color: var(--accent-red);
		margin-bottom: 2px;
	}

	.error-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.error-stmt {
		font-size: 10px;
		font-family: 'Geist Mono', monospace;
		color: var(--text-muted);
		white-space: pre-wrap;
		word-break: break-all;
	}

	.error-msg {
		font-size: 11px;
		color: var(--accent-red);
	}

	.error-more {
		font-size: 11px;
		color: var(--text-ghost);
		margin-top: 2px;
	}
</style>
