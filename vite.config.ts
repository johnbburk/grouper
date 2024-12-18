import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/tests/setup.ts']
	},
	optimizeDeps: {
		exclude: ['svelte-dnd-action']
	},
	build: {
		rollupOptions: {
			external: [
				'@node-rs/argon2',
				'@oslojs/encoding',
				'lucia'
			]
		}
	},
	ssr: {
		noExternal: [
			'@node-rs/argon2',
			'@oslojs/encoding',
			'lucia'
		]
	}
});
