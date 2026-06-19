import { writable, derived, get } from 'svelte/store';

export type TabType = 'data-browser' | 'sql-editor' | 'schema-inspector';

export interface Tab {
	id: string;
	type: TabType;
	title: string;
	connectionId: string;
	params: Record<string, string>;
	closable: boolean;
}

const STORAGE_KEY = 'blueprint:tabs';
const ACTIVE_TAB_KEY = 'blueprint:activeTab';

export const tabs = writable<Tab[]>([]);
export const activeTabId = writable<string | null>(null);
export const activeTab = derived([tabs, activeTabId], ([$tabs, $id]) =>
	$tabs.find((t) => t.id === $id) ?? null
);

export function openTab(tab: Omit<Tab, 'id'>): string {
	const id = crypto.randomUUID();
	tabs.update((t) => [...t, { ...tab, id }]);
	activeTabId.set(id);
	persistTabs();
	return id;
}

export function closeTab(tabId: string): void {
	tabs.update((t) => {
		const idx = t.findIndex((x) => x.id === tabId);
		const filtered = t.filter((x) => x.id !== tabId);
		if (get(activeTabId) === tabId) {
			const newActive = filtered[Math.min(idx, filtered.length - 1)]?.id ?? null;
			activeTabId.set(newActive);
		}
		return filtered;
	});
	persistTabs();
}

export function closeOtherTabs(tabId: string): void {
	tabs.update((t) => t.filter((x) => x.id === tabId));
	activeTabId.set(tabId);
	persistTabs();
}

export function closeAllTabs(): void {
	tabs.set([]);
	activeTabId.set(null);
	persistTabs();
}

export function reorderTabs(fromIndex: number, toIndex: number): void {
	tabs.update((t) => {
		const updated = [...t];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(toIndex, 0, moved);
		return updated;
	});
	persistTabs();
}

export function setActiveTab(tabId: string): void {
	activeTabId.set(tabId);
	persistTabs();
}

function persistTabs(): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(get(tabs)));
		sessionStorage.setItem(ACTIVE_TAB_KEY, get(activeTabId) ?? '');
	} catch {
		// sessionStorage full or unavailable — silently ignore
	}
}

export function restoreTabs(): void {
	if (typeof sessionStorage === 'undefined') return;
	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		const storedActive = sessionStorage.getItem(ACTIVE_TAB_KEY);
		if (stored) {
			const parsed: Tab[] = JSON.parse(stored);
			tabs.set(parsed);
			activeTabId.set(storedActive || (parsed[0]?.id ?? null));
		}
	} catch {
		// Corrupt data — start fresh
	}
}
