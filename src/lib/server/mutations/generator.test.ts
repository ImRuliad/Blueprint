import { describe, it, expect } from 'vitest';
import { generateSQL } from './generator';
import type { MutationChange } from './generator';

describe('mutation generator', () => {
	describe('INSERT', () => {
		it('generates INSERT SQL with params for postgresql', () => {
			const change: MutationChange = {
				operation: 'insert',
				tableName: 'users',
				pk: {},
				row: { name: 'Alice', age: 30 },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('INSERT INTO "users" ("name", "age") VALUES ($1, $2)');
			expect(result.params).toEqual(['Alice', 30]);
		});

		it('generates INSERT SQL with params for mysql', () => {
			const change: MutationChange = {
				operation: 'insert',
				tableName: 'users',
				pk: {},
				row: { name: 'Bob', active: true },
			};

			const result = generateSQL(change, 'mysql');
			expect(result.sql).toBe('INSERT INTO `users` (`name`, `active`) VALUES (?, ?)');
			expect(result.params).toEqual(['Bob', true]);
		});

		it('generates INSERT SQL with params for sqlite', () => {
			const change: MutationChange = {
				operation: 'insert',
				tableName: 'items',
				pk: {},
				row: { title: 'Widget', price: 9.99 },
			};

			const result = generateSQL(change, 'sqlite');
			expect(result.sql).toBe('INSERT INTO "items" ("title", "price") VALUES (?, ?)');
			expect(result.params).toEqual(['Widget', 9.99]);
		});

		it('throws if row is empty', () => {
			const change: MutationChange = {
				operation: 'insert',
				tableName: 'users',
				pk: {},
				row: {},
			};

			expect(() => generateSQL(change, 'postgresql')).toThrow('Insert requires at least one column');
		});
	});

	describe('UPDATE', () => {
		it('generates UPDATE SQL with params for postgresql', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'users',
				pk: { id: 42 },
				column: 'name',
				newValue: 'Alice',
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('UPDATE "users" SET "name" = $1 WHERE "id" = $2');
			expect(result.params).toEqual(['Alice', 42]);
		});

		it('generates UPDATE SQL with params for mysql', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'users',
				pk: { id: 7 },
				column: 'email',
				newValue: 'a@b.com',
			};

			const result = generateSQL(change, 'mysql');
			expect(result.sql).toBe('UPDATE `users` SET `email` = ? WHERE `id` = ?');
			expect(result.params).toEqual(['a@b.com', 7]);
		});

		it('handles composite primary keys', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'order_items',
				pk: { order_id: 1, item_id: 5 },
				column: 'quantity',
				newValue: 3,
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe(
				'UPDATE "order_items" SET "quantity" = $1 WHERE "order_id" = $2 AND "item_id" = $3'
			);
			expect(result.params).toEqual([3, 1, 5]);
		});

		it('throws if column is missing', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'users',
				pk: { id: 1 },
				newValue: 'test',
			};

			expect(() => generateSQL(change, 'postgresql')).toThrow('Update requires a column name');
		});

		it('throws if pk is empty', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'users',
				pk: {},
				column: 'name',
				newValue: 'test',
			};

			expect(() => generateSQL(change, 'postgresql')).toThrow(
				'Update requires at least one primary key column'
			);
		});
	});

	describe('DELETE', () => {
		it('generates DELETE SQL with params for postgresql', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'users',
				pk: { id: 10 },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('DELETE FROM "users" WHERE "id" = $1');
			expect(result.params).toEqual([10]);
		});

		it('generates DELETE SQL with params for mysql', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'users',
				pk: { id: 3 },
			};

			const result = generateSQL(change, 'mysql');
			expect(result.sql).toBe('DELETE FROM `users` WHERE `id` = ?');
			expect(result.params).toEqual([3]);
		});

		it('handles composite primary keys', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'order_items',
				pk: { order_id: 1, item_id: 5 },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe(
				'DELETE FROM "order_items" WHERE "order_id" = $1 AND "item_id" = $2'
			);
			expect(result.params).toEqual([1, 5]);
		});

		it('throws if pk is empty', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'users',
				pk: {},
			};

			expect(() => generateSQL(change, 'postgresql')).toThrow(
				'Delete requires at least one primary key column'
			);
		});
	});

	describe('reserved word handling', () => {
		it('quotes reserved word table names', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'order',
				pk: { id: 1 },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('DELETE FROM "order" WHERE "id" = $1');
		});

		it('quotes reserved word column names', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'items',
				pk: { id: 1 },
				column: 'select',
				newValue: 'test',
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('UPDATE "items" SET "select" = $1 WHERE "id" = $2');
		});

		it('quotes reserved word column names in inserts', () => {
			const change: MutationChange = {
				operation: 'insert',
				tableName: 'data',
				pk: {},
				row: { group: 'A', order: 1 },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).toBe('INSERT INTO "data" ("group", "order") VALUES ($1, $2)');
			expect(result.params).toEqual(['A', 1]);
		});
	});

	describe('no string interpolation of values', () => {
		it('never embeds values in SQL string', () => {
			const change: MutationChange = {
				operation: 'update',
				tableName: 'users',
				pk: { id: 1 },
				column: 'name',
				newValue: "Robert'; DROP TABLE users;--",
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).not.toContain('Robert');
			expect(result.sql).not.toContain('DROP');
			expect(result.params[0]).toBe("Robert'; DROP TABLE users;--");
		});

		it('never embeds pk values in SQL string', () => {
			const change: MutationChange = {
				operation: 'delete',
				tableName: 'users',
				pk: { id: "1; DROP TABLE users;--" },
			};

			const result = generateSQL(change, 'postgresql');
			expect(result.sql).not.toContain('DROP');
			expect(result.params[0]).toBe("1; DROP TABLE users;--");
		});
	});
});
