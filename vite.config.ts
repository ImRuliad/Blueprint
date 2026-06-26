import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

const isBun = !!process.versions?.bun || typeof globalThis.Bun !== 'undefined';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	build: {
		sourcemap: process.env.NODE_ENV !== 'production',
	},
	resolve: {
		alias: isBun
			? {}
			: {
				// Redirect bun:sqlite to a no-op stub when running under Node (not Bun).
				// In production the app runs under Bun (adapter-node) where bun:sqlite is native.
				'bun:sqlite': resolve('./src/lib/server/bun-sqlite-stub.ts'),
			},
	},
	ssr: {
		// When running under Bun, let bun:sqlite resolve natively.
		// Under Node, drizzle-orm must be bundled so the stub alias applies.
		...(isBun
			? { external: ['bun:sqlite'] }
			: { noExternal: ['drizzle-orm'] }
		),
	},
});
