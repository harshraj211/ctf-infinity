const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');

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

// GET /challenges
router.get('/', requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const solved = global.ctfSolves[userId] || new Set();
  const challenges = global.ctfChallenges.map(c => ({
    ...c,
    solved: solved.has(c.id),
  }));

  const categories = [...new Set(challenges.map(c => c.category))];
  res.render('dashboard', { title: 'Challenges — CTF INFINITY', challenges, categories });
});

// GET /challenges/:id
router.get('/:id', requireAuth, (req, res) => {
  const challenge = global.ctfChallenges.find(c => c.id === req.params.id);
  if (!challenge) return res.status(404).render('error', { title: 'Not Found', message: 'Challenge not found.', code: 404 });

  const userId = req.session.user.id;
  const solved = (global.ctfSolves[userId] || new Set()).has(challenge.id);
  res.render('challenge', { title: `${challenge.title} — CTF INFINITY`, challenge, solved });
});

// POST /challenges/:id/submit
router.post('/:id/submit', requireAuth, (req, res) => {
  const challenge = global.ctfChallenges.find(c => c.id === req.params.id);
  if (!challenge) return res.json({ success: false, message: 'Challenge not found.' });

  const { flag } = req.body;
  const userId = req.session.user.id;

  if (!global.ctfSolves[userId]) global.ctfSolves[userId] = new Set();

  if (flag && flag.trim() === challenge.flag) {
    if (!global.ctfSolves[userId].has(challenge.id)) {
      global.ctfSolves[userId].add(challenge.id);
      req.session.user.score = (req.session.user.score || 0) + challenge.points;
    }
    return res.json({ success: true, message: `Correct! +${challenge.points} pts 🎉` });
  }
  res.json({ success: false, message: 'Wrong flag. Keep trying!' });
});

module.exports = router;
