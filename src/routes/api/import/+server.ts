import type { RequestHandler } from './$types';
import { getPool } from '$lib/server/drivers/pool';
import { importSql } from '$lib/server/import/sql-importer';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const contentType = request.headers.get('content-type') ?? '';
		if (!contentType.includes('multipart/form-data')) {
			throw new ValidationError('Request must be multipart/form-data');
		}

		const formData = await request.formData();
		const connectionId = formData.get('connectionId');
		const file = formData.get('file');
		const stopOnError = formData.get('stopOnError') === 'true';

		if (!connectionId || typeof connectionId !== 'string') {
			throw new ValidationError('connectionId is required');
		}
		if (!file || !(file instanceof File)) {
			throw new ValidationError('file is required');
		}

		const filename = file.name.toLowerCase();
		if (!filename.endsWith('.sql')) {
			throw new ValidationError('Only .sql files are supported for import');
		}

		const driver = getPool(connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for connectionId "${connectionId}"`);
		}

		const sql = await file.text();
		if (!sql.trim()) {
			throw new ValidationError('File is empty');
		}

		const result = await importSql(driver, sql, { stopOnError });

		return Response.json({ data: result }, { status: result.ok ? 200 : 422 });
	} catch (err) {
		return errorResponse(err);
	}
};
