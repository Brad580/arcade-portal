process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test_secret_not_for_production';
process.env.DATABASE_PATH = ':memory:';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { app } = require('../server');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('reports a healthy backend without exposing Express headers', async () => {
  const response = await fetch(`${baseUrl}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.deepEqual(await response.json(), { message: 'Arcade backend is running.' });
});

test('protects score submissions from unauthenticated requests', async () => {
  const response = await fetch(`${baseUrl}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameName: 'snake', score: 50 })
  });
  assert.equal(response.status, 401);
});

test('creates a user, stores a score, and returns the leaderboard', async () => {
  const signup = await fetch(`${baseUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test-player', email: 'player@example.com', password: 'portfolio-test' })
  });
  assert.equal(signup.status, 201);
  const cookie = signup.headers.get('set-cookie').split(';', 1)[0];

  const score = await fetch(`${baseUrl}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ gameName: 'snake', score: 125 })
  });
  assert.equal(score.status, 201);

  const leaderboard = await fetch(`${baseUrl}/leaderboard/snake`);
  assert.equal(leaderboard.status, 200);
  assert.deepEqual(await leaderboard.json(), {
    leaderboard: [{ username: 'test-player', score: 125 }]
  });
});
