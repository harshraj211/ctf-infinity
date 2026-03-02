const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { requireAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const { uploadFileRaw } = require('../services/storage');
const { db } = require('../config/firebase');

const SECRET = process.env.SESSION_SECRET || 'ctf-infinity-secret';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Adm1n@CTF!', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

function isAdminAuthed(req) {
  if (req.session.isAdmin) return true;

  const token = req.cookies && req.cookies['ctf_admin'];
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, SECRET);
    if (decoded.isAdmin) {
      req.session.isAdmin = true;
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function getAllChallenges() {
  if (!db) return global.ctfChallenges || [];
  const snap = await db.collection('challenges').orderBy('points', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function saveChallenge(data) {
  if (!db) {
    if (!global.ctfChallenges) global.ctfChallenges = [];
    const c = { id: 'c' + Date.now(), ...data };
    global.ctfChallenges.push(c);
    return;
  }
  await db.collection('challenges').add({ ...data, createdAt: new Date().toISOString() });
}

async function deleteChallenge(id) {
  if (!db) {
    global.ctfChallenges = (global.ctfChallenges || []).filter(c => c.id !== id);
    return;
  }
  await db.collection('challenges').doc(id).delete();
}

async function updateChallenge(id, data) {
  if (!db) {
    const idx = (global.ctfChallenges || []).findIndex(c => c.id === id);
    if (idx !== -1) global.ctfChallenges[idx] = { ...global.ctfChallenges[idx], ...data };
    return;
  }
  await db.collection('challenges').doc(id).update({ ...data, updatedAt: new Date().toISOString() });
}

// ── Machine helpers ───────────────────────────────────────────
async function getAllMachines() {
  if (!db) return global.ctfMachines || [];
  try {
    const snap = await db.collection('machines').orderBy('createdAt', 'asc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    return global.ctfMachines || [];
  }
}

async function saveMachine(data) {
  if (!db) {
    if (!global.ctfMachines) global.ctfMachines = [];
    const m = { id: 'm' + Date.now(), ...data };
    global.ctfMachines.push(m);
    return m.id;
  }
  const ref = await db.collection('machines').add({ ...data, createdAt: new Date().toISOString() });
  return ref.id;
}

async function deleteMachine(id) {
  if (!db) {
    global.ctfMachines = (global.ctfMachines || []).filter(m => m.id !== id);
    return;
  }
  await db.collection('machines').doc(id).delete();
}

// GET /creator
router.get('/', async (req, res) => {
  if (isAdminAuthed(req)) {
    const [challenges, machines] = await Promise.all([getAllChallenges(), getAllMachines()]);
    return res.render('creator', { title: 'Creator Portal — CTF INFINITY', challenges, machines });
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
    const { title, category, difficulty, points, description, flag, hint, hintCost } = req.body;
    let fileUrl = null;

    if (req.file) {
      try {
        fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
      } catch (e) {
        console.warn('Upload skipped:', e.message);
      }
    }

    const newChallenge = {
      title, category, difficulty,
      points: parseInt(points, 10),
      description, flag,
      hint: hint || null,
      hintCost: parseInt(hintCost, 10) || 10,
      fileUrl,
    };

    await saveChallenge(newChallenge);
    res.redirect('/creator');
  } catch (err) {
    res.status(500).render('error', { title: 'Error', message: err.message, code: 500 });
  }
});

// POST /creator/challenges/:id/delete
router.post('/challenges/:id/delete', requireAdmin, async (req, res) => {
  await deleteChallenge(req.params.id);
  res.redirect('/creator');
});

// POST /creator/challenges/:id/edit
router.post('/challenges/:id/edit', requireAdmin, upload.single('file'), async (req, res) => {
  const allChallenges = await getAllChallenges();
  const currentChallenge = allChallenges.find(c => c.id === req.params.id);
  if (!currentChallenge) return res.status(404).render('error', { title: 'Not Found', message: 'Challenge not found.', code: 404 });

  const { title, category, difficulty, points, description, flag, hint, hintCost } = req.body;
  let fileUrl = currentChallenge.fileUrl;

  if (req.file) {
    try {
      fileUrl = await uploadFileRaw(req.file.buffer, req.file.originalname, 'challenges');
    } catch (e) {
      console.warn('Upload skipped:', e.message);
    }
  }

  await updateChallenge(req.params.id, {
    title, category, difficulty,
    points: parseInt(points, 10),
    description, flag,
    hint: hint || null,
    hintCost: parseInt(hintCost, 10) || 10,
    fileUrl,
  });
  res.redirect('/creator');
});

// POST /creator/machines — add machine
router.post('/machines', requireAdmin, async (req, res) => {
  const { name, description, difficulty, category, link, machineType } = req.body;
  await saveMachine({ name, description, difficulty, category, link, machineType });
  res.redirect('/creator');
});

// POST /creator/machines/:id/delete
router.post('/machines/:id/delete', requireAdmin, async (req, res) => {
  await deleteMachine(req.params.id);
  res.redirect('/creator');
});

module.exports = router;
