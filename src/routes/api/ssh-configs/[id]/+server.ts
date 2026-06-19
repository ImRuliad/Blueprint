import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sshConfigs } from '$lib/server/db/schema';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';

const VALID_AUTH_METHODS = ['privateKey', 'agent', 'password'] as const;

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;
		const row = db.select().from(sshConfigs).where(eq(sshConfigs.id, id)).get();
		if (!row) throw new NotFoundError(`SSH config "${id}" not found`);
		return json({ data: row });
	} catch (err) {
		return errorResponse(err);
	}
};

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();

		const existing = db.select().from(sshConfigs).where(eq(sshConfigs.id, id)).get();
		if (!existing) throw new NotFoundError(`SSH config "${id}" not found`);

		const updates: Record<string, unknown> = {};

		if (body.host !== undefined) updates.host = body.host;
		if (body.port !== undefined) updates.port = body.port != null ? Number(body.port) : 22;
		if (body.username !== undefined) updates.username = body.username;
		if (body.authMethod !== undefined) {
			if (!VALID_AUTH_METHODS.includes(body.authMethod)) {
				throw new ValidationError(`authMethod must be one of: ${VALID_AUTH_METHODS.join(', ')}`);
			}
			updates.authMethod = body.authMethod;
		}
		if (body.privateKeyPath !== undefined) updates.privateKeyPath = body.privateKeyPath;
		if (body.useAgent !== undefined) updates.useAgent = body.useAgent === true;
		if (body.localPort !== undefined) updates.localPort = body.localPort != null ? Number(body.localPort) : null;

		db.update(sshConfigs).set(updates).where(eq(sshConfigs.id, id)).run();

		const updated = db.select().from(sshConfigs).where(eq(sshConfigs.id, id)).get()!;
		return json({ data: updated });
	} catch (err) {
		return errorResponse(err);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		const existing = db.select().from(sshConfigs).where(eq(sshConfigs.id, id)).get();
		if (!existing) throw new NotFoundError(`SSH config "${id}" not found`);

		db.delete(sshConfigs).where(eq(sshConfigs.id, id)).run();

		return json({ data: { id } });
	} catch (err) {
		return errorResponse(err);
	}
};
