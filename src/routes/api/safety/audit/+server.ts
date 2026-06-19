import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { safeModeAuditLog } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { errorResponse } from '$lib/server/errors';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const limit = Math.min(Number(url.searchParams.get('limit') ?? '100'), 500);
		const rows = db.select().from(safeModeAuditLog).orderBy(desc(safeModeAuditLog.timestamp)).limit(limit).all();
		return json({ data: rows });
	} catch (err) {
		return errorResponse(err);
	}
};
