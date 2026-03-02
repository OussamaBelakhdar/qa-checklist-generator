/**
 * auth.js — Couche Authentification
 * ─────────────────────────────────────────────
 * Responsabilité unique : gérer l'identité de l'utilisateur.
 *
 * Fonctions exposées :
 *   - registerWithEmail(email, password, displayName)
 *   - loginWithEmail(email, password)
 *   - loginWithGoogle()
 *   - logout()
 *   - onAuthChange(callback)  ← s'abonner aux changements d'état
 *   - getCurrentUser()
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { auth } from './firebase.js';
import { createUserProfile } from './users.js';

// ─────────────────────────────────────────────
// ÉTAT LOCAL
// ─────────────────────────────────────────────
let _currentUser = null;

// ─────────────────────────────────────────────
// INSCRIPTION
// ─────────────────────────────────────────────

/**
 * Inscrit un nouvel utilisateur avec email + mot de passe.
 * Crée automatiquement son profil dans Firestore.
 */
export async function registerWithEmail(email, password, displayName) {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Met à jour le displayName dans Firebase Auth
    await updateProfile(user, { displayName });

    // Crée le profil utilisateur dans Firestore
    await createUserProfile(user.uid, {
      displayName,
      email,
      createdAt: new Date().toISOString(),
      plan: 'free',              // free | pro
      sessionCount: 0,
    });

    return { success: true, user };
  } catch (err) {
    return { success: false, error: formatAuthError(err.code) };
  }
}

// ─────────────────────────────────────────────
// CONNEXION
// ─────────────────────────────────────────────

/**
 * Connecte un utilisateur existant avec email + mot de passe.
 */
export async function loginWithEmail(email, password) {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (err) {
    return { success: false, error: formatAuthError(err.code) };
  }
}

/**
 * Connexion avec Google (popup).
 * Crée un profil si c'est la première connexion.
 */
export async function loginWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    const user = credential.user;

    // Crée le profil seulement si c'est un nouvel utilisateur
    const isNewUser = credential._tokenResponse?.isNewUser;
    if (isNewUser) {
      await createUserProfile(user.uid, {
        displayName: user.displayName || 'QA Engineer',
        email: user.email,
        createdAt: new Date().toISOString(),
        plan: 'free',
        sessionCount: 0,
      });
    }

    return { success: true, user };
  } catch (err) {
    return { success: false, error: formatAuthError(err.code) };
  }
}

// ─────────────────────────────────────────────
// DÉCONNEXION
// ─────────────────────────────────────────────

export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// ÉTAT
// ─────────────────────────────────────────────

/**
 * S'abonne aux changements d'état d'authentification.
 * Le callback est appelé immédiatement avec l'état courant,
 * puis à chaque connexion/déconnexion.
 *
 * Retourne une fonction pour se désabonner.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    callback(user);
  });
}

/**
 * Retourne l'utilisateur courant (synchrone).
 * null si non connecté.
 */
export function getCurrentUser() {
  return _currentUser || auth.currentUser;
}

/**
 * Vérifie si l'utilisateur est connecté.
 */
export function isAuthenticated() {
  return _currentUser !== null || auth.currentUser !== null;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Traduit les codes d'erreur Firebase en messages français compréhensibles.
 */
function formatAuthError(code) {
  const ERRORS = {
    'auth/email-already-in-use': 'Cette adresse email est déjà utilisée.',
    'auth/invalid-email': 'Format d\'email invalide.',
    'auth/weak-password': 'Mot de passe trop faible (minimum 6 caractères).',
    'auth/user-not-found': 'Aucun compte associé à cet email.',
    'auth/wrong-password': 'Mot de passe incorrect.',
    'auth/invalid-credential': 'Email ou mot de passe incorrect.',
    'auth/too-many-requests': 'Trop de tentatives. Réessaye dans quelques minutes.',
    'auth/popup-closed-by-user': 'Connexion annulée.',
    'auth/network-request-failed': 'Problème de connexion réseau.',
  };
  return ERRORS[code] || `Erreur d'authentification (${code})`;
}
