import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tlsConfigs } from '$lib/server/db/schema';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';
import type { TLSMode } from '$lib/server/tls/config';

const VALID_MODES: TLSMode[] = ['disable', 'prefer', 'require', 'verify-ca', 'verify-full'];

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		const row = db.select().from(tlsConfigs).where(eq(tlsConfigs.id, id)).get();
		if (!row) {
			throw new NotFoundError(`TLS config "${id}" not found`);
		}
		return json({ data: row });
	} catch (err) {
		return errorResponse(err);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();

		const existing = db.select().from(tlsConfigs).where(eq(tlsConfigs.id, id)).get();
		if (!existing) {
			throw new NotFoundError(`TLS config "${id}" not found`);
		}

		if (body.mode !== undefined && !VALID_MODES.includes(body.mode)) {
			throw new ValidationError(`mode must be one of: ${VALID_MODES.join(', ')}`);
		}

		const updates: Record<string, unknown> = {};
		if (body.mode !== undefined) updates.mode = body.mode as TLSMode;
		if (body.caCertPath !== undefined) updates.caCertPath = body.caCertPath;
		if (body.clientCertPath !== undefined) updates.clientCertPath = body.clientCertPath;
		if (body.clientKeyPath !== undefined) updates.clientKeyPath = body.clientKeyPath;
		if (body.serverName !== undefined) updates.serverName = body.serverName;

		db.update(tlsConfigs).set(updates).where(eq(tlsConfigs.id, id)).run();

		const updated = db.select().from(tlsConfigs).where(eq(tlsConfigs.id, id)).get()!;
		return json({ data: updated });
	} catch (err) {
		return errorResponse(err);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		const existing = db.select().from(tlsConfigs).where(eq(tlsConfigs.id, id)).get();
		if (!existing) {
			throw new NotFoundError(`TLS config "${id}" not found`);
		}

		db.delete(tlsConfigs).where(eq(tlsConfigs.id, id)).run();

		return json({ data: { id } });
	} catch (err) {
		return errorResponse(err);
	}
};
