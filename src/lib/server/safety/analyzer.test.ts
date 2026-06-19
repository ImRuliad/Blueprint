import { describe, it, expect } from 'vitest';
import { analyzeQuery } from './analyzer';

describe('analyzeQuery', () => {
	it('detects DROP TABLE as destructive', () => {
		const risk = analyzeQuery('DROP TABLE users');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('destructive');
		expect(risk!.affectedObject).toBe('users');
	});

	it('detects DROP DATABASE as destructive', () => {
		const risk = analyzeQuery('DROP DATABASE mydb');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('destructive');
	});

	it('detects TRUNCATE as destructive', () => {
		const risk = analyzeQuery('TRUNCATE TABLE orders');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('destructive');
		expect(risk!.affectedObject).toBe('orders');
	});

	it('detects DELETE without WHERE as bulk_update', () => {
		const risk = analyzeQuery('DELETE FROM users');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('bulk_update');
	});

	it('detects UPDATE without WHERE as bulk_update', () => {
		const risk = analyzeQuery("UPDATE users SET role = 'admin'");
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('bulk_update');
	});

	it('detects DELETE WHERE 1=1 as always_true_where', () => {
		const risk = analyzeQuery('DELETE FROM users WHERE 1=1');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('always_true_where');
	});

	it('detects DELETE WHERE true as always_true_where', () => {
		const risk = analyzeQuery('DELETE FROM users WHERE true');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('always_true_where');
	});

	it('detects DELETE WHERE null is null as always_true_where', () => {
		const risk = analyzeQuery('DELETE FROM users WHERE null is null');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('always_true_where');
	});

	it('allows DELETE with real WHERE predicate', () => {
		const risk = analyzeQuery('DELETE FROM users WHERE id = 1');
		expect(risk).toBeNull();
	});

	it('allows SELECT statements', () => {
		const risk = analyzeQuery('SELECT * FROM users');
		expect(risk).toBeNull();
	});

	it('detects ALTER TABLE as ddl', () => {
		const risk = analyzeQuery('ALTER TABLE users ADD COLUMN age INT');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('ddl');
	});

	it('detects CREATE TABLE as ddl', () => {
		const risk = analyzeQuery('CREATE TABLE new_table (id INT PRIMARY KEY)');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('ddl');
	});

	it('returns null for empty string', () => {
		expect(analyzeQuery('')).toBeNull();
	});

	it('handles case-insensitive detection', () => {
		const risk = analyzeQuery('drop table USERS');
		expect(risk).not.toBeNull();
		expect(risk!.riskType).toBe('destructive');
	});
});
