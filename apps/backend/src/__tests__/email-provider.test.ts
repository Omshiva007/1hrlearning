import assert from 'node:assert/strict';

process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:55432/1hrlearning';
process.env.REDIS_URL ??= 'redis://:redis@127.0.0.1:56379';
process.env.JWT_SECRET ??= 'test-jwt-secret-that-is-at-least-32-characters';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-that-is-at-least-32-characters';
process.env.EMAIL_CREDENTIAL_ENCRYPTION_KEY = 'ab'.repeat(32);

// Require after environment setup because application configuration is intentionally parsed at module load.
const { encryptEmailCredential, decryptEmailCredential } = require('../services/email-provider.service') as typeof import('../services/email-provider.service');

console.log('\n✉️  Email Provider Credential Tests\n');

const secret = 're_live_private-provider-key';
const encryptedA = encryptEmailCredential(secret);
const encryptedB = encryptEmailCredential(secret);
assert.notEqual(encryptedA, secret, 'ciphertext must not expose the credential');
assert.notEqual(encryptedA, encryptedB, 'unique IVs must produce different ciphertext for the same credential');
assert.equal(decryptEmailCredential(encryptedA), secret, 'encrypted credentials must round-trip');

const parts = encryptedA.split('.');
// Mutate a significant base64 character rather than trailing pad bits, which can decode to the same bytes.
parts[2] = `${parts[2]!.startsWith('A') ? 'B' : 'A'}${parts[2]!.slice(1)}`;
assert.throws(() => decryptEmailCredential(parts.join('.')), 'authenticated encryption must reject tampered ciphertext');

console.log('✓ Credentials are encrypted with unique IVs and authenticated against tampering');
