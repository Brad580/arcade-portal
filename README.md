# The Arcade of Fun

[Live demo](https://brad-arcade.netlify.app/) | [GitHub repository](https://github.com/Brad580/arcade-portal)

The Arcade of Fun is a browser arcade with two playable games, user accounts, protected score submission, player sessions, and per-game leaderboards. It combines a responsive JavaScript frontend with an Express and SQLite backend.

## Verified project evidence

- Two playable games: Snake and a dice-based D&D challenge
- Seven Express API routes for health, signup, login, logout, sessions, scores, and leaderboards
- Four SQLite tables with foreign-key enforcement: users, scores, sessions, and rate-limit buckets
- bcrypt password hashing with a cost factor of 10
- Top-10 leaderboards using each player's highest score
- Three automated API tests using Node's built-in test runner
- 32 KB JSON request limit, explicit CORS allowlist, protected cookies, persistent sessions, database-backed rate limiting, and production secret enforcement

## Features

- Account creation and login with normalized email addresses
- Server-managed sessions and an authenticated `/me` workflow
- Protected score submissions for supported games
- Per-game leaderboard queries sorted by score and username
- Responsive arcade interface with independent game modules
- Environment-based client origin, database path, port, and session secret

## Architecture

```text
Browser games and account interface
              |
              | JSON + session cookie
              v
Express API (7 routes)
              |
              v
SQLite (users + scores + sessions + rate limits)
```

## Run locally

```bash
cp .env.example .env
npm install
npm test
npm start
```

Open the frontend through a local static server and set its API URL to the Express address when needed.

## Security notes

- Never commit `.env`, `.db`, `.db-shm`, or `.db-wal` files.
- Use a long random `SESSION_SECRET` in deployment settings.
- Production cookies require HTTPS and use `SameSite=None` for the separately hosted frontend and API.
- Sessions and authentication/score rate-limit buckets use the configured SQLite database so they persist with the application data.
- Mount the production database on persistent storage and point `DATABASE_PATH` to that mounted location.

The clean portfolio source intentionally excludes environment and SQLite runtime files. The deployment secret belongs only in the hosting provider's encrypted environment settings.
