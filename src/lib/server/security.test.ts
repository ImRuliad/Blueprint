import { describe, it, expect } from 'vitest';
import { isAllowedHost } from './security';

describe('isAllowedHost', () => {
	describe('allows valid hosts', () => {
		it('allows localhost', () => {
			expect(isAllowedHost('localhost')).toBe(true);
		});

		it('allows localhost with port', () => {
			expect(isAllowedHost('localhost:5173')).toBe(true);
		});

		it('allows localhost:3000', () => {
			expect(isAllowedHost('localhost:3000')).toBe(true);
		});

		it('allows 127.0.0.1', () => {
			expect(isAllowedHost('127.0.0.1')).toBe(true);
		});

		it('allows 127.0.0.1 with port', () => {
			expect(isAllowedHost('127.0.0.1:3000')).toBe(true);
		});

		it('allows [::1]', () => {
			expect(isAllowedHost('[::1]')).toBe(true);
		});

		it('allows ::1', () => {
			expect(isAllowedHost('::1')).toBe(true);
		});

		it('allows LOCALHOST (uppercase)', () => {
			expect(isAllowedHost('LOCALHOST')).toBe(true);
		});

		it('allows Localhost (mixed case)', () => {
			expect(isAllowedHost('Localhost')).toBe(true);
		});

		it('allows LOCALHOST:3000 (uppercase with port)', () => {
			expect(isAllowedHost('LOCALHOST:3000')).toBe(true);
		});

		it('allows [::1]:3000 (bracketed IPv6 with port)', () => {
			expect(isAllowedHost('[::1]:3000')).toBe(true);
		});
	});

	describe('rejects invalid hosts', () => {
		it('rejects attacker.com', () => {
			expect(isAllowedHost('attacker.com')).toBe(false);
		});

		it('rejects 192.168.1.100', () => {
			expect(isAllowedHost('192.168.1.100')).toBe(false);
		});

		it('rejects 10.0.0.1 with port', () => {
			expect(isAllowedHost('10.0.0.1:3000')).toBe(false);
		});

		it('rejects empty string', () => {
			expect(isAllowedHost('')).toBe(false);
		});

		it('rejects evil.localhost', () => {
			expect(isAllowedHost('evil.localhost')).toBe(false);
		});

		it('rejects localhost:abc (non-digit port)', () => {
			expect(isAllowedHost('localhost:abc')).toBe(false);
		});
	});
});
