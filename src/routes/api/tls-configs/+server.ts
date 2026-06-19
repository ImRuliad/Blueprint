import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tlsConfigs } from '$lib/server/db/schema';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';
import type { TLSMode } from '$lib/server/tls/config';

const VALID_MODES: TLSMode[] = ['disable', 'prefer', 'require', 'verify-ca', 'verify-full'];

export const GET: RequestHandler = async () => {
	try {
		const rows = db.select().from(tlsConfigs).all();
		return json({ data: rows });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.mode || !VALID_MODES.includes(body.mode)) {
			throw new ValidationError(`mode must be one of: ${VALID_MODES.join(', ')}`);
		}

		const now = new Date().toISOString();
		const id = crypto.randomUUID();

		const row = {
			id,
			mode: body.mode as TLSMode,
			caCertPath: (body.caCertPath as string) ?? null,
			clientCertPath: (body.clientCertPath as string) ?? null,
			clientKeyPath: (body.clientKeyPath as string) ?? null,
			serverName: (body.serverName as string) ?? null,
			createdAt: now,
		};

		db.insert(tlsConfigs).values(row).run();

		return json({ data: row }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
