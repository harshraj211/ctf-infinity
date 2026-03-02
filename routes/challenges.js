const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');

// In-memory challenges for demo (Firebase is used when configured)
const demoChallenges = [
  {
    id: 'c1',
    title: 'Hello, World!',
    category: 'Web',
    difficulty: 'Easy',
    points: 50,
    description: 'Find the hidden flag in the page source.',
    flag: 'FLAG{source_code_is_your_friend}',
    hint: 'Right-click → View Page Source',
    fileUrl: null,
  },
  {
    id: 'c2',
    title: 'Injection Station',
    category: 'Web',
    difficulty: 'Medium',
    points: 150,
    description: 'The search endpoint is vulnerable. Can you extract the flag from the database?',
    flag: 'FLAG{sqli_master_class}',
    hint: "Try a single quote in the search box.",
    fileUrl: null,
  },
  {
    id: 'c3',
    title: 'Who Am I?',
    category: 'OSINT',
    difficulty: 'Easy',
    points: 75,
    description: 'A mysterious figure left digital breadcrumbs. Find their real name.',
    flag: 'FLAG{osint_is_everywhere}',
    hint: 'Reverse image search can reveal a lot.',
    fileUrl: null,
  },
  {
    id: 'c4',
    title: 'Hidden in Plain Sight',
    category: 'Steganography',
    difficulty: 'Medium',
    points: 200,
    description: 'Something is hidden inside this image. Extract it.',
    flag: 'FLAG{steg0_n0gr4phy_FTW}',
    hint: 'Try steghide or zsteg.',
    fileUrl: null,
  },
  {
    id: 'c5',
    title: 'Packet Detective',
    category: 'Digital Forensics',
    difficulty: 'Hard',
    points: 300,
    description: 'Analyse the PCAP file and find the flag hidden in the network traffic.',
    flag: 'FLAG{wireshark_wizard}',
    hint: 'Filter by HTTP and look at the payloads.',
    fileUrl: null,
  },
  {
    id: 'c6',
    title: 'SSRF Safari',
    category: 'Web',
    difficulty: 'Hard',
    points: 300,
    description: 'The webhook tester fetches any URL you give it. Can you reach the internal metadata service?',
    flag: 'FLAG{ssrf_into_the_void}',
    hint: 'Try 169.254.169.254',
    fileUrl: null,
  },
];

global.ctfChallenges = demoChallenges;
global.ctfSolves = {}; // { userId: Set<challengeId> }

async function getChallenges() {
  if (!db) return global.ctfChallenges || [];
  const snap = await db.collection('challenges').orderBy('points', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getChallengeById(challengeId) {
  const allChallenges = await getChallenges();
  return allChallenges.find(c => c.id === challengeId);
}

async function getSolves(userId) {
  return global.ctfSolves[userId] || new Set();
}

async function isHintUnlocked(userId, challengeId) {
  if (!db) {
    return (global.ctfHints?.[userId] || new Set()).has(challengeId);
  }
  try {
    const snap = await db.collection('hints')
      .where('userId', '==', userId)
      .where('challengeId', '==', challengeId)
      .get();
    return !snap.empty;
  } catch (e) {
    return false;
  }
}

async function recordSolve(userId, points) {
  if (!db) return;

  // Update user score in Firestore
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (userDoc.exists) {
    await userRef.update({ score: (userDoc.data().score || 0) + points });
  } else {
    await userRef.set({ score: points });
  }
}

// GET /challenges
router.get('/', requireAuth, async (req, res) => {
  const userId = req.session.user.id;
  const solved = global.ctfSolves[userId] || new Set();
  const allChallenges = await getChallenges();
  const challenges = allChallenges.map(c => ({
    ...c,
    solved: solved.has(c.id),
  }));

  const categories = [...new Set(challenges.map(c => c.category))];
  res.render('dashboard', { title: 'Challenges — CTF INFINITY', challenges, categories });
});

// GET /challenges/download?url=
router.get('/download', requireAuth, async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('No URL provided');

  try {
    const axios = require('axios');
    const response = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const filename = fileUrl.split('/').pop().split('?')[0];
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    res.send(Buffer.from(response.data));
  } catch (e) {
    res.status(500).send('Download failed: ' + e.message);
  }
});

// GET /challenges/:id
router.get('/:id', requireAuth, async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) return res.status(404).render('error', { title: 'Not Found', message: 'Challenge not found.', code: 404 });

  const userId = req.session.user.id;
  const [solved, hintUnlocked] = await Promise.all([
    getSolves(userId).then(s => s.has(challenge.id)),
    isHintUnlocked(userId, challenge.id),
  ]);

  res.render('challenge', { title: `${challenge.title} — CTF INFINITY`, challenge, solved, hintUnlocked });
});

// POST /challenges/:id/hint
router.post('/:id/hint', requireAuth, async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) return res.json({ success: false, message: 'Challenge not found.' });
  if (!challenge.hint) return res.json({ success: false, message: 'No hint available.' });

  const userId = req.session.user.id;
  const hintCost = challenge.hintCost || 10;

  const alreadyUnlocked = await isHintUnlocked(userId, challenge.id);
  if (alreadyUnlocked) return res.json({ success: true, message: 'Already unlocked.' });

  const currentScore = req.session.user.score || 0;
  if (currentScore < hintCost) {
    return res.json({ success: false, message: `Not enough points. You need ${hintCost} pts.` });
  }

  req.session.user.score = currentScore - hintCost;

  if (db) {
    try {
      await db.collection('hints').add({
        userId,
        challengeId: challenge.id,
        unlockedAt: new Date().toISOString(),
        pointsSpent: hintCost,
      });

      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        await userRef.update({ score: Math.max(0, (userDoc.data().score || 0) - hintCost) });
      }
    } catch (e) {
      console.error('Hint unlock error:', e.message);
    }
  } else {
    if (!global.ctfHints) global.ctfHints = {};
    if (!global.ctfHints[userId]) global.ctfHints[userId] = new Set();
    global.ctfHints[userId].add(challenge.id);
  }

  res.json({ success: true, message: 'Hint unlocked!' });
});

// POST /challenges/:id/submit
router.post('/:id/submit', requireAuth, async (req, res) => {
  const challenge = await getChallengeById(req.params.id);
  if (!challenge) return res.json({ success: false, message: 'Challenge not found.' });

  const { flag } = req.body;
  const userId = req.session.user.id;

  if (!global.ctfSolves[userId]) global.ctfSolves[userId] = new Set();

  if (flag && flag.trim() === challenge.flag) {
    if (!global.ctfSolves[userId].has(challenge.id)) {
      global.ctfSolves[userId].add(challenge.id);
      req.session.user.score = (req.session.user.score || 0) + challenge.points;
      try {
        await recordSolve(userId, challenge.points);
      } catch (e) {
        console.warn('Could not persist user score:', e.message);
      }
    }
    return res.json({ success: true, message: `Correct! +${challenge.points} pts 🎉` });
  }
  res.json({ success: false, message: 'Wrong flag. Keep trying!' });
});

module.exports = router;
