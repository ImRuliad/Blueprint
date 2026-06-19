#!/usr/bin/env bun
import { parseArgs } from 'util';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const { values } = parseArgs({
	options: {
		port: { type: 'string', short: 'p', default: '3000' },
		host: { type: 'string', short: 'H', default: '127.0.0.1' },
		'data-dir': { type: 'string', short: 'd' },
		version: { type: 'boolean', short: 'v', default: false },
		help: { type: 'boolean', short: 'h', default: false },
	},
	strict: true,
});

if (values.help) {
	console.log(`
Blueprint - Database GUI

Usage: blueprint [options]

Options:
  -p, --port <port>        Port to listen on (default: 3000)
  -H, --host <host>        Host to bind to (default: 127.0.0.1)
                            WARNING: Only 127.0.0.1 and ::1 are allowed.
  -d, --data-dir <path>    Data directory (default: ~/.blueprint)
  -v, --version            Show version
  -h, --help               Show this help
`);
	process.exit(0);
}

if (values.version) {
	try {
		const pkgPath = resolve(import.meta.dir, '..', 'package.json');
		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
		console.log(`blueprint v${pkg.version}`);
	} catch {
		console.log('blueprint (version unknown)');
	}
	process.exit(0);
}

const host = values.host ?? '127.0.0.1';
if (host !== '127.0.0.1' && host !== '::1') {
	console.error('ERROR: Blueprint can only bind to 127.0.0.1 or ::1 for security.');
	process.exit(1);
}

const port = values.port ?? '3000';
process.env.PORT = port;
process.env.HOST = host;
if (values['data-dir']) {
	process.env.BLUEPRINT_DATA_DIR = resolve(values['data-dir']);
}

console.log(`Blueprint starting at http://${host}:${port}`);
try {
	await import('../build/index.js');
} catch (err) {
	if (err instanceof Error && 'code' in err && (err as any).code === 'ERR_MODULE_NOT_FOUND') {
		console.error('ERROR: Blueprint has not been built yet. Run "bun run build" first.');
	} else {
		console.error('ERROR: Blueprint failed to start.\n', err);
	}
	process.exit(1);
}
