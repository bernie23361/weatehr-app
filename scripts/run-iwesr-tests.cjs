const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..');
const build = path.join(root, '.iwesr-test-build');
fs.rmSync(build, { recursive: true, force: true });
try {
  const compile = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '-p', path.join(root, 'src/weather-scene/tsconfig.test.json')], { stdio: 'inherit' });
  if (compile.status) process.exit(compile.status);
  const test = spawnSync(process.execPath, [path.join(build, '__tests__/run-tests.js')], { stdio: 'inherit' });
  process.exitCode = test.status ?? 1;
} finally { fs.rmSync(build, { recursive: true, force: true }); }
