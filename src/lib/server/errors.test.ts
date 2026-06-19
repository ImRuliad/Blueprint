import { describe, it, expect } from 'vitest';
import {
	BlueprintError,
	ConnectionError,
	QueryError,
	SSHError,
	TLSError,
	ExportError,
	SafeModeError,
	ValidationError,
	NotFoundError,
	ConflictError,
	ERROR_STATUS_MAP,
	errorResponse,
} from './errors';

describe('BlueprintError hierarchy', () => {
	it('ConnectionError has correct code and is instanceof BlueprintError', () => {
		const err = new ConnectionError('cannot connect');
		expect(err.code).toBe('CONNECTION_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
		expect(err).toBeInstanceOf(Error);
		expect(err.message).toBe('cannot connect');
		expect(err.name).toBe('ConnectionError');
	});

	it('QueryError has correct code and is instanceof BlueprintError', () => {
		const err = new QueryError('bad query');
		expect(err.code).toBe('QUERY_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('QueryError has optional sql field', () => {
		const errNoSql = new QueryError('bad query');
		expect(errNoSql.sql).toBeUndefined();

		const errWithSql = new QueryError('bad query', 'SELECT * FROM foo');
		expect(errWithSql.sql).toBe('SELECT * FROM foo');
	});

	it('SSHError has correct code and is instanceof BlueprintError', () => {
		const err = new SSHError('ssh failed');
		expect(err.code).toBe('SSH_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('TLSError has correct code and is instanceof BlueprintError', () => {
		const err = new TLSError('tls failed');
		expect(err.code).toBe('TLS_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('ExportError has correct code and is instanceof BlueprintError', () => {
		const err = new ExportError('export failed');
		expect(err.code).toBe('EXPORT_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('SafeModeError has correct code, riskType, and is instanceof BlueprintError', () => {
		const err = new SafeModeError('unsafe operation', 'DROP_TABLE');
		expect(err.code).toBe('SAFE_MODE_ERROR');
		expect(err.riskType).toBe('DROP_TABLE');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('ValidationError has correct code and is instanceof BlueprintError', () => {
		const err = new ValidationError('invalid input');
		expect(err.code).toBe('VALIDATION_ERROR');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('NotFoundError has correct code and is instanceof BlueprintError', () => {
		const err = new NotFoundError('not found');
		expect(err.code).toBe('NOT_FOUND');
		expect(err).toBeInstanceOf(BlueprintError);
	});

	it('ConflictError has correct code and is instanceof BlueprintError', () => {
		const err = new ConflictError('conflict');
		expect(err.code).toBe('CONFLICT');
		expect(err).toBeInstanceOf(BlueprintError);
	});
});

describe('ERROR_STATUS_MAP', () => {
	it('maps CONNECTION_ERROR to 502', () => {
		expect(ERROR_STATUS_MAP['CONNECTION_ERROR']).toBe(502);
	});
	it('maps QUERY_ERROR to 422', () => {
		expect(ERROR_STATUS_MAP['QUERY_ERROR']).toBe(422);
	});
	it('maps SSH_ERROR to 502', () => {
		expect(ERROR_STATUS_MAP['SSH_ERROR']).toBe(502);
	});
	it('maps TLS_ERROR to 502', () => {
		expect(ERROR_STATUS_MAP['TLS_ERROR']).toBe(502);
	});
	it('maps EXPORT_ERROR to 500', () => {
		expect(ERROR_STATUS_MAP['EXPORT_ERROR']).toBe(500);
	});
	it('maps SAFE_MODE_ERROR to 409', () => {
		expect(ERROR_STATUS_MAP['SAFE_MODE_ERROR']).toBe(409);
	});
	it('maps VALIDATION_ERROR to 400', () => {
		expect(ERROR_STATUS_MAP['VALIDATION_ERROR']).toBe(400);
	});
	it('maps NOT_FOUND to 404', () => {
		expect(ERROR_STATUS_MAP['NOT_FOUND']).toBe(404);
	});
	it('maps CONFLICT to 409', () => {
		expect(ERROR_STATUS_MAP['CONFLICT']).toBe(409);
	});
});

describe('errorResponse', () => {
	it('returns 502 for ConnectionError', async () => {
		const res = errorResponse(new ConnectionError('fail'));
		expect(res.status).toBe(502);
		const body = await res.json();
		expect(body.error.code).toBe('CONNECTION_ERROR');
		expect(body.error.message).toBe('fail');
	});

	it('returns 422 for QueryError', async () => {
		const res = errorResponse(new QueryError('bad sql'));
		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.error.code).toBe('QUERY_ERROR');
	});

	it('returns 502 for SSHError', async () => {
		const res = errorResponse(new SSHError('ssh fail'));
		expect(res.status).toBe(502);
	});

	it('returns 502 for TLSError', async () => {
		const res = errorResponse(new TLSError('tls fail'));
		expect(res.status).toBe(502);
	});

	it('returns 500 for ExportError', async () => {
		const res = errorResponse(new ExportError('export fail'));
		expect(res.status).toBe(500);
	});

	it('returns 409 for SafeModeError', async () => {
		const res = errorResponse(new SafeModeError('unsafe', 'DROP'));
		expect(res.status).toBe(409);
	});

	it('returns 400 for ValidationError', async () => {
		const res = errorResponse(new ValidationError('invalid'));
		expect(res.status).toBe(400);
	});

	it('returns 404 for NotFoundError', async () => {
		const res = errorResponse(new NotFoundError('missing'));
		expect(res.status).toBe(404);
	});

	it('returns 409 for ConflictError', async () => {
		const res = errorResponse(new ConflictError('conflict'));
		expect(res.status).toBe(409);
	});

	it('returns 500 for unknown errors', async () => {
		const res = errorResponse(new Error('unexpected'));
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('INTERNAL_ERROR');
		expect(body.error.message).toBe('Internal server error');
	});

	it('returns 500 for non-Error unknown values', async () => {
		const res = errorResponse('something went wrong');
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.error.code).toBe('INTERNAL_ERROR');
	});
});
