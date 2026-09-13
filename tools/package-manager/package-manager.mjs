import { spawnSync } from 'node:child_process';

/**
 * 親の package script を起動した npm / pnpm を引き継いで script を実行する。
 * npm_execpath を直接 Node.js で起動し、PATH 上の別 package manager には依存しない。
 */
export function runPackageScript(script, options = {}) {
  const packageManager = resolvePackageManager();
  const args = createRunArguments(packageManager.name, script, options.workspace, options.args ?? []);
  const result = spawnSync(packageManager.command, [...packageManager.prefixArgs, ...args], {
    cwd: options.cwd,
    env: process.env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${packageManager.name} ${args.join(' ')}`);
  }
}

function resolvePackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? '';
  const execPath = process.env.npm_execpath;
  const name = userAgent.startsWith('pnpm/') || execPath?.toLowerCase().includes('pnpm') ? 'pnpm' : 'npm';

  if (execPath) {
    return { name, command: process.execPath, prefixArgs: [execPath] };
  }

  return {
    name,
    command: process.platform === 'win32' ? `${name}.cmd` : name,
    prefixArgs: [],
  };
}

function createRunArguments(name, script, workspace, scriptArgs) {
  if (name === 'pnpm') {
    return [...(workspace ? ['--filter', workspace] : []), 'run', script, ...scriptArgs];
  }

  return ['run', script, ...(workspace ? ['--workspace', workspace] : []), ...(scriptArgs.length ? ['--', ...scriptArgs] : [])];
}
