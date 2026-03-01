/**
 * ⚠️  INTENTIONALLY VULNERABLE ROUTES ⚠️
 * These routes contain deliberate security flaws for CTF educational purposes.
 * DO NOT deploy this in production or on public-facing infrastructure.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const axios = require('axios');

// ── In-memory SQLite DB (sql.js — pure JS, no native compilation needed) ──
let _db = null;

async function getDb() {
  if (_db) return _db;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  _db = new SQL.Database();
  _db.run(`
    CREATE TABLE products (
      id INTEGER PRIMARY KEY,
      name TEXT,
      description TEXT,
      price REAL
    );
    INSERT INTO products VALUES (1, 'CTF T-Shirt', 'Hacker merch', 19.99);
    INSERT INTO products VALUES (2, 'Flag Notebook', 'Write your flags here', 9.99);
    INSERT INTO products VALUES (3, 'Secret Item', 'FLAG{sqli_master_class}', 0.00);

    CREATE TABLE secrets (id INTEGER PRIMARY KEY, secret TEXT);
    INSERT INTO secrets VALUES (1, 'FLAG{sqli_master_class}');
  `);
  return _db;
}

// Helper: run raw SQL and return rows as array of objects
function execQuery(db, sql) {
  const results = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// 1. SQL INJECTION — /vuln/search?q=
// ────────────────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  let results = [], error = null;

  try {
    const db = await getDb();
    // ❌ VULNERABLE: raw string concatenation into SQL
    const sql = `SELECT * FROM products WHERE name LIKE '%${q}%' OR description LIKE '%${q}%'`;
    results = execQuery(db, sql);
  } catch (e) {
    error = e.message;
  }

  res.render('vuln/search', {
    title: 'Shop Search — CTF INFINITY',
    query: q,
    results,
    error,
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. XSS — Stored & Reflected
// ────────────────────────────────────────────────────────────────────────────
const comments = [
  { user: 'alice', text: 'Great platform!', ts: '2024-01-01' },
];

router.get('/xss', (req, res) => {
  const msg = req.query.msg || '';
  res.render('vuln/xss', {
    title: 'Community Board — CTF INFINITY',
    reflectedMsg: msg,
    comments,
  });
});

router.post('/xss', (req, res) => {
  const { comment } = req.body;
  if (comment) {
    comments.push({ user: 'anonymous', text: comment, ts: new Date().toISOString().split('T')[0] });
  }
  res.redirect('/vuln/xss');
});

// ────────────────────────────────────────────────────────────────────────────
// 3. IDOR — /vuln/user/:id
// ────────────────────────────────────────────────────────────────────────────
router.get('/user/:id', (req, res) => {
  const user = (global.ctfUsers || []).find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    score: user.score,
    private: user.private,
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. PATH TRAVERSAL — /vuln/file?name=
// ────────────────────────────────────────────────────────────────────────────
const FILES_DIR = path.join(__dirname, '..', 'ctf-flags');

router.get('/file', (req, res) => {
  const filename = req.query.name || 'flag_ssrf.txt';
  const filePath = path.join(FILES_DIR, filename);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    res.type('text/plain').send(content);
  } catch (e) {
    res.status(404).type('text/plain').send(`Error reading file: ${e.message}`);
  }
});

// ────────────────────────────────────────────────────────────────────────────
// 5. SSRF — /vuln/fetch?url=
// ────────────────────────────────────────────────────────────────────────────
router.get('/fetch', async (req, res) => {
  const url = req.query.url || '';
  if (!url) {
    return res.render('vuln/ssrf', { title: 'Webhook Tester — CTF INFINITY', result: null, requestedUrl: null });
  }
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 3,
      headers: { 'User-Agent': 'CTF-WebhookTester/1.0' },
    });
    res.render('vuln/ssrf', {
      title: 'Webhook Tester — CTF INFINITY',
      result: typeof response.data === 'object'
        ? JSON.stringify(response.data, null, 2)
        : String(response.data).slice(0, 4000),
      requestedUrl: url,
    });
  } catch (e) {
    res.render('vuln/ssrf', {
      title: 'Webhook Tester — CTF INFINITY',
      result: `Error: ${e.message}`,
      requestedUrl: url,
    });
  }
});

module.exports = router;
