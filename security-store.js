const session = require('express-session');

class SQLiteSessionStore extends session.Store {
  constructor(db) {
    super();
    this.db = db;
    this.getStatement = db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?');
    this.setStatement = db.prepare(`
      INSERT INTO sessions (sid, data, expires_at)
      VALUES (?, ?, ?)
      ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
    `);
    this.deleteStatement = db.prepare('DELETE FROM sessions WHERE sid = ?');
    this.deleteExpiredStatement = db.prepare('DELETE FROM sessions WHERE expires_at <= ?');
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);
      if (!row || row.expires_at <= Date.now()) {
        if (row) this.deleteStatement.run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.data));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, value, callback = () => {}) {
    try {
      const expiresAt = value.cookie?.expires
        ? new Date(value.cookie.expires).getTime()
        : Date.now() + 7 * 24 * 60 * 60 * 1000;
      this.setStatement.run(sid, JSON.stringify(value), expiresAt);
      this.deleteExpiredStatement.run(Date.now());
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.deleteStatement.run(sid);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sid, value, callback = () => {}) {
    this.set(sid, value, callback);
  }
}

function createSQLiteRateLimiter(db, { scope, windowMs, max }) {
  const readBucket = db.prepare('SELECT count, resets_at FROM rate_limit_buckets WHERE bucket_key = ?');
  const writeBucket = db.prepare(`
    INSERT INTO rate_limit_buckets (bucket_key, count, resets_at)
    VALUES (?, ?, ?)
    ON CONFLICT(bucket_key) DO UPDATE SET count = excluded.count, resets_at = excluded.resets_at
  `);
  const removeExpired = db.prepare('DELETE FROM rate_limit_buckets WHERE resets_at <= ?');

  return (req, res, next) => {
    const now = Date.now();
    const key = `${scope}:${req.ip}`;
    const current = readBucket.get(key);
    const resetsAt = !current || current.resets_at <= now ? now + windowMs : current.resets_at;
    const count = !current || current.resets_at <= now ? 1 : current.count + 1;

    writeBucket.run(key, count, resetsAt);
    if (Math.random() < 0.02) removeExpired.run(now);

    res.set('RateLimit-Limit', String(max));
    res.set('RateLimit-Remaining', String(Math.max(0, max - count)));
    res.set('RateLimit-Reset', String(Math.ceil(resetsAt / 1000)));

    if (count > max) {
      res.set('Retry-After', String(Math.ceil((resetsAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    return next();
  };
}

module.exports = { SQLiteSessionStore, createSQLiteRateLimiter };
