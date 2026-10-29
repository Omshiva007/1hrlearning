import assert from 'node:assert/strict';

const apiBase = process.env.API_ACCEPTANCE_URL ?? 'http://127.0.0.1:4000/api/v1';

type JsonObject = Record<string, any>;

async function request(path: string, options: RequestInit = {}): Promise<{ status: number; body: JsonObject | string }> {
  const response = await fetch(`${apiBase}${path}`, options);
  const text = await response.text();
  let body: JsonObject | string = text;
  if (text) {
    try { body = JSON.parse(text) as JsonObject; } catch { /* Calendar responses are intentionally plain text. */ }
  }
  return { status: response.status, body };
}

function auth(token: string, options: RequestInit = {}): RequestInit {
  return { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers } };
}

async function login(email: string, password: string): Promise<JsonObject> {
  const result = await request('/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
  });
  assert.equal(result.status, 200, `login failed for ${email}`);
  return (result.body as JsonObject).data;
}

async function main(): Promise<void> {
  const unauthenticated = await request('/auth/me');
  assert.equal(unauthenticated.status, 401, 'protected endpoints must reject missing credentials');

  const [alice, carol, admin] = await Promise.all([
    login('alice@example.com', 'Password123!'),
    login('carol@example.com', 'Password123!'),
    login('admin@1hrlearning.com', 'Admin@1hrLearning2024!'),
  ]);

  const [me, skills, aliceSkills, availability, matches, points, notifications] = await Promise.all([
    request('/auth/me', auth(alice.accessToken)),
    request('/skills?limit=100'),
    request(`/users/${alice.user.id}/skills`),
    request(`/availability/${alice.user.id}`, auth(carol.accessToken)),
    request('/users/matches?limit=20', auth(alice.accessToken)),
    request('/points/balance', auth(alice.accessToken)),
    request('/notifications?limit=20', auth(alice.accessToken)),
  ]);
  assert.equal(me.status, 200);
  assert.equal((me.body as JsonObject).data.id, alice.user.id);
  assert.equal(skills.status, 200);
  assert.ok((skills.body as JsonObject).data.length >= 39, 'seeded skill catalogue must be available');
  assert.equal(aliceSkills.status, 200);
  assert.ok((aliceSkills.body as JsonObject).data.some((entry: JsonObject) => entry.isTeaching));
  assert.equal(availability.status, 200);
  assert.ok((availability.body as JsonObject).data.every((slot: JsonObject) => slot.status === 'OPEN'));
  assert.equal(matches.status, 200);
  assert.ok((matches.body as JsonObject).data.every((match: JsonObject) => match.userId !== alice.user.id));
  assert.ok((matches.body as JsonObject).data.every((match: JsonObject) => match.user.isDiscoverable !== false));
  assert.equal(points.status, 200);
  assert.equal(notifications.status, 200);

  const discovery = await request('/sessions/discover?limit=20', auth(carol.accessToken));
  assert.equal(discovery.status, 200);
  const publicSession = (discovery.body as JsonObject).data.find((session: JsonObject) => session.teacherId === alice.user.id);
  assert.ok(publicSession, 'Carol must discover Alice\'s future public React session');
  assert.ok(new Date(publicSession.scheduledAt).getTime() > Date.now());
  assert.ok(new Date(publicSession.applicationDeadline).getTime() > Date.now());

  const duplicateApplication = await request(`/sessions/${publicSession.id}/apply`, auth(carol.accessToken, {
    method: 'POST', body: JSON.stringify({ message: 'Duplicate acceptance-test application' }),
  }));
  assert.ok([400, 409].includes(duplicateApplication.status), 'duplicate public applications must be rejected');

  const calendar = await request(`/sessions/${publicSession.id}/calendar.ics`, auth(alice.accessToken));
  assert.equal(calendar.status, 200);
  assert.match(String(calendar.body), /BEGIN:VCALENDAR/);

  const [userAdminAttempt, adminDashboard, providers, audit] = await Promise.all([
    request('/admin/dashboard', auth(alice.accessToken)),
    request('/admin/dashboard', auth(admin.accessToken)),
    request('/admin/email-providers', auth(admin.accessToken)),
    request('/admin/audit-log?limit=20', auth(admin.accessToken)),
  ]);
  assert.equal(userAdminAttempt.status, 403, 'ordinary users must not access administration');
  assert.equal(adminDashboard.status, 200);
  assert.equal(providers.status, 200);
  assert.ok(Array.isArray((providers.body as JsonObject).data), 'provider status must use a stable list contract');
  assert.ok(!JSON.stringify(providers.body).includes('encryptedApiKey'), 'encrypted credentials must never leave the API');
  assert.equal(audit.status, 200);

  // Refresh tokens rotate once; reuse and post-logout refreshes must both fail.
  const refresh = await request('/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: alice.refreshToken }),
  });
  assert.equal(refresh.status, 200);
  const rotated = (refresh.body as JsonObject).data;
  const reuse = await request('/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: alice.refreshToken }),
  });
  assert.equal(reuse.status, 401);
  const logout = await request('/auth/logout', auth(rotated.accessToken, {
    method: 'POST', body: JSON.stringify({ refreshToken: rotated.refreshToken }),
  }));
  assert.equal(logout.status, 200);
  const afterLogout = await request('/auth/refresh', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken: rotated.refreshToken }),
  });
  assert.equal(afterLogout.status, 401);

  console.log('✅ API acceptance: auth rotation, catalogue, availability, matching/privacy, public sessions, points, notifications, calendar, and admin gates passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
