import { build } from 'esbuild';
await build({entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true,
  format: 'cjs', target: 'es2022', platform: 'browser', external: ['obsidian'],
  minify: false, sourcemap: false, logLevel: 'info'});
