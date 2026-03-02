/**
 * aggregator.js — Agrégateur de données pour le Dashboard
 * ─────────────────────────────────────────────
 * Responsabilité : charger les sessions (Firestore ou localStorage)
 * et les préparer pour le module metrics.js.
 *
 * Stratégie offline-first :
 *   1. Tente Firestore si utilisateur connecté
 *   2. Fallback vers localStorage si offline
 *   3. Les deux sources sont fusionnées et dédupliquées
 */

import { getUserSessions } from './sessions.js';
import { loadSession } from './storage.js';

// ─────────────────────────────────────────────
// CHARGEMENT
// ─────────────────────────────────────────────

/**
 * Charge toutes les sessions disponibles.
 * @param {string|null} uid - Firebase UID (null si offline)
 * @param {number} limit - nombre max de sessions à charger
 * @returns {Promise<Array>} sessions normalisées
 */
export async function loadAllSessions(uid = null, limit = 50) {
  const sources = [];

  // Source 1 : Firestore (si connecté)
  if (uid) {
    try {
      const firestoreSessions = await getUserSessions(uid, limit);
      sources.push(...firestoreSessions.map(normalizeSession));
    } catch (err) {
      console.warn('[Aggregator] Firestore indisponible, fallback localStorage', err);
    }
  }

  // Source 2 : localStorage (session courante)
  const localSession = loadSession();
  if (localSession && localSession.type) {
    // Ajoute seulement si pas déjà dans Firestore
    const alreadyPresent = sources.some(s => s.sessionId === localSession.sessionId);
    if (!alreadyPresent) {
      sources.push(normalizeSession({
        ...localSession,
        sessionId: localSession.sessionId || 'local_current',
        updatedAt: localSession.savedAt || new Date().toISOString(),
      }));
    }
  }

  // Tri par date décroissante
  return sources.sort((a, b) => {
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });
}

// ─────────────────────────────────────────────
// CHARGEMENT DEMO (sans compte)
// ─────────────────────────────────────────────

/**
 * Génère des sessions de démonstration pour le dashboard.
 * Utilisé quand l'utilisateur n'a pas de compte ou pas encore de sessions.
 */
export function generateDemoSessions() {
  const types = ['login', 'api', 'form', 'payment', 'crud', 'search', 'upload', 'dashboard'];
  const sessions = [];
  const now = Date.now();

  types.forEach((type, index) => {
    const items = generateDemoItems(type);
    // Sessions sur les 14 derniers jours
    const daysAgo = 14 - (index * 1.5);
    const date = new Date(now - daysAgo * 86_400_000).toISOString();

    sessions.push({
      sessionId: `demo_${type}`,
      type,
      name: `[DEMO] ${type.charAt(0).toUpperCase() + type.slice(1)} Feature`,
      checklist: items,
      updatedAt: date,
      createdAt: date,
      isDemo: true,
      stats: {
        total: items.length,
        checked: items.filter(i => i.checked).length,
        percent: Math.round(items.filter(i => i.checked).length / items.length * 100),
      },
    });
  });

  return sessions;
}

function generateDemoItems(type) {
  const SECTIONS = {
    login: ['Authentification', 'Sécurité', 'UX'],
    api: ['Endpoints', 'Auth', 'Performance', 'Sécurité'],
    form: ['Validation', 'UX', 'Accessibilité'],
    payment: ['Transaction', 'Sécurité', 'Confirmation'],
    crud: ['Create', 'Read', 'Update', 'Delete'],
    search: ['Requêtes', 'Résultats', 'Performance'],
    upload: ['Validation', 'Traitement', 'Erreurs'],
    dashboard: ['Affichage', 'Données', 'Performance'],
  };

  const PRIORITIES = ['critical', 'high', 'medium', 'low'];
  const sections = SECTIONS[type] || ['Tests'];
  const items = [];
  let id = 0;

  sections.forEach(section => {
    const count = Math.floor(Math.random() * 4) + 4; // 4-7 items par section
    for (let i = 0; i < count; i++) {
      id++;
      const priority = PRIORITIES[Math.floor(Math.random() * PRIORITIES.length)];
      // Probabilité de checked : les high/medium plus souvent cochés
      const checkProb = { critical: 0.6, high: 0.75, medium: 0.82, low: 0.88 }[priority];
      items.push({
        id,
        text: `Test ${section} #${id}`,
        desc: `Vérification ${section.toLowerCase()} pour ${type}`,
        priority,
        section,
        checked: Math.random() < checkProb,
      });
    }
  });

  return items;
}

// ─────────────────────────────────────────────
// NORMALISATION
// ─────────────────────────────────────────────

/**
 * Normalise une session pour garantir une structure uniforme.
 * Protège contre les sessions incomplètes ou corrompues.
 */
function normalizeSession(session) {
  return {
    sessionId: session.sessionId || session.id || `session_${Date.now()}`,
    type: session.type || 'unknown',
    name: session.name || session.type || 'Session sans nom',
    checklist: Array.isArray(session.checklist) ? session.checklist : [],
    updatedAt: session.updatedAt || session.savedAt || null,
    createdAt: session.createdAt || session.updatedAt || null,
    stats: session.stats || null,
    isDemo: session.isDemo || false,
  };
}
