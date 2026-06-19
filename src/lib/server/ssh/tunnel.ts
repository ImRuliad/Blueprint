import { Client } from 'ssh2';
import type { ConnectConfig, ClientChannel } from 'ssh2';
import { createServer, type Server } from 'net';
import { SSHError } from '$lib/server/errors';

export interface SSHTunnelConfig {
	host: string;
	port: number;
	username: string;
	authMethod: 'privateKey' | 'agent' | 'password';
	privateKey?: string;
	password?: string;
	useAgent?: boolean;
}

export interface SSHTunnel {
	localPort: number;
	close(): Promise<void>;
}

const KEEPALIVE_INTERVAL_MS = 30_000;
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const RECONNECT_DELAY_MS = 3_000;
const MAX_RECONNECT_ATTEMPTS = 5;

// Global tunnel registry (HMR-safe)
const tunnelRegistry: Map<string, ActiveTunnel> =
	((globalThis as Record<string, unknown>).__blueprint_tunnels as Map<string, ActiveTunnel>) ??=
		new Map<string, ActiveTunnel>();

interface ActiveTunnel {
	server: Server;
	client: Client;
	localPort: number;
	idleTimer: ReturnType<typeof setTimeout> | null;
	reconnectAttempts: number;
	closed: boolean;
}

function buildConnectConfig(config: SSHTunnelConfig): ConnectConfig {
	const base: ConnectConfig = {
		host: config.host,
		port: config.port,
		username: config.username,
		keepaliveInterval: KEEPALIVE_INTERVAL_MS,
		readyTimeout: 20_000,
	};

	if (config.authMethod === 'agent' || config.useAgent) {
		base.agent = process.env.SSH_AUTH_SOCK;
	} else if (config.authMethod === 'privateKey' && config.privateKey) {
		base.privateKey = config.privateKey;
	} else if (config.authMethod === 'password' && config.password) {
		base.password = config.password;
	}

	return base;
}

function resetIdleTimer(entry: ActiveTunnel): void {
	if (entry.idleTimer) clearTimeout(entry.idleTimer);
	entry.idleTimer = setTimeout(async () => {
		if (!entry.closed) {
			entry.closed = true;
			entry.server.close();
			entry.client.end();
		}
	}, IDLE_TIMEOUT_MS);
}

export async function createTunnel(
	sshConfig: SSHTunnelConfig,
	remoteHost: string,
	remotePort: number,
	tunnelKey?: string
): Promise<SSHTunnel> {
	return new Promise((resolve, reject) => {
		const key = tunnelKey ?? `${sshConfig.host}:${sshConfig.port}:${remoteHost}:${remotePort}`;

		// Close existing tunnel for this key
		const existing = tunnelRegistry.get(key);
		if (existing && !existing.closed) {
			existing.closed = true;
			existing.server.close();
			existing.client.end();
			tunnelRegistry.delete(key);
		}

		const sshClient = new Client();
		let resolved = false;

		// TCP server bound to ephemeral port
		const tcpServer = createServer((socket) => {
			if (entry.closed) {
				socket.destroy();
				return;
			}

			resetIdleTimer(entry);

			sshClient.forwardOut(
				'127.0.0.1',
				0,
				remoteHost,
				remotePort,
				(err: Error | undefined, stream: ClientChannel) => {
					if (err) {
						socket.destroy();
						return;
					}
					socket.pipe(stream);
					stream.pipe(socket);
					socket.on('close', () => stream.destroy());
					stream.on('close', () => socket.destroy());
					socket.on('error', () => stream.destroy());
					stream.on('error', () => socket.destroy());
				}
			);
		});

		const entry: ActiveTunnel = {
			server: tcpServer,
			client: sshClient,
			localPort: 0,
			idleTimer: null,
			reconnectAttempts: 0,
			closed: false,
		};

		tcpServer.listen(0, '127.0.0.1', () => {
			const addr = tcpServer.address();
			if (!addr || typeof addr === 'string') {
				reject(new SSHError('Failed to bind TCP server for SSH tunnel'));
				return;
			}
			entry.localPort = addr.port;
		});

		tcpServer.on('error', (err) => {
			if (!resolved) {
				reject(new SSHError(`SSH tunnel TCP server error: ${err.message}`));
			}
		});

		sshClient.on('ready', () => {
			entry.reconnectAttempts = 0;
			tunnelRegistry.set(key, entry);
			resetIdleTimer(entry);

			if (!resolved) {
				resolved = true;
				resolve({
					localPort: entry.localPort,
					close: async () => {
						if (!entry.closed) {
							entry.closed = true;
							if (entry.idleTimer) clearTimeout(entry.idleTimer);
							tunnelRegistry.delete(key);
							tcpServer.close();
							sshClient.end();
						}
					},
				});
			}
		});

		sshClient.on('error', (err) => {
			if (!resolved) {
				resolved = true;
				reject(new SSHError(`SSH connection error: ${err.message}`));
				return;
			}
			// Auto-reconnect on error after initial connection
			scheduleReconnect(entry, key, sshConfig, remoteHost, remotePort);
		});

		sshClient.on('close', () => {
			if (!entry.closed) {
				scheduleReconnect(entry, key, sshConfig, remoteHost, remotePort);
			}
		});

		sshClient.connect(buildConnectConfig(sshConfig));
	});
}

function scheduleReconnect(
	entry: ActiveTunnel,
	key: string,
	sshConfig: SSHTunnelConfig,
	remoteHost: string,
	remotePort: number
): void {
	if (entry.closed || entry.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
		entry.closed = true;
		entry.server.close();
		tunnelRegistry.delete(key);
		return;
	}

	entry.reconnectAttempts++;
	setTimeout(() => {
		if (entry.closed) return;
		const newClient = new Client();
		entry.client = newClient;

		newClient.on('ready', () => {
			entry.reconnectAttempts = 0;
			resetIdleTimer(entry);
		});

		newClient.on('error', () => {
			scheduleReconnect(entry, key, sshConfig, remoteHost, remotePort);
		});

		newClient.on('close', () => {
			if (!entry.closed) {
				scheduleReconnect(entry, key, sshConfig, remoteHost, remotePort);
			}
		});

		newClient.connect(buildConnectConfig(sshConfig));
	}, RECONNECT_DELAY_MS);
}

export async function closeTunnel(tunnelKey: string): Promise<void> {
	const entry = tunnelRegistry.get(tunnelKey);
	if (entry && !entry.closed) {
		entry.closed = true;
		if (entry.idleTimer) clearTimeout(entry.idleTimer);
		entry.server.close();
		entry.client.end();
		tunnelRegistry.delete(tunnelKey);
	}
}

export function getTunnelLocalPort(tunnelKey: string): number | undefined {
	return tunnelRegistry.get(tunnelKey)?.localPort;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
	for (const [, entry] of tunnelRegistry) {
		if (!entry.closed) {
			entry.closed = true;
			if (entry.idleTimer) clearTimeout(entry.idleTimer);
			entry.server.close();
			entry.client.end();
		}
	}
	tunnelRegistry.clear();
});
