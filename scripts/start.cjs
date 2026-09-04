const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const serverBundle = path.join(__dirname, '..', 'dist', 'server.cjs');

if (!existsSync(serverBundle)) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const build = spawnSync(npmCommand, ['run', 'build'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (build.error) throw build.error;
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const server = spawnSync(process.execPath, [serverBundle], { stdio: 'inherit' });
if (server.error) throw server.error;
process.exit(server.status ?? 1);