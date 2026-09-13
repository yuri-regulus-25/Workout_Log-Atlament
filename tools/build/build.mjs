import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

runNodeScript('tools/build/build-apps.mjs');
runNodeScript('tools/build/build-mpa.mjs');

function runNodeScript(relativePath) {
  const result = spawnSync(process.execPath, [path.join(repositoryRoot, relativePath)], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Script failed: ${relativePath}`);
  }
}
