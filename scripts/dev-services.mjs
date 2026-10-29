import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, '..');
const runtimeRoot = path.join(repositoryRoot, '.runtime');
const postgresData = path.join(runtimeRoot, 'postgres-data');
const redisRoot = path.join(runtimeRoot, 'redis', 'Redis-8.10.2-Windows-x64-msys2');
const redisServer = path.join(redisRoot, 'redis-server.exe');
const redisCli = path.join(redisRoot, 'redis-cli.exe');
// Dedicated high ports distinguish 1hrLearning from other local projects using conventional defaults.
const postgresPort = Number(process.env.POSTGRES_PORT || 55432);
const redisPort = Number(process.env.REDIS_PORT || 56379);
const postgresPassword = process.env.POSTGRES_PASSWORD || 'postgres';
const redisPassword = process.env.REDIS_PASSWORD || 'redis';

function isPortOpen(port) {
  return new Promise((resolve) => {
    // A short loopback probe identifies occupied ports without inspecting or touching their owners.
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

function createPostgres() {
  return new EmbeddedPostgres({
    databaseDir: postgresData,
    user: 'postgres',
    password: postgresPassword,
    port: postgresPort,
    persistent: true,
    authMethod: 'scram-sha-256',
    postgresFlags: ['-c', 'listen_addresses=127.0.0.1'],
    onLog: (message) => process.stdout.write(`[postgres] ${message}`),
    onError: (error) => console.error('[postgres]', error),
  });
}

async function ensureApplicationDatabase(postgres) {
  const client = postgres.getPgClient();
  await client.connect();
  try {
    const result = await client.query("SELECT 1 FROM pg_database WHERE datname = '1hrlearning'");
    if (result.rowCount === 0) {
      // The application database is created once; persisted data is deliberately retained across runs.
      await postgres.createDatabase('1hrlearning');
    }
  } finally {
    await client.end();
  }
}

async function start() {
  const occupied = [];
  if (await isPortOpen(postgresPort)) occupied.push(`PostgreSQL port ${postgresPort}`);
  if (await isPortOpen(redisPort)) occupied.push(`Redis port ${redisPort}`);
  if (occupied.length > 0) {
    throw new Error(`${occupied.join(' and ')} already occupied; refusing to interfere with another service.`);
  }
  if (!existsSync(redisServer) || !existsSync(redisCli)) {
    throw new Error(`Portable Redis runtime is missing from ${redisRoot}.`);
  }

  await mkdir(runtimeRoot, { recursive: true });
  const postgres = createPostgres();
  if (!existsSync(path.join(postgresData, 'PG_VERSION'))) {
    await postgres.initialise();
  }
  await postgres.start();
  await ensureApplicationDatabase(postgres);

  // Explicit loopback binding and protected mode keep the test Redis instance local to this machine.
  const redis = spawn(redisServer, [
    '--bind', '127.0.0.1',
    '--port', String(redisPort),
    '--protected-mode', 'yes',
    '--requirepass', redisPassword,
    '--save', '',
    '--appendonly', 'no',
  ], { cwd: redisRoot, stdio: ['ignore', 'pipe', 'pipe'] });
  redis.stdout.on('data', (chunk) => process.stdout.write(`[redis] ${chunk}`));
  redis.stderr.on('data', (chunk) => process.stderr.write(`[redis] ${chunk}`));

  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 10_000;
    const probe = () => {
      const result = spawnSync(redisCli, ['-h', '127.0.0.1', '-p', String(redisPort), '-a', redisPassword, '--no-auth-warning', 'PING'], {
        cwd: redisRoot,
        encoding: 'utf8',
      });
      if (result.status === 0 && result.stdout.trim() === 'PONG') return resolve();
      if (redis.exitCode !== null) return reject(new Error('Redis exited before becoming ready.'));
      if (Date.now() >= deadline) return reject(new Error('Redis did not become ready within 10 seconds.'));
      setTimeout(probe, 200);
    };
    probe();
  });

  console.log(`\n1hrLearning services ready: PostgreSQL ${postgresPort}, Redis ${redisPort}. Press Ctrl+C to stop.`);
  const shutdown = async () => {
    // Only child processes created by this supervisor are stopped, preserving unrelated Codex and app processes.
    if (redis.exitCode === null) redis.kill();
    await postgres.stop();
    process.exit(0);
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
  redis.once('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`Redis exited unexpectedly with code ${code}.`);
  });
}

async function status() {
  const postgresOpen = await isPortOpen(postgresPort);
  const redisOpen = await isPortOpen(redisPort);
  let redisHealthy = false;
  if (redisOpen && existsSync(redisCli)) {
    const result = spawnSync(redisCli, ['-h', '127.0.0.1', '-p', String(redisPort), '-a', redisPassword, '--no-auth-warning', 'PING'], {
      cwd: redisRoot,
      encoding: 'utf8',
    });
    redisHealthy = result.status === 0 && result.stdout.trim() === 'PONG';
  }
  console.log(JSON.stringify({
    postgres: postgresOpen ? 'reachable' : 'stopped',
    redis: redisHealthy ? 'healthy' : redisOpen ? 'reachable-but-unhealthy' : 'stopped',
  }, null, 2));
  if (!postgresOpen || !redisHealthy) process.exitCode = 1;
}

const command = process.argv[2];
if (command === 'start') {
  start().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else if (command === 'status') {
  status().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
} else {
  console.error('Usage: node scripts/dev-services.mjs <start|status>');
  process.exit(1);
}
