const { db } = require('../config/firebase');

const CHALLENGES_COL = 'challenges';
const USERS_COL = 'users';
const SOLVES_COL = 'solves';

/* ── Challenges ─────────────────────────────────────────────────── */

async function getAllChallenges() {
  if (!db) return [];
  const snap = await db.collection(CHALLENGES_COL).orderBy('points', 'asc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getChallengeById(id) {
  if (!db) return null;
  const doc = await db.collection(CHALLENGES_COL).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function createChallenge(data) {
  if (!db) throw new Error('Firebase not initialised');
  const ref = await db.collection(CHALLENGES_COL).add({
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

async function updateChallenge(id, data) {
  if (!db) throw new Error('Firebase not initialised');
  await db.collection(CHALLENGES_COL).doc(id).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

async function deleteChallenge(id) {
  if (!db) throw new Error('Firebase not initialised');
  await db.collection(CHALLENGES_COL).doc(id).delete();
}

/* ── Users ───────────────────────────────────────────────────────── */

async function getUserById(id) {
  if (!db) return null;
  const doc = await db.collection(USERS_COL).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getAllUsers() {
  if (!db) return [];
  const snap = await db.collection(USERS_COL).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ── Solves ──────────────────────────────────────────────────────── */

async function recordSolve(userId, challengeId) {
  if (!db) return;
  await db.collection(SOLVES_COL).add({ userId, challengeId, solvedAt: new Date().toISOString() });
}

async function getSolvesByUser(userId) {
  if (!db) return [];
  const snap = await db.collection(SOLVES_COL).where('userId', '==', userId).get();
  return snap.docs.map(d => d.data());
}

module.exports = {
  getAllChallenges, getChallengeById, createChallenge, updateChallenge, deleteChallenge,
  getUserById, getAllUsers, recordSolve, getSolvesByUser,
};
