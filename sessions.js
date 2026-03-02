/**
 * sessions.js — Collection Firestore : sessions de checklist
 * ─────────────────────────────────────────────
 * Structure Firestore :
 *
 *   sessions/ {sessionId}
 *     ├── uid: string          ← owner (userId)
 *     ├── type: string         ← ex: "login", "api"
 *     ├── name: string         ← nom personnalisé
 *     ├── checklist: array     ← items avec états
 *     ├── filter: string       ← filtre actif
 *     ├── stats: object        ← snapshot des stats
 *     ├── createdAt: timestamp
 *     └── updatedAt: timestamp
 *
 * Security Rules :
 *   Seul le propriétaire (uid == request.auth.uid) peut lire/écrire.
 *   Voir firestore.rules.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { db } from './firebase.js';

// ─────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────

/**
 * Sauvegarde une nouvelle session dans Firestore.
 * Retourne l'ID du document créé.
 */
export async function saveSession(uid, sessionData) {
  try {
    const ref = await addDoc(collection(db, 'sessions'), {
      uid,
      ...sessionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true, sessionId: ref.id };
  } catch (err) {
    console.error('[DB] Erreur saveSession:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Met à jour une session existante.
 * Utilisé pour la sauvegarde automatique (auto-save).
 */
export async function updateSession(sessionId, updates) {
  try {
    const ref = doc(db, 'sessions', sessionId);
    await updateDoc(ref, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error('[DB] Erreur updateSession:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────

/**
 * Récupère toutes les sessions d'un utilisateur.
 * Triées par date de mise à jour (les plus récentes en premier).
 * Limitées à N sessions pour éviter des lectures trop lourdes.
 */
export async function getUserSessions(uid, maxSessions = 20) {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('uid', '==', uid),
      orderBy('updatedAt', 'desc'),
      limit(maxSessions)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      sessionId: doc.id,
      ...doc.data(),
      // Convertit les Timestamps Firebase en ISO strings
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));
  } catch (err) {
    console.error('[DB] Erreur getUserSessions:', err);
    return [];
  }
}

/**
 * Récupère une session spécifique par son ID.
 */
export async function getSession(sessionId) {
  try {
    const snap = await getDoc(doc(db, 'sessions', sessionId));
    if (!snap.exists()) return null;
    return { sessionId: snap.id, ...snap.data() };
  } catch (err) {
    console.error('[DB] Erreur getSession:', err);
    return null;
  }
}

// ─────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────

/**
 * Supprime une session (par son propriétaire uniquement — enforced par Security Rules).
 */
export async function deleteSession(sessionId) {
  try {
    await deleteDoc(doc(db, 'sessions', sessionId));
    return { success: true };
  } catch (err) {
    console.error('[DB] Erreur deleteSession:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Calcule les stats d'une session pour affichage dans l'historique.
 */
export function computeSessionStats(checklist) {
  const total = checklist.length;
  const checked = checklist.filter(i => i.checked).length;
  return {
    total,
    checked,
    percent: total ? Math.round((checked / total) * 100) : 0,
  };
}
