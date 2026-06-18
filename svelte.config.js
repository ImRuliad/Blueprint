import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	compilerOptions: {
		// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
		runes: true
	},
	kit: {
		adapter: adapter({
			out: 'build',
			precompress: false,
			envPrefix: 'BLUEPRINT_'
		}),
		csrf: {
			trustedOrigins: []
		}
	},
	preprocess: vitePreprocess()
};

export default config;
