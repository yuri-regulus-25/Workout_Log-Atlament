import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPackageScript } from '../package-manager/package-manager.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

runNodeScript('src/frontend/portal/build.mjs');
runNodeScript('src/frontend/errors/build.mjs');

for (const workspace of [
  '@workout-lab/workouts-vue',
  '@workout-lab/workout-manager-vue',
  '@workout-lab/dashboard-react',
  '@workout-lab/machines-angular',
  '@workout-lab/analytics-svelte',
  '@workout-lab/settings-solid',
  '@workout-lab/maintenance-vue',
]) {
  runPackageScript('build', { cwd: repositoryRoot, workspace });
}

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
