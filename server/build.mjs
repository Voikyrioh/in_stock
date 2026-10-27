import * as esbuild from 'esbuild'

await esbuild.build({
	// The probe ships in the image: `docker exec in-stock node dist/tools/probe.js all "rtx 4070"`
	// reads the shops from the server's own address (runbook sonder-les-boutiques).
	entryPoints: ['src/index.ts', 'src/tools/probe.ts'],
	bundle: true,
	platform: 'node',
	target: 'node22',
	format: 'esm',
	outdir: 'dist',
	// npm dependencies stay external (reinstalled with --omit=dev in the image);
	// the workspace package @in-stock/shared (TypeScript sources) is bundled.
	packages: 'external',
	alias: { '@in-stock/shared': '../shared/src/index.ts' },
	sourcemap: true,
})

console.log('Build complete -> dist/index.js, dist/tools/probe.js')
