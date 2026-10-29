import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const npmEntryPoint = process.env.npm_execpath;
const services = [
  { name: 'PostgreSQL', port: 55432 },
  { name: 'Redis', port: 56379 },
  { name: 'API', port: 4000 },
  { name: 'frontend', port: 3100 },
  { name: 'admin', port: 3101 },
];
const children = [];
let shuttingDown = false;

function localCredentialEncryptionKey() {
  const keyPath = path.join(process.cwd(), '.runtime', 'email-credential-encryption.key');
  mkdirSync(path.dirname(keyPath), { recursive: true });
  if (!existsSync(keyPath)) {
    // A machine-local untracked key protects real test credentials without weakening production secret requirements.
    writeFileSync(keyPath, randomBytes(32).toString('hex'), { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  }
  const key = readFileSync(keyPath, 'utf8').trim();
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error(`Invalid local credential key at ${keyPath}.`);
  return key;
}

function canConnect(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

async function assertPortsAvailable(entries) {
  const occupied = [];
  for (const entry of entries) {
    if (await canConnect(entry.port)) occupied.push(`${entry.name} (${entry.port})`);
  }
  if (occupied.length > 0) {
    throw new Error(`Refusing to start because these 1hrLearning ports are occupied: ${occupied.join(', ')}.`);
  }
}

function run(label, args, environment) {
  if (!npmEntryPoint) throw new Error('npm_execpath is unavailable; start this stack through npm run dev.');
  // Running npm through Node avoids Windows .cmd shell semantics and keeps the spawned PID attributable.
  const child = spawn(process.execPath, [npmEntryPoint, ...args], {
    cwd: process.cwd(),
    env: { ...process.env, ...environment },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  child.once('exit', (code) => {
    if (!shuttingDown && code !== 0) {
      console.error(`[${label}] exited unexpectedly with code ${code}.`);
      void shutdown(1);
    }
  });
  return child;
}

function runOnce(label, args, environment) {
  return new Promise((resolve, reject) => {
    if (!npmEntryPoint) return reject(new Error('npm_execpath is unavailable; start this stack through npm run dev.'));
    const child = spawn(process.execPath, [npmEntryPoint, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...environment },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => process.stdout.write(`[${label}] ${chunk}`));
    child.stderr.on('data', (chunk) => process.stderr.write(`[${label}] ${chunk}`));
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${label} exited with code ${code}.`)));
  });
}

async function waitFor(entries, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Map(entries.map((entry) => [entry.port, entry]));
  while (pending.size > 0 && Date.now() < deadline) {
    for (const [port] of pending) {
      if (await canConnect(port)) pending.delete(port);
    }
    if (pending.size > 0) await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (pending.size > 0) {
    throw new Error(`Timed out waiting for: ${[...pending.values()].map((entry) => entry.name).join(', ')}.`);
  }
}

async function stopChildTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    // The PID belongs to a child created above; terminating its tree avoids orphaned Next/Node workers.
    await new Promise((resolve) => {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).once('exit', resolve);
    });
  } else {
    child.kill('SIGTERM');
  }
}

function runQuiet(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), stdio: 'ignore' });
    child.once('error', () => resolve());
    child.once('exit', () => resolve());
  });
}

async function stopInfrastructure() {
  // Stop stateful services through their own protocols before cleaning up the supervisor process tree.
  const redisCli = path.join(process.cwd(), '.runtime', 'redis', 'Redis-8.10.2-Windows-x64-msys2', 'redis-cli.exe');
  const pgCtl = path.join(process.cwd(), 'node_modules', '@embedded-postgres', 'windows-x64', 'native', 'bin', 'pg_ctl.exe');
  await runQuiet(redisCli, ['-h', '127.0.0.1', '-p', '56379', '-a', 'redis', '--no-auth-warning', 'SHUTDOWN', 'NOSAVE']);
  await runQuiet(pgCtl, ['stop', '-D', path.join(process.cwd(), '.runtime', 'postgres-data'), '-m', 'fast', '-w']);
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  await stopInfrastructure();
  await Promise.all([...children].reverse().map(stopChildTree));
  process.exit(exitCode);
}

async function main() {
  await assertPortsAvailable(services);
  run('services', ['run', 'services:start']);
  await waitFor(services.slice(0, 2), 60_000);

  const backendEnvironment = {
    NODE_ENV: 'development',
    PORT: '4000',
    DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:55432/1hrlearning',
    REDIS_URL: 'redis://:redis@127.0.0.1:56379',
    JWT_SECRET: '1hrlearning-local-jwt-secret-32-characters',
    JWT_REFRESH_SECRET: '1hrlearning-local-refresh-secret-32-characters',
    EMAIL_CREDENTIAL_ENCRYPTION_KEY: localCredentialEncryptionKey(),
    CORS_ORIGINS: 'http://localhost:3100,http://localhost:3101',
    APP_URL: 'http://localhost:3100',
  };
  const webEnvironment = {
    NEXT_PUBLIC_API_URL: 'http://localhost:4000/api/v1',
    NEXT_PUBLIC_WS_URL: 'http://localhost:4000',
    BACKEND_URL: 'http://localhost:4000',
    NEXTAUTH_URL: 'http://localhost:3100',
    NEXTAUTH_SECRET: '1hrlearning-local-nextauth-secret-32-chars',
  };

  // Applying committed migrations and the repair-capable seed makes a fresh checkout usable from one command.
  await runOnce('prisma', ['run', 'prisma:generate', '--workspace=@1hrlearning/backend'], backendEnvironment);
  await runOnce('migrate', ['run', 'prisma:deploy', '--workspace=@1hrlearning/backend'], backendEnvironment);
  await runOnce('seed', ['run', 'db:seed', '--workspace=@1hrlearning/backend'], backendEnvironment);

  run('api', ['run', 'dev:backend'], backendEnvironment);
  run('frontend', ['run', 'dev:frontend'], webEnvironment);
  run('admin', ['run', 'dev:admin'], webEnvironment);
  await waitFor(services.slice(2));

  // The named banner prevents confusing these URLs with another app using conventional ports.
  console.log('\n1hrLearning development stack is ready:');
  console.log('  User app: http://localhost:3100');
  console.log('  Admin:    http://localhost:3101');
  console.log('  API:      http://localhost:4000');
  console.log('Press Ctrl+C to stop only this stack.');
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  void shutdown(1);
});
