import assert from 'node:assert/strict';
import type { SessionStatus } from '@prisma/client';
import { assertSessionUpdateAllowed } from '../services/session-transition';
import { AppError } from '../types';

console.log('\n🔐 Session Transition Policy Tests\n');

const statuses: SessionStatus[] = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'RATED'];
const allowed = new Set([
  'PENDING:CONFIRMED:teacher',
  'PENDING:CANCELLED:teacher',
  'PENDING:CANCELLED:learner',
  'CONFIRMED:IN_PROGRESS:teacher',
  'CONFIRMED:COMPLETED:teacher',
  'CONFIRMED:CANCELLED:teacher',
  'CONFIRMED:CANCELLED:learner',
  'CONFIRMED:NO_SHOW:teacher',
  'IN_PROGRESS:COMPLETED:teacher',
  'IN_PROGRESS:CANCELLED:teacher',
  'IN_PROGRESS:CANCELLED:learner',
  'IN_PROGRESS:NO_SHOW:teacher',
]);

let checked = 0;
for (const currentStatus of statuses) {
  for (const targetStatus of statuses) {
    for (const role of ['teacher', 'learner'] as const) {
      const key = `${currentStatus}:${targetStatus}:${role}`;
      const attempt = () => assertSessionUpdateAllowed({
        currentStatus,
        role,
        hasLearner: true,
        // The cast lets this negative matrix exercise values excluded by the public validator, including RATED.
        input: { status: targetStatus as 'CONFIRMED' },
      });
      if (allowed.has(key)) assert.doesNotThrow(attempt, key);
      else assert.throws(attempt, AppError, key);
      checked++;
    }
  }
}

assert.throws(
  () => assertSessionUpdateAllowed({ currentStatus: 'PENDING', role: 'teacher', hasLearner: false, input: { status: 'CONFIRMED' } }),
  AppError,
  'A public session without a selected learner cannot be confirmed',
);
assert.doesNotThrow(() => assertSessionUpdateAllowed({
  currentStatus: 'PENDING', role: 'teacher', hasLearner: true, input: { scheduledAt: new Date().toISOString() },
}));
assert.throws(() => assertSessionUpdateAllowed({
  currentStatus: 'PENDING', role: 'learner', hasLearner: true, input: { scheduledAt: new Date().toISOString() },
}), AppError);
assert.throws(() => assertSessionUpdateAllowed({
  currentStatus: 'COMPLETED', role: 'teacher', hasLearner: true, input: { meetingUrl: 'https://example.com' },
}), AppError);
assert.throws(() => assertSessionUpdateAllowed({
  currentStatus: 'CONFIRMED', role: 'learner', hasLearner: true, input: { notes: 'Changed' },
}), AppError);
assert.throws(() => assertSessionUpdateAllowed({
  currentStatus: 'PENDING', role: 'teacher', hasLearner: true, input: { cancelReason: 'Changed later' },
}), AppError);

console.log(`✓ Checked ${checked} state/role combinations plus protected field rules`);
console.log('\n✅ All session transition policy tests passed!\n');
