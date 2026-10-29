const { readdirSync } = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');

// Forward test-runner exit status so workspace automation sees the true test outcome.

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
  // Invoke the installed one-shot runner through Node so Windows never depends on .cmd shell behavior.
  const tsNodeEntry = require.resolve('ts-node/dist/bin.js');
  const result = spawnSync(process.execPath, [tsNodeEntry, '--transpile-only', path.join(base, file)], {
    stdio: 'inherit',
  });

  if (result.error) {
    console.error(`Unable to execute ${file}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
