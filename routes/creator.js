const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadFileRaw } = require('../services/storage');

const SECRET = process.env.SESSION_SECRET || 'ctf-infinity-secret';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Adm1n@CTF!', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

// GET /creator
router.get('/', (req, res) => {
  if (req.session.isAdmin) {
    return res.render('creator', { title: 'Creator Portal — CTF INFINITY', challenges: global.ctfChallenges || [] });
  }
  // Check JWT admin cookie
  const token = req.cookies && req.cookies['ctf_admin'];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      if (decoded.isAdmin) {
        req.session.isAdmin = true;
        return res.render('creator', { title: 'Creator Portal — CTF INFINITY', challenges: global.ctfChallenges || [] });
      }
    } catch (e) {}
  }
  res.render('creator', { title: 'Creator Login — CTF INFINITY', loginPage: true });
});

// POST /creator/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (bcrypt.compareSync(password, ADMIN_PASSWORD_HASH)) {
    req.session.isAdmin = true;

    // Also set a JWT cookie so Vercel serverless keeps admin state
    const token = jwt.sign({ isAdmin: true }, SECRET, { expiresIn: '24h' });
    res.cookie('ctf_admin', token, {
      httpOnly: true,
      secure: IS_PROD,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    });

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
  res.clearCookie('ctf_admin');
  res.redirect('/creator');
});

// POST /creator/challenges — create
router.post('/challenges', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { title, category, difficulty, points, description, flag, hint } = req.body;
    let fileUrl = null;

    if (req.file) {
      try {
        fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
      } catch (e) {
        console.warn('Upload skipped:', e.message);
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

    if (!global.ctfChallenges) global.ctfChallenges = [];
    global.ctfChallenges.push(newChallenge);
    res.redirect('/creator');
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message, code: 500 });
  }
});

// POST /creator/challenges/:id/delete
router.post('/challenges/:id/delete', requireAdmin, (req, res) => {
  if (global.ctfChallenges) {
    global.ctfChallenges = global.ctfChallenges.filter(c => c.id !== req.params.id);
  }
  res.redirect('/creator');
});

// POST /creator/challenges/:id/edit
router.post('/challenges/:id/edit', requireAdmin, upload.single('file'), async (req, res) => {
  if (!global.ctfChallenges) return res.redirect('/creator');
  const idx = global.ctfChallenges.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).render('error', { title: 'Not Found', message: 'Challenge not found.', code: 404 });

  const { title, category, difficulty, points, description, flag, hint } = req.body;
  let fileUrl = global.ctfChallenges[idx].fileUrl;

  if (req.file) {
    try {
      fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
    } catch (e) {
      console.warn('Upload skipped:', e.message);
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
