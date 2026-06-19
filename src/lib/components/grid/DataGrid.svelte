<script lang="ts">
	import type { ColumnDescriptor } from '$lib/server/drivers/types';

	interface Props {
		columns?: ColumnDescriptor[];
		rows?: Record<string, unknown>[];
		sortColumn?: string | null;
		sortDir?: 'ASC' | 'DESC';
		loading?: boolean;
		onSort?: (column: string) => void;
	}

	let {
		columns = [],
		rows = [],
		sortColumn = null,
		sortDir = 'ASC',
		loading = false,
		onSort,
	}: Props = $props();

	// Column resize state
	let columnWidths = $state<Record<string, number>>({});
	let resizing = $state<{ col: string; startX: number; startWidth: number } | null>(null);

	function getCellValue(value: unknown): string {
		if (value === null || value === undefined) return 'NULL';
		if (typeof value === 'boolean') return value ? 'true' : 'false';
		if (typeof value === 'object') {
			try {
				const s = JSON.stringify(value);
				return s.length > 120 ? s.slice(0, 117) + '…' : s;
			} catch {
				return String(value);
			}
		}
		if (value instanceof Date) {
			return value.toISOString();
		}
		return String(value);
	}

	function getCellClass(col: ColumnDescriptor, value: unknown): string {
		const classes: string[] = ['grid-td'];
		if (value === null || value === undefined) {
			classes.push('grid-td--null');
		} else if (typeof value === 'boolean') {
			classes.push(value ? 'grid-td--true' : 'grid-td--false');
		} else if (typeof value === 'object') {
			classes.push('grid-td--json');
		}
		if (col.isPrimaryKey) {
			classes.push('grid-td--pk');
		}
		return classes.join(' ');
	}

	function getThClass(col: ColumnDescriptor): string {
		const classes: string[] = ['grid-th'];
		if (col.isPrimaryKey) classes.push('grid-th--pk');
		if (sortColumn === col.name) classes.push('grid-th--sorted');
		return classes.join(' ');
	}

	function handleSort(col: ColumnDescriptor) {
		onSort?.(col.name);
	}

	function getColWidth(col: ColumnDescriptor): string {
		const w = columnWidths[col.name];
		return w != null ? `${w}px` : 'auto';
	}

	function startResize(e: MouseEvent, colName: string) {
		e.preventDefault();
		const currentWidth = columnWidths[colName] ?? 120;
		resizing = { col: colName, startX: e.clientX, startWidth: currentWidth };

		function onMove(ev: MouseEvent) {
			if (!resizing) return;
			const delta = ev.clientX - resizing.startX;
			const newWidth = Math.max(40, resizing.startWidth + delta);
			columnWidths = { ...columnWidths, [resizing.col]: newWidth };
		}

		function onUp() {
			resizing = null;
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}

		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}
</script>

<div class="grid-container" data-testid="data-grid">
	{#if loading}
		<div class="grid-state">
			<span class="grid-state-text">Loading…</span>
		</div>
	{:else if columns.length === 0}
		<div class="grid-state">
			<span class="grid-state-text">No data</span>
		</div>
	{:else}
		<div class="grid-scroll">
			<table class="grid-table">
				<thead>
					<tr>
						<th class="grid-th grid-th--rownum">#</th>
						{#each columns as col}
							<th
								class={getThClass(col)}
								style="width: {getColWidth(col)}; min-width: 60px"
								title="{col.dataType}{col.nullable ? ' · nullable' : ''}"
							>
								<button class="grid-th-btn" onclick={() => handleSort(col)}>
									<span class="grid-th-name">{col.name}</span>
									{#if sortColumn === col.name}
										<span class="grid-th-arrow" aria-label={sortDir === 'ASC' ? 'ascending' : 'descending'}>
											{sortDir === 'ASC' ? '↑' : '↓'}
										</span>
									{/if}
								</button>
								<div
									class="grid-th-resizer"
									role="separator"
									aria-label="resize column"
									onmousedown={(e) => startResize(e, col.name)}
								></div>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows as row, i}
						<tr class="grid-tr">
							<td class="grid-td grid-td--rownum">{i + 1}</td>
							{#each columns as col}
								<td class={getCellClass(col, row[col.name])}>
									{#if row[col.name] === null || row[col.name] === undefined}
										<span class="value-null">NULL</span>
									{:else if typeof row[col.name] === 'boolean'}
										<span class={row[col.name] ? 'value-bool-true' : 'value-bool-false'}>
											{getCellValue(row[col.name])}
										</span>
									{:else}
										{getCellValue(row[col.name])}
									{/if}
								</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.grid-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
		background: var(--bg-surface);
		position: relative;
	}

	.grid-state {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
	}

	.grid-state-text {
		font-size: 12px;
		color: var(--text-muted);
	}

	.grid-scroll {
		overflow: auto;
		flex: 1;
	}

	.grid-table {
		width: max-content;
		min-width: 100%;
		border-collapse: collapse;
		font-family: 'Geist Mono', ui-monospace, monospace;
		font-size: 11px;
	}

	.grid-th {
		position: sticky;
		top: 0;
		z-index: 2;
		background: var(--bg-muted);
		border-bottom: 1px solid var(--border-subtle);
		border-right: 1px solid var(--border-subtle);
		height: var(--row-height);
		padding: 0;
		text-align: left;
		white-space: nowrap;
		user-select: none;
		box-sizing: border-box;
	}

	.grid-th--pk {
		border-left: 2px solid var(--accent-amber);
	}

	.grid-th--sorted .grid-th-name {
		color: var(--text-secondary);
	}

	.grid-th--rownum {
		min-width: 40px;
		width: 40px;
		text-align: right;
		color: var(--text-ghost);
		font-size: 10px;
		padding: 0 6px;
	}

	.grid-th-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 0 8px;
		height: var(--row-height);
		width: 100%;
		background: none;
		border: none;
		cursor: pointer;
		color: var(--text-muted);
		font-family: inherit;
		font-size: 10px;
		font-weight: 600;
		text-align: left;
	}

	.grid-th-btn:hover {
		color: var(--text-secondary);
	}

	.grid-th-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.grid-th-arrow {
		color: var(--text-secondary);
		font-size: 10px;
		flex-shrink: 0;
	}

	.grid-th-resizer {
		position: absolute;
		right: 0;
		top: 0;
		bottom: 0;
		width: 4px;
		cursor: col-resize;
		background: transparent;
	}

	.grid-th-resizer:hover {
		background: var(--border);
	}

	.grid-tr:hover {
		background: var(--bg-hover);
	}

	.grid-td {
		height: var(--row-height);
		padding: 0 8px;
		border-bottom: 1px solid var(--border-subtle);
		border-right: 1px solid var(--border-subtle);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 400px;
		color: var(--text-primary);
		box-sizing: border-box;
	}

	.grid-td--rownum {
		color: var(--text-ghost);
		text-align: right;
		font-size: 10px;
		user-select: none;
		min-width: 40px;
		width: 40px;
	}

	.grid-td--pk {
		border-left: 2px solid var(--accent-amber);
	}

	.grid-td--null {
		color: var(--text-ghost);
	}

	.grid-td--true,
	.grid-td--false {
		font-weight: 500;
	}

	.value-null {
		color: var(--text-ghost);
		font-style: italic;
	}

	.value-bool-true {
		color: var(--accent-green);
	}

	.value-bool-false {
		color: var(--accent-red);
	}
</style>
