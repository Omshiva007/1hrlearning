/**
 * Unit tests for validation middleware and AppError behavior.
 * Run with: npx ts-node-dev --transpile-only src/__tests__/validate.test.ts
 */

import { z } from 'zod';
import { validate } from '../middleware/validate';
import { AppError } from '../types';

type MockRequest = {
  body: unknown;
  query: unknown;
  params: unknown;
};

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
  console.log(`  ✓ ${message}`);
}

function createNextSpy() {
  const calls: unknown[] = [];
  return {
    next: (arg?: unknown) => calls.push(arg),
    callCount: () => calls.length,
    firstArg: () => calls[0],
  };
}

console.log('\n🧪 Validate Middleware + AppError Tests\n');

// Test 1: body validation success parses and sanitizes input
{
  console.log('Test 1: Body validation success mutates req.body with parsed data');
  const schema = z.object({
    age: z.coerce.number().int().positive(),
    name: z.string().min(1),
  });

  const req: MockRequest = {
    body: { age: '25', name: 'Om', extra: 'remove-me' },
    query: {},
    params: {},
  };

  const spy = createNextSpy();
  validate(schema, 'body')(req as never, {} as never, spy.next as never);

  assert(spy.callCount() === 1, 'next should be called once');
  assert(spy.firstArg() === undefined, 'next should be called without error on valid input');

  const parsedBody = req.body as { age: number; name: string; extra?: string };
  assert(parsedBody.age === 25, 'age should be coerced to number');
  assert(parsedBody.name === 'Om', 'name should be preserved');
  assert(!('extra' in parsedBody), 'unknown keys should be stripped by zod object parsing');
}

// Test 2: query validation works when target is query
{
  console.log('\nTest 2: Query validation validates and mutates req.query');
  const schema = z.object({
    page: z.coerce.number().int().min(1),
  });

  const req: MockRequest = {
    body: {},
    query: { page: '3' },
    params: {},
  };

  const spy = createNextSpy();
  validate(schema, 'query')(req as never, {} as never, spy.next as never);

  assert(spy.callCount() === 1, 'next should be called once for valid query');
  assert(spy.firstArg() === undefined, 'next should receive no error for valid query');
  assert((req.query as { page: number }).page === 3, 'page should be coerced to number in req.query');
}

// Test 3: invalid input returns AppError(422) with grouped field errors
{
  console.log('\nTest 3: Validation failure forwards AppError with 422 and grouped errors');
  const schema = z.object({
    email: z.string().email().min(8),
    profile: z.object({
      timezone: z.string().min(3),
    }),
  });

  const req: MockRequest = {
    body: { email: 'x', profile: { timezone: '' } },
    query: {},
    params: {},
  };

  const spy = createNextSpy();
  validate(schema, 'body')(req as never, {} as never, spy.next as never);

  assert(spy.callCount() === 1, 'next should be called once for invalid input');

  const err = spy.firstArg();
  assert(err instanceof AppError, 'error should be an AppError');

  const appErr = err as AppError;
  assert(appErr.statusCode === 422, 'status code should be 422');
  assert(appErr.message === 'Validation failed', 'error message should be Validation failed');
  assert(Boolean(appErr.errors?.email?.length), 'email path should contain one or more messages');
  assert(Boolean(appErr.errors?.['profile.timezone']?.length), 'nested path should be dot-joined in errors');
}

// Test 4: AppError defaults are correct
{
  console.log('\nTest 4: AppError default values');
  const err = new AppError('Something went wrong');

  assert(err.statusCode === 500, 'default statusCode should be 500');
  assert(err.isOperational === true, 'AppError should be operational');
  assert(err.errors === undefined, 'errors should be undefined when not provided');
}

console.log('\n✅ All validate/AppError tests passed!\n');
