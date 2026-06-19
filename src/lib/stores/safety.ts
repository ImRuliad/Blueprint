import { writable, derived, get } from 'svelte/store';

export const safeModeEnabled = writable(true);
export const sessionBypassed = writable<Set<string>>(new Set());

export function isSafeModeActive(connectionId: string): boolean {
	if (!get(safeModeEnabled)) return false;
	return !get(sessionBypassed).has(connectionId);
}

export function bypassForSession(connectionId: string): void {
	sessionBypassed.update((s) => {
		const next = new Set(s);
		next.add(connectionId);
		return next;
	});
}
