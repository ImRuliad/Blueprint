import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sshConfigs } from '$lib/server/db/schema';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';

const VALID_AUTH_METHODS = ['privateKey', 'agent', 'password'] as const;
type AuthMethod = (typeof VALID_AUTH_METHODS)[number];

export const GET: RequestHandler = async () => {
	try {
		const rows = db.select().from(sshConfigs).all();
		return json({ data: rows });
	} catch (err) {
		return errorResponse(err);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();

		if (!body.host || typeof body.host !== 'string') {
			throw new ValidationError('SSH host is required');
		}
		if (!body.username || typeof body.username !== 'string') {
			throw new ValidationError('SSH username is required');
		}
		if (!body.authMethod || !VALID_AUTH_METHODS.includes(body.authMethod)) {
			throw new ValidationError(`authMethod must be one of: ${VALID_AUTH_METHODS.join(', ')}`);
		}

		const authMethod = body.authMethod as AuthMethod;

		if (authMethod === 'privateKey' && !body.privateKeyPath) {
			throw new ValidationError('privateKeyPath is required when authMethod is privateKey');
		}

		const now = new Date().toISOString();
		const id = crypto.randomUUID();

		const row = {
			id,
			host: body.host as string,
			port: body.port != null ? Number(body.port) : 22,
			username: body.username as string,
			authMethod,
			privateKeyPath: (body.privateKeyPath as string) ?? null,
			useAgent: body.useAgent === true,
			localPort: body.localPort != null ? Number(body.localPort) : null,
			createdAt: now,
		};

		db.insert(sshConfigs).values(row).run();

		return json({ data: row }, { status: 201 });
	} catch (err) {
		return errorResponse(err);
	}
};
