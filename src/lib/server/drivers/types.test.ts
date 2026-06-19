import { describe, it, expectTypeOf } from 'vitest';
import type {
	EngineType,
	ColumnDescriptor,
	QueryResult,
	TableInfo,
	ViewInfo,
	ColumnInfo,
	IndexInfo,
	ForeignKeyInfo,
	TableSchema,
	DatabaseDriver,
} from './types';

describe('type-level checks', () => {
	it('EngineType is a union of engine strings', () => {
		expectTypeOf<EngineType>().toEqualTypeOf<'postgresql' | 'mysql' | 'sqlite' | 'mongodb'>();
	});

	it('QueryResult has expected shape', () => {
		expectTypeOf<QueryResult>().toHaveProperty('columns');
		expectTypeOf<QueryResult>().toHaveProperty('rows');
		expectTypeOf<QueryResult>().toHaveProperty('rowsAffected');
	});

	it('ColumnDescriptor has expected shape', () => {
		expectTypeOf<ColumnDescriptor>().toHaveProperty('name');
		expectTypeOf<ColumnDescriptor>().toHaveProperty('dataType');
		expectTypeOf<ColumnDescriptor>().toHaveProperty('nullable');
		expectTypeOf<ColumnDescriptor>().toHaveProperty('isPrimaryKey');
	});

	it('TableInfo has name and optional schema/rowCount', () => {
		expectTypeOf<TableInfo>().toHaveProperty('name');
		expectTypeOf<TableInfo['schema']>().toEqualTypeOf<string | undefined>();
		expectTypeOf<TableInfo['rowCount']>().toEqualTypeOf<number | undefined>();
	});

	it('ViewInfo has name and optional schema', () => {
		expectTypeOf<ViewInfo>().toHaveProperty('name');
		expectTypeOf<ViewInfo['schema']>().toEqualTypeOf<string | undefined>();
	});

	it('ColumnInfo has all expected fields', () => {
		expectTypeOf<ColumnInfo>().toHaveProperty('name');
		expectTypeOf<ColumnInfo>().toHaveProperty('dataType');
		expectTypeOf<ColumnInfo>().toHaveProperty('nullable');
		expectTypeOf<ColumnInfo>().toHaveProperty('defaultValue');
		expectTypeOf<ColumnInfo>().toHaveProperty('isPrimaryKey');
		expectTypeOf<ColumnInfo>().toHaveProperty('isAutoIncrement');
	});

	it('IndexInfo has expected fields', () => {
		expectTypeOf<IndexInfo>().toHaveProperty('name');
		expectTypeOf<IndexInfo>().toHaveProperty('columns');
		expectTypeOf<IndexInfo>().toHaveProperty('unique');
		expectTypeOf<IndexInfo['type']>().toEqualTypeOf<string | undefined>();
	});

	it('ForeignKeyInfo has expected fields', () => {
		expectTypeOf<ForeignKeyInfo>().toHaveProperty('constraintName');
		expectTypeOf<ForeignKeyInfo>().toHaveProperty('column');
		expectTypeOf<ForeignKeyInfo>().toHaveProperty('referencedTable');
		expectTypeOf<ForeignKeyInfo>().toHaveProperty('referencedColumn');
		expectTypeOf<ForeignKeyInfo['onDelete']>().toEqualTypeOf<string | undefined>();
		expectTypeOf<ForeignKeyInfo['onUpdate']>().toEqualTypeOf<string | undefined>();
	});

	it('TableSchema has expected fields', () => {
		expectTypeOf<TableSchema>().toHaveProperty('name');
		expectTypeOf<TableSchema>().toHaveProperty('columns');
		expectTypeOf<TableSchema>().toHaveProperty('indexes');
		expectTypeOf<TableSchema>().toHaveProperty('foreignKeys');
		expectTypeOf<TableSchema['schema']>().toEqualTypeOf<string | undefined>();
	});

	it('DatabaseDriver interface has all required methods', () => {
		expectTypeOf<DatabaseDriver>().toHaveProperty('engine');
		expectTypeOf<DatabaseDriver>().toHaveProperty('isConnected');
		expectTypeOf<DatabaseDriver>().toHaveProperty('connect');
		expectTypeOf<DatabaseDriver>().toHaveProperty('disconnect');
		expectTypeOf<DatabaseDriver>().toHaveProperty('testConnection');
		expectTypeOf<DatabaseDriver>().toHaveProperty('execute');
		expectTypeOf<DatabaseDriver>().toHaveProperty('executeRaw');
		expectTypeOf<DatabaseDriver>().toHaveProperty('beginTransaction');
		expectTypeOf<DatabaseDriver>().toHaveProperty('commitTransaction');
		expectTypeOf<DatabaseDriver>().toHaveProperty('rollbackTransaction');
		expectTypeOf<DatabaseDriver>().toHaveProperty('getTables');
		expectTypeOf<DatabaseDriver>().toHaveProperty('getTableSchema');
		expectTypeOf<DatabaseDriver>().toHaveProperty('getViews');
	});
});
