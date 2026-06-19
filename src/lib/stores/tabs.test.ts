import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	tabs,
	activeTabId,
	activeTab,
	openTab,
	closeTab,
	closeOtherTabs,
	closeAllTabs,
	reorderTabs,
	setActiveTab,
	restoreTabs,
	type Tab
} from './tabs';

// Mock sessionStorage
const storage = new Map<string, string>();
const mockSessionStorage = {
	getItem: vi.fn((key: string) => storage.get(key) ?? null),
	setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
	removeItem: vi.fn((key: string) => storage.delete(key)),
	clear: vi.fn(() => storage.clear()),
	get length() {
		return storage.size;
	},
	key: vi.fn(() => null)
};

vi.stubGlobal('sessionStorage', mockSessionStorage);

function makeTab(overrides: Partial<Omit<Tab, 'id'>> = {}): Omit<Tab, 'id'> {
	return {
		type: 'data-browser',
		title: 'Test Tab',
		connectionId: 'conn-1',
		params: {},
		closable: true,
		...overrides
	};
}

describe('tab store', () => {
	beforeEach(() => {
		tabs.set([]);
		activeTabId.set(null);
		storage.clear();
		vi.clearAllMocks();
	});

	describe('openTab', () => {
		it('adds a tab and sets it active', () => {
			const id = openTab(makeTab({ title: 'Tab 1' }));
			const allTabs = get(tabs);
			expect(allTabs).toHaveLength(1);
			expect(allTabs[0].id).toBe(id);
			expect(allTabs[0].title).toBe('Tab 1');
			expect(get(activeTabId)).toBe(id);
		});

		it('appends new tabs to the end', () => {
			openTab(makeTab({ title: 'First' }));
			openTab(makeTab({ title: 'Second' }));
			const allTabs = get(tabs);
			expect(allTabs).toHaveLength(2);
			expect(allTabs[0].title).toBe('First');
			expect(allTabs[1].title).toBe('Second');
		});

		it('sets the newest tab as active', () => {
			openTab(makeTab({ title: 'First' }));
			const secondId = openTab(makeTab({ title: 'Second' }));
			expect(get(activeTabId)).toBe(secondId);
		});
	});

	describe('closeTab', () => {
		it('removes the specified tab', () => {
			const id = openTab(makeTab({ title: 'Tab 1' }));
			closeTab(id);
			expect(get(tabs)).toHaveLength(0);
		});

		it('activates the next tab when closing the active tab', () => {
			const id1 = openTab(makeTab({ title: 'Tab 1' }));
			const id2 = openTab(makeTab({ title: 'Tab 2' }));
			openTab(makeTab({ title: 'Tab 3' }));
			setActiveTab(id1);
			closeTab(id1);
			expect(get(activeTabId)).toBe(id2);
		});

		it('activates the previous tab when closing the last tab in list', () => {
			const id1 = openTab(makeTab({ title: 'Tab 1' }));
			const id2 = openTab(makeTab({ title: 'Tab 2' }));
			setActiveTab(id2);
			closeTab(id2);
			expect(get(activeTabId)).toBe(id1);
		});

		it('sets active to null when closing the only tab', () => {
			const id = openTab(makeTab({ title: 'Only' }));
			closeTab(id);
			expect(get(activeTabId)).toBeNull();
		});
	});

	describe('closeOtherTabs', () => {
		it('keeps only the specified tab', () => {
			openTab(makeTab({ title: 'Tab 1' }));
			const id2 = openTab(makeTab({ title: 'Tab 2' }));
			openTab(makeTab({ title: 'Tab 3' }));
			closeOtherTabs(id2);
			const allTabs = get(tabs);
			expect(allTabs).toHaveLength(1);
			expect(allTabs[0].id).toBe(id2);
			expect(get(activeTabId)).toBe(id2);
		});
	});

	describe('closeAllTabs', () => {
		it('removes all tabs and sets active to null', () => {
			openTab(makeTab({ title: 'Tab 1' }));
			openTab(makeTab({ title: 'Tab 2' }));
			closeAllTabs();
			expect(get(tabs)).toHaveLength(0);
			expect(get(activeTabId)).toBeNull();
		});
	});

	describe('reorderTabs', () => {
		it('moves a tab from one index to another', () => {
			openTab(makeTab({ title: 'A' }));
			openTab(makeTab({ title: 'B' }));
			openTab(makeTab({ title: 'C' }));
			reorderTabs(0, 2);
			const titles = get(tabs).map((t) => t.title);
			expect(titles).toEqual(['B', 'C', 'A']);
		});

		it('moves a tab backward', () => {
			openTab(makeTab({ title: 'A' }));
			openTab(makeTab({ title: 'B' }));
			openTab(makeTab({ title: 'C' }));
			reorderTabs(2, 0);
			const titles = get(tabs).map((t) => t.title);
			expect(titles).toEqual(['C', 'A', 'B']);
		});
	});

	describe('activeTab derived store', () => {
		it('returns the active tab object', () => {
			openTab(makeTab({ title: 'Active' }));
			const active = get(activeTab);
			expect(active?.title).toBe('Active');
		});

		it('returns null when no tabs exist', () => {
			expect(get(activeTab)).toBeNull();
		});
	});

	describe('sessionStorage persistence', () => {
		it('persists tabs to sessionStorage on open', () => {
			openTab(makeTab({ title: 'Persisted' }));
			expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
				'blueprint:tabs',
				expect.any(String)
			);
		});

		it('round-trips tabs through sessionStorage', () => {
			const id1 = openTab(makeTab({ title: 'Tab 1' }));
			openTab(makeTab({ title: 'Tab 2' }));
			setActiveTab(id1);

			// Reset stores to simulate page reload
			tabs.set([]);
			activeTabId.set(null);

			restoreTabs();
			const restored = get(tabs);
			expect(restored).toHaveLength(2);
			expect(restored[0].title).toBe('Tab 1');
			expect(restored[1].title).toBe('Tab 2');
			expect(get(activeTabId)).toBe(id1);
		});

		it('handles empty sessionStorage gracefully', () => {
			storage.clear();
			restoreTabs();
			expect(get(tabs)).toHaveLength(0);
			expect(get(activeTabId)).toBeNull();
		});
	});
});
