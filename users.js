/**
 * users.js — Collection Firestore : profils utilisateurs
 * ─────────────────────────────────────────────
 * Structure Firestore :
 *
 *   users/ {uid}
 *     ├── displayName: string
 *     ├── email: string
 *     ├── plan: "free" | "pro"
 *     ├── sessionCount: number
 *     ├── createdAt: ISO string
 *     └── lastActiveAt: ISO string
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { db } from './firebase.js';

// ─────────────────────────────────────────────
// CRUD PROFIL
// ─────────────────────────────────────────────

/**
 * Crée le profil d'un nouvel utilisateur dans Firestore.
 * Appelé une seule fois à l'inscription.
 */
export async function createUserProfile(uid, profileData) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, {
    ...profileData,
    lastActiveAt: new Date().toISOString(),
  });
}

/**
 * Lit le profil d'un utilisateur.
 * Retourne null si inexistant.
 */
export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? { uid, ...snap.data() } : null;
}

/**
 * Met à jour la date de dernière activité.
 * Appelé à chaque login.
 */
export async function touchUserActivity(uid) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    lastActiveAt: new Date().toISOString(),
  });
}

/**
 * Incrémente le compteur de sessions.
 * Appelé à chaque génération de checklist.
 */
export async function incrementSessionCount(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;

  await updateDoc(ref, {
    sessionCount: (snap.data().sessionCount || 0) + 1,
    lastActiveAt: new Date().toISOString(),
  });
}
