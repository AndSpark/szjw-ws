import { defineConfig } from 'vite'
import { name } from './package.json'
import dtsPlugin from 'vite-plugin-dts'

export default defineConfig(({ command, mode }) => {
	return {
		plugins: [dtsPlugin({ outputDir: 'types' })],
		server: {
			open: '/',
		},
		build: {
			target: 'es2015',
			sourcemap: true,
			lib: {
				entry: 'src/index.ts',
				name,
				fileName: name,
				formats: ['es', 'cjs'],
			},
			rollupOptions: {
				external: ['vue', 'injection-js', 'rxjs', 'vue3-oop'],
			},
			minify: true,
		},
	}
})
