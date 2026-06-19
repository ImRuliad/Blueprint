export class BlueprintError extends Error {
	constructor(message: string, public readonly code: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

export class ConnectionError extends BlueprintError {
	constructor(message: string) { super(message, 'CONNECTION_ERROR'); }
}
export class QueryError extends BlueprintError {
	constructor(message: string, public readonly sql?: string) { super(message, 'QUERY_ERROR'); }
}
export class SSHError extends BlueprintError {
	constructor(message: string) { super(message, 'SSH_ERROR'); }
}
export class TLSError extends BlueprintError {
	constructor(message: string) { super(message, 'TLS_ERROR'); }
}
export class ExportError extends BlueprintError {
	constructor(message: string) { super(message, 'EXPORT_ERROR'); }
}
export class SafeModeError extends BlueprintError {
	constructor(message: string, public readonly riskType: string) { super(message, 'SAFE_MODE_ERROR'); }
}
export class ValidationError extends BlueprintError {
	constructor(message: string) { super(message, 'VALIDATION_ERROR'); }
}
export class NotFoundError extends BlueprintError {
	constructor(message: string) { super(message, 'NOT_FOUND'); }
}
export class ConflictError extends BlueprintError {
	constructor(message: string) { super(message, 'CONFLICT'); }
}

export const ERROR_STATUS_MAP: Record<string, number> = {
	CONNECTION_ERROR: 502,
	QUERY_ERROR: 422,
	SSH_ERROR: 502,
	TLS_ERROR: 502,
	EXPORT_ERROR: 500,
	SAFE_MODE_ERROR: 409,
	VALIDATION_ERROR: 400,
	NOT_FOUND: 404,
	CONFLICT: 409,
};

export interface ApiErrorResponse {
	error: { code: string; message: string; detail?: string; };
}

export function errorResponse(error: unknown): Response {
	if (error instanceof BlueprintError) {
		const status = ERROR_STATUS_MAP[error.code] ?? 500;
		return Response.json(
			{ error: { code: error.code, message: error.message } } satisfies ApiErrorResponse,
			{ status }
		);
	}
	const isDev = process.env.NODE_ENV === 'development';
	return Response.json(
		{
			error: {
				code: 'INTERNAL_ERROR',
				message: 'Internal server error',
				detail: isDev ? String(error) : undefined,
			},
		} satisfies ApiErrorResponse,
		{ status: 500 }
	);
}
