import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { SSHError } from '$lib/server/errors';

const BLUEPRINT_DIR = join(homedir(), '.blueprint');
const KNOWN_HOSTS_PATH = join(BLUEPRINT_DIR, 'known_hosts');

export interface HostKeyResult {
	status: 'trusted' | 'new' | 'mismatch';
	fingerprint: string;
	storedFingerprint?: string;
}

function ensureBlueprintDir(): void {
	if (!existsSync(BLUEPRINT_DIR)) {
		mkdirSync(BLUEPRINT_DIR, { recursive: true, mode: 0o700 });
	}
}

function loadKnownHosts(): Map<string, string> {
	const map = new Map<string, string>();
	if (!existsSync(KNOWN_HOSTS_PATH)) return map;

	const content = readFileSync(KNOWN_HOSTS_PATH, 'utf-8');
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const spaceIdx = trimmed.indexOf(' ');
		if (spaceIdx === -1) continue;
		const hostKey = trimmed.slice(0, spaceIdx);
		const fingerprint = trimmed.slice(spaceIdx + 1);
		map.set(hostKey, fingerprint);
	}
	return map;
}

function saveKnownHosts(map: Map<string, string>): void {
	ensureBlueprintDir();
	const lines = ['# Blueprint known hosts — managed automatically', ''];
	for (const [hostKey, fingerprint] of map) {
		lines.push(`${hostKey} ${fingerprint}`);
	}
	writeFileSync(KNOWN_HOSTS_PATH, lines.join('\n') + '\n', { mode: 0o600 });
}

export function computeFingerprint(keyData: Buffer): string {
	const hash = createHash('sha256').update(keyData).digest('base64');
	return `SHA256:${hash.replace(/=+$/, '')}`;
}

export function hostKey(host: string, port: number): string {
	return port === 22 ? host : `[${host}]:${port}`;
}

/**
 * Verify a host key against the known hosts store (TOFU).
 * Returns:
 *   - 'trusted'  — host matches stored fingerprint
 *   - 'new'      — host not seen before; fingerprint returned for user confirmation
 *   - 'mismatch' — host seen but fingerprint differs (possible MITM)
 */
export function verifyHostKey(
	host: string,
	port: number,
	keyData: Buffer
): HostKeyResult {
	const key = hostKey(host, port);
	const fingerprint = computeFingerprint(keyData);
	const map = loadKnownHosts();
	const stored = map.get(key);

	if (!stored) {
		return { status: 'new', fingerprint };
	}

	if (stored === fingerprint) {
		return { status: 'trusted', fingerprint };
	}

	return { status: 'mismatch', fingerprint, storedFingerprint: stored };
}

/**
 * Persist a trusted host fingerprint (called after user confirms a new host).
 */
export function trustHostKey(host: string, port: number, keyData: Buffer): void {
	const key = hostKey(host, port);
	const fingerprint = computeFingerprint(keyData);
	const map = loadKnownHosts();
	map.set(key, fingerprint);
	saveKnownHosts(map);
}

/**
 * Remove a host from the known hosts store.
 */
export function removeHostKey(host: string, port: number): void {
	const key = hostKey(host, port);
	const map = loadKnownHosts();
	if (map.has(key)) {
		map.delete(key);
		saveKnownHosts(map);
	}
}

/**
 * Verify host key during SSH connect; throws SSHError on mismatch.
 * Returns fingerprint so caller can prompt user for new hosts.
 */
export function verifyOrThrow(
	host: string,
	port: number,
	keyData: Buffer
): { status: 'trusted' | 'new'; fingerprint: string } {
	const result = verifyHostKey(host, port, keyData);
	if (result.status === 'mismatch') {
		throw new SSHError(
			`Host key mismatch for ${host}:${port}. ` +
				`Expected ${result.storedFingerprint}, got ${result.fingerprint}. ` +
				`If the server key changed legitimately, remove it from ~/.blueprint/known_hosts.`
		);
	}
	return { status: result.status, fingerprint: result.fingerprint };
}
