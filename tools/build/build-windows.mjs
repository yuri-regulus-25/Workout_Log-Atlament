import { existsSync, mkdirSync, readFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(__dirname, '..', '..');
const projectPath = path.join(repositoryRoot, 'src', 'application', 'windows', 'Atlament.csproj');
const projectText = readFileSync(projectPath, 'utf8');
const version = projectText.match(/<Version>([^<]+)<\/Version>/)?.[1];

if (!version) {
  throw new Error('Atlament.csproj does not define <Version>.');
}

const runtimeIdentifier = 'win-x64';
const distributionRoot = path.join(repositoryRoot, 'dist-windows');
const publishRoot = path.join(distributionRoot, `Atlament-v${version}-${runtimeIdentifier}`);

// Windows distribution is intentionally built from the project metadata version, not package.json,
// because that is the version embedded into the executable and reported by the AF Status API.
function run(command, args) {
  const isWindowsCommandScript = process.platform === 'win32' && command.endsWith('.cmd');
  const actualCommand = isWindowsCommandScript ? process.env.ComSpec ?? 'cmd.exe' : command;
  const actualArgs = isWindowsCommandScript ? ['/d', '/s', '/c', command, ...args] : args;
  const result = spawnSync(actualCommand, actualArgs, {
    cwd: repositoryRoot,
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`);
  }
}

function removeMatching(root, predicate) {
  if (!existsSync(root)) return;
  for (const entry of readdirSync(root)) {
    const fullPath = path.join(root, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      removeMatching(fullPath, predicate);
      if (predicate(fullPath, stats)) {
        rmSync(fullPath, { recursive: true, force: true });
      }
      continue;
    }

    if (predicate(fullPath, stats)) {
      rmSync(fullPath, { force: true });
    }
  }
}

rmSync(distributionRoot, { recursive: true, force: true });
mkdirSync(publishRoot, { recursive: true });

// Build frontend first so the publish target can embed the exact static assets that will ship.
run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build']);
run('dotnet', [
  'publish',
  projectPath,
  '--configuration',
  'Release',
  '--runtime',
  runtimeIdentifier,
  '--self-contained',
  'true',
  '--output',
  publishRoot,
  '/p:AtlamentWindowsDistribution=true',
  '/p:EmbedFrontendArtifacts=true',
  '/p:PublishSingleFile=true',
  '/p:EnableCompressionInSingleFile=true',
  '/p:IncludeNativeLibrariesForSelfExtract=true'
]);

removeMatching(publishRoot, filePath => filePath.endsWith('.pdb') || filePath.endsWith('.xml'));

const executablePath = path.join(publishRoot, 'Atlament.exe');
if (!existsSync(executablePath)) {
  throw new Error(`Published executable was not found: ${executablePath}`);
}

console.log(`Windows distribution created: ${path.relative(repositoryRoot, publishRoot)}`);
