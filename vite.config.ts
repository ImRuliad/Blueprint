import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit()
	],
	resolve: {
		alias: {
			// Redirect bun:sqlite to a no-op stub when running under Node/Vite dev SSR.
			// In production the app runs under Bun (adapter-node) where bun:sqlite is native.
			'bun:sqlite': resolve('./src/lib/server/bun-sqlite-stub.ts'),
		},
	},
	ssr: {
		// Force drizzle-orm to be bundled by Vite (not passed to Node's ESM loader)
		// so that the bun:sqlite alias above applies to its internal imports.
		noExternal: ['drizzle-orm'],
	},
});
