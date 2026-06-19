import { describe, it, expect } from 'vitest';
import { quoteIdentifier } from './quote';

describe('quoteIdentifier', () => {
	describe('postgresql', () => {
		it('wraps name in double quotes', () => {
			expect(quoteIdentifier('users', 'postgresql')).toBe('"users"');
		});

		it('escapes embedded double quotes', () => {
			expect(quoteIdentifier('my"table', 'postgresql')).toBe('"my""table"');
		});

		it('quotes reserved words', () => {
			expect(quoteIdentifier('order', 'postgresql')).toBe('"order"');
			expect(quoteIdentifier('select', 'postgresql')).toBe('"select"');
			expect(quoteIdentifier('group', 'postgresql')).toBe('"group"');
		});
	});

	describe('mysql', () => {
		it('wraps name in backticks', () => {
			expect(quoteIdentifier('users', 'mysql')).toBe('`users`');
		});

		it('escapes embedded backticks', () => {
			expect(quoteIdentifier('my`table', 'mysql')).toBe('`my``table`');
		});

		it('quotes reserved words', () => {
			expect(quoteIdentifier('order', 'mysql')).toBe('`order`');
			expect(quoteIdentifier('select', 'mysql')).toBe('`select`');
			expect(quoteIdentifier('group', 'mysql')).toBe('`group`');
		});
	});

	describe('sqlite', () => {
		it('wraps name in double quotes', () => {
			expect(quoteIdentifier('users', 'sqlite')).toBe('"users"');
		});

		it('escapes embedded double quotes', () => {
			expect(quoteIdentifier('my"table', 'sqlite')).toBe('"my""table"');
		});

		it('quotes reserved words', () => {
			expect(quoteIdentifier('order', 'sqlite')).toBe('"order"');
			expect(quoteIdentifier('select', 'sqlite')).toBe('"select"');
			expect(quoteIdentifier('group', 'sqlite')).toBe('"group"');
		});
	});

	describe('mongodb', () => {
		it('returns name unchanged', () => {
			expect(quoteIdentifier('users', 'mongodb')).toBe('users');
		});

		it('does not escape special characters', () => {
			expect(quoteIdentifier('my"collection', 'mongodb')).toBe('my"collection');
			expect(quoteIdentifier('my`collection', 'mongodb')).toBe('my`collection');
		});
	});
});
