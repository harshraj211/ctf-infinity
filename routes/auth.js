const express = require('express');
const router = express.Router();
const { admin } = require('../config/firebase');

// GET /
router.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/challenges');
  res.render('index', { title: 'CTF INFINITY', layout: false });
});

// GET /login
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/challenges');
  res.render('index', { title: 'CTF INFINITY — Login', layout: false });
});

// POST /auth/verify  — called from frontend after Firebase login
// Frontend signs in via Firebase JS SDK, gets an ID token, sends it here
router.post('/auth/verify', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.session.user = {
      id: decoded.uid,
      username: decoded.email.split('@')[0],
      email: decoded.email,
      score: 0,
    };

    // Seed global ctfUsers if not present
    if (!global.ctfUsers) global.ctfUsers = [];
    if (!global.ctfUsers.find(u => u.id === decoded.uid)) {
      global.ctfUsers.push({
        id: decoded.uid,
        username: decoded.email.split('@')[0],
        email: decoded.email,
        score: 0,
        private: { notes: 'No private data' },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Auth error:', err.message);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;
