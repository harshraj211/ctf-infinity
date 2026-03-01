const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadFileRaw } = require('../services/storage');

// Admin credentials from .env (fallback for demo)
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Adm1n@CTF!', 10);

// GET /creator  → login page or dashboard
router.get('/', (req, res) => {
  if (req.session.isAdmin) {
    return res.render('creator', { title: 'Creator Portal — CTF INFINITY', challenges: global.ctfChallenges });
  }
  res.render('creator', { title: 'Creator Login — CTF INFINITY', loginPage: true });
});

// POST /creator/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.isAdmin = true;
    return res.redirect('/creator');
  }
  res.render('creator', {
    title: 'Creator Login — CTF INFINITY',
    loginPage: true,
    error: 'Invalid admin password.',
  });
});

// POST /creator/logout
router.post('/logout', (req, res) => {
  req.session.isAdmin = false;
  res.redirect('/creator');
});

// POST /creator/challenges  — create
router.post('/challenges', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, category, difficulty, points, description, flag, hint } = req.body;
    let fileUrl = null;

    if (req.file) {
      try {
        fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
      } catch (e) {
        // Firebase not configured — store locally for demo
        fileUrl = null;
        console.warn('Firebase upload skipped:', e.message);
      }
    }

    const newChallenge = {
      id: `c${Date.now()}`,
      title, category, difficulty,
      points: parseInt(points, 10),
      description, flag,
      hint: hint || null,
      fileUrl,
    };
    global.ctfChallenges.push(newChallenge);
    res.redirect('/creator');
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message, code: 500 });
  }
});

// DELETE /creator/challenges/:id
router.post('/challenges/:id/delete', requireAdmin, async (req, res) => {
  global.ctfChallenges = global.ctfChallenges.filter(c => c.id !== req.params.id);
  res.redirect('/creator');
});

// PUT /creator/challenges/:id  — edit (via POST with _method)
router.post('/challenges/:id/edit', requireAdmin, upload.single('file'), async (req, res) => {
  const idx = global.ctfChallenges.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).render('error', { title: 'Not Found', message: 'Challenge not found.', code: 404 });

  const { title, category, difficulty, points, description, flag, hint } = req.body;
  let fileUrl = global.ctfChallenges[idx].fileUrl;

  if (req.file) {
    try {
      fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
    } catch (e) {
      console.warn('Firebase upload skipped:', e.message);
    }
  }

  global.ctfChallenges[idx] = {
    ...global.ctfChallenges[idx],
    title, category, difficulty,
    points: parseInt(points, 10),
    description, flag,
    hint: hint || null,
    fileUrl,
  };
  res.redirect('/creator');
});

module.exports = router;
