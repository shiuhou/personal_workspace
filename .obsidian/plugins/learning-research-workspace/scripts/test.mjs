import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir = await mkdtemp(join(tmpdir(), 'lr-workspace-tests-'));
try {
  const outfiles=[];
  for(const name of ['domain','actions','view','index','tasks']) {
    const outfile=join(dir,`${name}.test.cjs`);outfiles.push(outfile);
    await build({entryPoints:[`tests/${name}.test.ts`],outfile,bundle:true,platform:'node',format:'cjs',alias:{obsidian:join(process.cwd(),'tests/obsidian-stub.ts')}});
  }
  const result = spawnSync(process.execPath, ['--test', ...outfiles], {stdio: 'inherit'});
  process.exitCode = result.status ?? 1;
} finally { await rm(dir, {recursive: true, force: true}); }
