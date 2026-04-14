require('dotenv').config();

const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');
const db = require('./arcade.db.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

app.get('/', (_req, res) => {
  res.json({ message: 'Arcade backend is running.' });
});

app.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body ?? {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const cleanUsername = String(username).trim();
    const cleanEmail = String(email).trim().toLowerCase();

    const existingUser = db
      .prepare('SELECT id FROM users WHERE username = ? OR email = ?')
      .get(cleanUsername, cleanEmail);

    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);

    const result = db
      .prepare(`
        INSERT INTO users (username, email, password_hash)
        VALUES (?, ?, ?)
      `)
      .run(cleanUsername, cleanEmail, passwordHash);

    req.session.user = {
      id: result.lastInsertRowid,
      username: cleanUsername,
      email: cleanEmail
    };

    return res.status(201).json({
      message: 'Account created.',
      user: req.session.user
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Server error during signup.' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const user = db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    return res.json({
      message: 'Logged in.',
      user: req.session.user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Server error during login.' });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    return res.json({ message: 'Logged out.' });
  });
});

app.get('/me', (req, res) => {
  if (!req.session.user) {
    return res.json({ user: null });
  }

  return res.json({ user: req.session.user });
});

app.post('/scores', requireAuth, (req, res) => {
  try {
    const { gameName, score } = req.body ?? {};

    if (!gameName || typeof score !== 'number') {
      return res.status(400).json({ error: 'gameName and numeric score are required.' });
    }

    db.prepare(`
      INSERT INTO scores (user_id, game_name, score)
      VALUES (?, ?, ?)
    `).run(req.session.user.id, gameName, score);

    return res.status(201).json({ message: 'Score saved.' });
  } catch (error) {
    console.error('Save score error:', error);
    return res.status(500).json({ error: 'Server error while saving score.' });
  }
});

app.get('/leaderboard/:gameName', (req, res) => {
  try {
    const { gameName } = req.params;

    const rows = db.prepare(`
      SELECT u.username, MAX(s.score) AS score
      FROM scores s
      JOIN users u ON u.id = s.user_id
      WHERE s.game_name = ?
      GROUP BY u.id, u.username
      ORDER BY score DESC, u.username ASC
      LIMIT 10
    `).all(gameName);

    return res.json({ leaderboard: rows });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return res.status(500).json({ error: 'Server error while loading leaderboard.' });
  }
});

app.listen(PORT, () => {
  console.log(`Arcade backend running on http://localhost:${PORT}`);
});