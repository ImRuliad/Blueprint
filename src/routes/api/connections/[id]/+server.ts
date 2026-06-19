import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { connections, queryHistory, columnPreferences } from '$lib/server/db/schema';
import { destroyPool, isConnected } from '$lib/server/drivers/pool';
import { errorResponse, NotFoundError, ValidationError } from '$lib/server/errors';
import { eq } from 'drizzle-orm';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const { id } = params;
		const body = await request.json();

		const existing = db.select().from(connections).where(eq(connections.id, id)).get();
		if (!existing) {
			throw new NotFoundError(`Connection "${id}" not found`);
		}

		const now = new Date().toISOString();
		const updates: Record<string, unknown> = { updatedAt: now };

		if (body.name !== undefined) updates.name = body.name;
		if (body.host !== undefined) updates.host = body.host;
		if (body.port !== undefined) updates.port = body.port != null ? Number(body.port) : null;
		if (body.database !== undefined) updates.database = body.database;
		if (body.username !== undefined) updates.username = body.username;
		if (body.connectionString !== undefined) updates.connectionString = body.connectionString;
		if (body.sqlitePath !== undefined) updates.sqlitePath = body.sqlitePath;
		if (body.groupName !== undefined) updates.groupName = body.groupName;
		if (body.color !== undefined) updates.color = body.color;
		if (body.sortOrder !== undefined) updates.sortOrder = Number(body.sortOrder);

		db.update(connections).set(updates).where(eq(connections.id, id)).run();

		// If connection config changed while connected, tear down pool so user must reconnect
		if (isConnected(id)) {
			await destroyPool(id);
		}

		const updated = db.select().from(connections).where(eq(connections.id, id)).get()!;
		return json({ data: { ...updated, connected: isConnected(id) } });
	} catch (err) {
		return errorResponse(err);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id } = params;

		const existing = db.select().from(connections).where(eq(connections.id, id)).get();
		if (!existing) {
			throw new NotFoundError(`Connection "${id}" not found`);
		}

		// Tear down pool if connected
		if (isConnected(id)) {
			await destroyPool(id);
		}

		// Cascade delete related records
		db.delete(queryHistory).where(eq(queryHistory.connectionId, id)).run();
		db.delete(columnPreferences).where(eq(columnPreferences.connectionId, id)).run();
		db.delete(connections).where(eq(connections.id, id)).run();

		return json({ data: { id } });
	} catch (err) {
		return errorResponse(err);
	}
};
