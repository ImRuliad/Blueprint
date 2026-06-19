import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { errorResponse } from '$lib/server/errors';

const SSH_KEY_EXTENSIONS = new Set(['', '.pem', '.key', '.rsa', '.ed25519', '.ecdsa', '.dsa']);
const KNOWN_KEY_NAMES = new Set([
	'id_rsa', 'id_ed25519', 'id_ecdsa', 'id_dsa',
	'id_rsa_github', 'id_ed25519_github',
]);

function looksLikePrivateKey(name: string): boolean {
	if (KNOWN_KEY_NAMES.has(name)) return true;
	// Skip .pub files
	if (name.endsWith('.pub')) return false;
	const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
	return SSH_KEY_EXTENSIONS.has(ext);
}

export const GET: RequestHandler = async () => {
	try {
		const sshDir = join(homedir(), '.ssh');

		if (!existsSync(sshDir)) {
			return json({ data: [] });
		}

		const entries = readdirSync(sshDir);
		const keys: { name: string; path: string }[] = [];

		for (const entry of entries) {
			const fullPath = join(sshDir, entry);
			try {
				const stat = statSync(fullPath);
				if (!stat.isFile()) continue;
				if (looksLikePrivateKey(entry)) {
					keys.push({ name: entry, path: fullPath });
				}
			} catch {
				// Skip unreadable entries
			}
		}

		keys.sort((a, b) => a.name.localeCompare(b.name));

		return json({ data: keys });
	} catch (err) {
		return errorResponse(err);
	}
};
