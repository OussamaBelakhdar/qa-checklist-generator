/**
 * firebase.js — Configuration Firebase
 * ─────────────────────────────────────────────
 * Point d'entrée unique pour toute la couche Firebase.
 * Tous les modules qui ont besoin de Firebase importent depuis ici.
 *
 * SETUP :
 *   1. Créer un projet sur https://console.firebase.google.com
 *   2. Activer Authentication (Email/Password)
 *   3. Activer Firestore Database
 *   4. Copier la config dans le fichier .env.js (ne jamais committer les vraies clés)
 *
 * SÉCURITÉ :
 *   Les clés Firebase côté client ne sont PAS secrètes — elles sont publiques par design.
 *   La sécurité est assurée par les Firestore Security Rules (voir firestore.rules).
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// ─────────────────────────────────────────────
// CONFIG — Remplace par tes vraies valeurs Firebase
// ─────────────────────────────────────────────
// Pour un projet de production, utiliser des variables d'environnement
// injectées au build (Vite : import.meta.env.VITE_FIREBASE_API_KEY)
// Pour cette version statique, la config est inline (acceptable pour Firebase)

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

// ─────────────────────────────────────────────
// INITIALISATION
// ─────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

/**
 * Vérifie si Firebase est correctement configuré.
 * Utile pour afficher un message d'erreur clair en dev.
 */
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== "YOUR_API_KEY";
}
