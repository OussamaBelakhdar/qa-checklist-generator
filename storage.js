/**
 * storage.js — Couche Persistance
 * ─────────────────────────────────────────────
 * Responsabilité unique : lire et écrire dans localStorage.
 * Isolé du reste pour pouvoir changer de système de stockage
 * sans toucher au reste du code.
 */

const STORAGE_KEY = 'qa_checklist_session_v3';

/**
 * Sauvegarde l'état courant dans localStorage.
 * Ajoute un timestamp de sauvegarde.
 */
export function saveSession(state) {
  try {
    const session = {
      ...state,
      savedAt: new Date().toISOString(),
      version: 3,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch (err) {
    console.warn('[Storage] Impossible de sauvegarder la session :', err);
    return false;
  }
}

/**
 * Charge la session depuis localStorage.
 * Retourne null si aucune session ou si la session est corrompue.
 */
export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);

    // Validation minimale : s'assurer que les champs essentiels existent
    if (!session.type || !Array.isArray(session.checklist)) {
      console.warn('[Storage] Session corrompue, ignorée.');
      clearSession();
      return null;
    }

    return session;
  } catch (err) {
    console.warn('[Storage] Erreur de lecture de session :', err);
    return null;
  }
}

/**
 * Supprime la session sauvegardée.
 */
export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Vérifie si une session existe sans la charger complètement.
 */
export function hasSession() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}
