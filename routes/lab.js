const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { db } = require('../config/firebase');

router.get('/', requireAuth, async (req, res) => {
  let machines = [];
  if (db) {
    try {
      const snap = await db.collection('machines').orderBy('createdAt', 'asc').get();
      machines = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      machines = global.ctfMachines || [];
    }
  } else {
    machines = global.ctfMachines || [];
  }
  res.render('lab', { title: 'Lab — CTF INFINITY', machines });
});

module.exports = router;
