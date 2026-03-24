const { readdirSync } = require('fs');
const { spawnSync } = require('child_process');

const base = 'src/__tests__';
let files = [];

try {
  files = readdirSync(base)
    .filter((file) => file.endsWith('.test.ts'))
    .sort();
} catch (error) {
  console.error(`Unable to read test directory: ${base}`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (files.length === 0) {
  console.error('No test files found in src/__tests__');
  process.exit(1);
}

for (const file of files) {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['ts-node-dev', '--transpile-only', `${base}/${file}`], {
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
