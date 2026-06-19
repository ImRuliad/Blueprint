import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and os so we don't touch the real filesystem
vi.mock('fs', () => ({
	readFileSync: vi.fn(),
	writeFileSync: vi.fn(),
	mkdirSync: vi.fn(),
	existsSync: vi.fn(),
}));

vi.mock('os', () => ({
	homedir: vi.fn(() => '/fake-home'),
}));

import { readFileSync, writeFileSync, existsSync } from 'fs';
import {
	computeFingerprint,
	hostKey,
	verifyHostKey,
	trustHostKey,
	removeHostKey,
	verifyOrThrow,
} from './known-hosts';
import { SSHError } from '$lib/server/errors';

const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);
const mockExistsSync = vi.mocked(existsSync);

const FAKE_KEY_DATA = Buffer.from('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA fake-key-data');

// Clear all mocks before every test to prevent cross-describe leakage
beforeEach(() => {
	vi.clearAllMocks();
});

describe('computeFingerprint', () => {
	it('returns a SHA256 fingerprint string', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		expect(fp).toMatch(/^SHA256:[A-Za-z0-9+/]+$/);
	});

	it('produces consistent fingerprints for same input', () => {
		const fp1 = computeFingerprint(FAKE_KEY_DATA);
		const fp2 = computeFingerprint(FAKE_KEY_DATA);
		expect(fp1).toBe(fp2);
	});

	it('produces different fingerprints for different input', () => {
		const fp1 = computeFingerprint(FAKE_KEY_DATA);
		const fp2 = computeFingerprint(Buffer.from('different-key-data'));
		expect(fp1).not.toBe(fp2);
	});
});

describe('hostKey', () => {
	it('returns bare hostname for port 22', () => {
		expect(hostKey('bastion.example.com', 22)).toBe('bastion.example.com');
	});

	it('returns bracketed host:port for non-standard port', () => {
		expect(hostKey('bastion.example.com', 2222)).toBe('[bastion.example.com]:2222');
	});
});

describe('verifyHostKey', () => {
	it('returns "new" when known_hosts file does not exist', () => {
		mockExistsSync.mockReturnValue(false);

		const result = verifyHostKey('myhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('new');
		expect(result.fingerprint).toMatch(/^SHA256:/);
	});

	it('returns "trusted" when fingerprint matches stored value', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`# Blueprint known hosts\nmyhost ${fp}\n` as unknown as Buffer);

		const result = verifyHostKey('myhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('trusted');
		expect(result.fingerprint).toBe(fp);
	});

	it('returns "mismatch" when fingerprint differs from stored value', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`myhost SHA256:DIFFERENT_FINGERPRINT\n` as unknown as Buffer);

		const result = verifyHostKey('myhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('mismatch');
		expect(result.storedFingerprint).toBe('SHA256:DIFFERENT_FINGERPRINT');
		expect(result.fingerprint).toBe(fp);
	});

	it('skips blank lines and comments in known_hosts', () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(
			`# This is a comment\n\n# another comment\n` as unknown as Buffer
		);

		const result = verifyHostKey('myhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('new');
	});

	it('handles bracketed host:port format', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(
			`[myhost]:2222 ${fp}\n` as unknown as Buffer
		);

		const result = verifyHostKey('myhost', 2222, FAKE_KEY_DATA);
		expect(result.status).toBe('trusted');
	});
});

describe('trustHostKey', () => {
	it('writes a new entry when file does not exist', () => {
		mockExistsSync.mockReturnValue(false);

		trustHostKey('newhost', 22, FAKE_KEY_DATA);

		expect(mockWriteFileSync).toHaveBeenCalledOnce();
		const [, content] = mockWriteFileSync.mock.calls[0];
		expect(content as string).toContain('newhost');
		expect(content as string).toContain('SHA256:');
	});

	it('appends entry to existing file', () => {
		const existingFp = 'SHA256:EXISTING';
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(
			`otherhost ${existingFp}\n` as unknown as Buffer
		);

		trustHostKey('newhost', 22, FAKE_KEY_DATA);

		const [, content] = mockWriteFileSync.mock.calls[0];
		expect(content as string).toContain('otherhost');
		expect(content as string).toContain('newhost');
	});
});

describe('removeHostKey', () => {
	it('removes existing entry from known_hosts', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`myhost ${fp}\notherhost SHA256:OTHER\n` as unknown as Buffer);

		removeHostKey('myhost', 22);

		const [, content] = mockWriteFileSync.mock.calls[0];
		expect(content as string).not.toContain('myhost');
		expect(content as string).toContain('otherhost');
	});

	it('does nothing when host is not in known_hosts', () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`otherhost SHA256:OTHER\n` as unknown as Buffer);

		removeHostKey('nonexistent', 22);

		expect(mockWriteFileSync).not.toHaveBeenCalled();
	});
});

describe('verifyOrThrow', () => {
	it('returns trusted status without throwing for trusted host', () => {
		const fp = computeFingerprint(FAKE_KEY_DATA);
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`myhost ${fp}\n` as unknown as Buffer);

		const result = verifyOrThrow('myhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('trusted');
	});

	it('returns new status without throwing for unknown host', () => {
		mockExistsSync.mockReturnValue(false);

		const result = verifyOrThrow('newhost', 22, FAKE_KEY_DATA);
		expect(result.status).toBe('new');
	});

	it('throws SSHError on fingerprint mismatch', () => {
		mockExistsSync.mockReturnValue(true);
		mockReadFileSync.mockReturnValue(`myhost SHA256:DIFFERENT\n` as unknown as Buffer);

		expect(() => verifyOrThrow('myhost', 22, FAKE_KEY_DATA)).toThrow(SSHError);
		expect(() => verifyOrThrow('myhost', 22, FAKE_KEY_DATA)).toThrow('Host key mismatch');
	});
});
