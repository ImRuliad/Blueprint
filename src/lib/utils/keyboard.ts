import { get } from 'svelte/store';
import { tabs, activeTabId, openTab, closeTab, setActiveTab } from '$lib/stores/tabs';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

export function handleKeyboardShortcut(e: KeyboardEvent): void {
	const mod = isMac ? e.metaKey : e.ctrlKey;

	// Cmd+Option+N / Ctrl+Alt+N — new query tab
	if (mod && e.altKey && e.key === 'n') {
		e.preventDefault();
		openTab({
			type: 'sql-editor',
			title: 'New Query',
			connectionId: '',
			params: {},
			closable: true
		});
		return;
	}

	// Cmd+Shift+W / Alt+W — close current tab
	if ((isMac && mod && e.shiftKey && e.key === 'w') || (!isMac && e.altKey && e.key === 'w')) {
		e.preventDefault();
		const current = get(activeTabId);
		if (current) closeTab(current);
		return;
	}

	// Cmd+Option+Right / Ctrl+PageDown — next tab
	if (
		(isMac && mod && e.altKey && e.key === 'ArrowRight') ||
		(!isMac && e.ctrlKey && e.key === 'PageDown')
	) {
		e.preventDefault();
		navigateTab(1);
		return;
	}

	// Cmd+Option+Left / Ctrl+PageUp — previous tab
	if (
		(isMac && mod && e.altKey && e.key === 'ArrowLeft') ||
		(!isMac && e.ctrlKey && e.key === 'PageUp')
	) {
		e.preventDefault();
		navigateTab(-1);
		return;
	}
}

function navigateTab(direction: number): void {
	const allTabs = get(tabs);
	if (allTabs.length === 0) return;
	const currentId = get(activeTabId);
	const currentIndex = allTabs.findIndex((t) => t.id === currentId);
	const nextIndex = (currentIndex + direction + allTabs.length) % allTabs.length;
	setActiveTab(allTabs[nextIndex].id);
}
