import type { RequestHandler } from './$types';
import { getPool } from '$lib/server/drivers/pool';
import { streamCsvExport } from '$lib/server/export/csv-exporter';
import { streamSqlExport } from '$lib/server/export/sql-exporter';
import { streamNdjsonExport } from '$lib/server/export/ndjson-exporter';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';

export type ExportFormat = 'csv' | 'sql' | 'ndjson';

export interface ExportRequestBody {
	connectionId: string;
	tableName: string;
	format: ExportFormat;
	options?: {
		nullValue?: string;
		includeHeader?: boolean;
		includeDdl?: boolean;
		dropIfExists?: boolean;
		pageSize?: number;
		batchSize?: number;
	};
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
	csv: 'text/csv; charset=utf-8',
	sql: 'text/plain; charset=utf-8',
	ndjson: 'application/x-ndjson; charset=utf-8',
};

const FILE_EXTENSIONS: Record<ExportFormat, string> = {
	csv: 'csv',
	sql: 'sql',
	ndjson: 'ndjson',
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ExportRequestBody;
		const { connectionId, tableName, format, options = {} } = body;

		if (!connectionId) {
			throw new ValidationError('connectionId is required');
		}
		if (!tableName) {
			throw new ValidationError('tableName is required');
		}
		if (!format || !['csv', 'sql', 'ndjson'].includes(format)) {
			throw new ValidationError('format must be one of: csv, sql, ndjson');
		}

		const driver = getPool(connectionId);
		if (!driver) {
			throw new NotFoundError(`No active connection for connectionId "${connectionId}"`);
		}

		const filename = `${tableName}-export.${FILE_EXTENSIONS[format]}`;

		let generator: AsyncGenerator<string>;
		if (format === 'csv') {
			generator = streamCsvExport(driver, tableName, {
				nullValue: options.nullValue,
				includeHeader: options.includeHeader,
				pageSize: options.pageSize,
			});
		} else if (format === 'sql') {
			generator = streamSqlExport(driver, tableName, {
				includeDdl: options.includeDdl,
				dropIfExists: options.dropIfExists,
				pageSize: options.pageSize,
				batchSize: options.batchSize,
			});
		} else {
			generator = streamNdjsonExport(driver, tableName, {
				pageSize: options.pageSize,
			});
		}

		const stream = new ReadableStream<Uint8Array>({
			async start(controller) {
				const encoder = new TextEncoder();
				try {
					for await (const chunk of generator) {
						controller.enqueue(encoder.encode(chunk));
					}
					controller.close();
				} catch (err) {
					controller.error(err);
				}
			},
		});

		return new Response(stream, {
			status: 200,
			headers: {
				'Content-Type': CONTENT_TYPES[format],
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Transfer-Encoding': 'chunked',
				'Cache-Control': 'no-store',
			},
		});
	} catch (err) {
		return errorResponse(err);
	}
};
