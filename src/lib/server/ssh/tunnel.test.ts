import { describe, it, expect, vi, beforeEach } from 'vitest';

// These mocks are hoisted — must be at top level
vi.mock('ssh2', () => {
	const mockClientInstance = {
		on: vi.fn().mockReturnThis(),
		connect: vi.fn(),
		end: vi.fn(),
		forwardOut: vi.fn(),
	};
	const MockClient = vi.fn(function (this: typeof mockClientInstance) {
		Object.assign(this, mockClientInstance);
	});
	(MockClient as unknown as { _instance: typeof mockClientInstance })._instance = mockClientInstance;
	return { Client: MockClient };
});

vi.mock('net', () => {
	const mockServerInstance = {
		listen: vi.fn(),
		address: vi.fn(() => ({ port: 54321 })),
		close: vi.fn(),
		on: vi.fn().mockReturnThis(),
	};
	const createServer = vi.fn((handler?: unknown) => {
		// Store handler for later use if needed
		void handler;
		return mockServerInstance;
	});
	(createServer as unknown as { _server: typeof mockServerInstance })._server = mockServerInstance;
	return { createServer };
});

import { Client } from 'ssh2';
import { createServer } from 'net';

function getClientInstance() {
	// Get the last constructed Client instance
	const MockClient = Client as unknown as { _instance: ReturnType<typeof Client> };
	return MockClient._instance;
}

function getServerInstance() {
	const cs = createServer as unknown as { _server: ReturnType<typeof createServer> };
	return cs._server;
}

describe('SSH Tunnel', () => {
	beforeEach(async () => {
		vi.clearAllMocks();

		const server = getServerInstance();
		// Default: listen calls callback immediately with port 54321
		(server.listen as ReturnType<typeof vi.fn>).mockImplementation(
			(_port: number, _host: string, cb: () => void) => {
				setTimeout(cb, 0);
				return server;
			}
		);
		(server.address as ReturnType<typeof vi.fn>).mockReturnValue({ port: 54321 });
		(server.on as ReturnType<typeof vi.fn>).mockReturnThis();
		(server.close as ReturnType<typeof vi.fn>).mockImplementation((cb?: () => void) => { cb?.(); });

		const client = getClientInstance();
		(client.on as ReturnType<typeof vi.fn>).mockReturnThis();

		// Reset modules so tunnelRegistry is fresh per test
		vi.resetModules();
	});

	it('createTunnel resolves with localPort when SSH client emits ready', async () => {
		const client = getClientInstance();
		(client.on as ReturnType<typeof vi.fn>).mockImplementation(
			(event: string, cb: () => void) => {
				if (event === 'ready') setTimeout(cb, 10);
				return client;
			}
		);

		const { createTunnel } = await import('./tunnel');

		const tunnel = await createTunnel(
			{ host: 'bastion.example.com', port: 22, username: 'ubuntu', authMethod: 'agent' },
			'db.internal',
			5432,
			'test-key-ready'
		);

		expect(tunnel.localPort).toBe(54321);
		expect(client.connect).toHaveBeenCalledWith(
			expect.objectContaining({ host: 'bastion.example.com', port: 22, username: 'ubuntu' })
		);
	});

	it('createTunnel rejects when SSH client emits error before ready', async () => {
		const client = getClientInstance();
		(client.on as ReturnType<typeof vi.fn>).mockImplementation(
			(event: string, cb: (err: Error) => void) => {
				if (event === 'error') setTimeout(() => cb(new Error('Connection refused')), 10);
				return client;
			}
		);

		const { createTunnel } = await import('./tunnel');

		await expect(
			createTunnel(
				{ host: 'bad-host', port: 22, username: 'user', authMethod: 'agent' },
				'db.internal',
				5432,
				'test-key-err'
			)
		).rejects.toThrow('SSH connection error: Connection refused');
	});

	it('createTunnel uses privateKey auth method when specified', async () => {
		const client = getClientInstance();
		(client.on as ReturnType<typeof vi.fn>).mockImplementation(
			(event: string, cb: () => void) => {
				if (event === 'ready') setTimeout(cb, 10);
				return client;
			}
		);

		const { createTunnel } = await import('./tunnel');

		const privateKey = '-----BEGIN OPENSSH PRIVATE KEY-----\nfake\n-----END OPENSSH PRIVATE KEY-----';
		const tunnel = await createTunnel(
			{ host: 'bastion.example.com', port: 22, username: 'ubuntu', authMethod: 'privateKey', privateKey },
			'db.internal',
			5432,
			'test-key-pk'
		);

		expect(tunnel.localPort).toBe(54321);
		expect(client.connect).toHaveBeenCalledWith(
			expect.objectContaining({ privateKey })
		);
	});

	it('close() ends the SSH client and closes TCP server', async () => {
		const client = getClientInstance();
		const server = getServerInstance();

		(client.on as ReturnType<typeof vi.fn>).mockImplementation(
			(event: string, cb: () => void) => {
				if (event === 'ready') setTimeout(cb, 10);
				return client;
			}
		);

		const { createTunnel } = await import('./tunnel');

		const tunnel = await createTunnel(
			{ host: 'bastion.example.com', port: 22, username: 'ubuntu', authMethod: 'agent' },
			'db.internal',
			5432,
			'test-key-close'
		);

		await tunnel.close();

		expect(client.end).toHaveBeenCalled();
		expect(server.close).toHaveBeenCalled();
	});
});
