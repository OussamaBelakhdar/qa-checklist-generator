/**
 * share.js — Partage Public par Lien
 * ─────────────────────────────────────────────
 * Crée un snapshot public dans Firestore accessible sans authentification.
 * Le lien généré permet à n'importe qui de voir le rapport en lecture seule.
 *
 * ARCHITECTURE :
 *   Collection Firestore : `public_reports/{shareId}`
 *   Accès : lecture publique (sans auth), écriture uniquement par le propriétaire
 *   TTL : 30 jours par défaut (nettoyé par Cloud Function si configuré)
 *
 * STRUCTURE DU SNAPSHOT :
 *   public_reports/{shareId}
 *     ├── ownerUid : string
 *     ├── projectName : string
 *     ├── authorName : string
 *     ├── createdAt : timestamp
 *     ├── expiresAt : ISO string
 *     ├── viewCount : number
 *     ├── sessions : array (anonymisées)
 *     └── metrics : object (pré-calculé)
 *
 * SECURITY RULES NÉCESSAIRES :
 *   Voir firestore.rules (section public_reports ajoutée)
 */

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import { db } from './firebase.js';
import {
  computeGlobalCoverage,
  computeCoverageByPriority,
  computeFeatureDistribution,
  computeRiskySections,
  computeMaturityScore,
  computeQuickStats,
} from './metrics.js';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const SHARE_COLLECTION = 'public_reports';
const DEFAULT_TTL_DAYS = 30;

// ─────────────────────────────────────────────
// CRÉER UN LIEN DE PARTAGE
// ─────────────────────────────────────────────

/**
 * Crée un snapshot public et retourne l'URL de partage.
 *
 * @param {string} ownerUid      - Firebase UID du propriétaire
 * @param {Array}  sessions      - sessions à partager
 * @param {Object} options       - { projectName, authorName, ttlDays }
 * @returns {{ success, shareUrl, shareId } | { success: false, error }}
 */
export async function createPublicShare(ownerUid, sessions, options = {}) {
  try {
    const shareId = generateShareId();
    const expiresAt = new Date(Date.now() + (options.ttlDays || DEFAULT_TTL_DAYS) * 86_400_000);

    // Pré-calcule les métriques (évite les recalculs à chaque visite)
    const metrics = {
      global: computeGlobalCoverage(sessions),
      byPrio: computeCoverageByPriority(sessions),
      distrib: computeFeatureDistribution(sessions),
      risky: computeRiskySections(sessions),
      maturity: computeMaturityScore(sessions),
      quick: computeQuickStats(sessions),
    };

    // Anonymise les sessions (retire les UIDs, tokens, données sensibles)
    const sanitizedSessions = sessions.map(anonymizeSession);

    const snapshot = {
      ownerUid,
      projectName: options.projectName || 'Projet QA',
      authorName: options.authorName || 'QA Engineer',
      createdAt: serverTimestamp(),
      expiresAt: expiresAt.toISOString(),
      expiresAtMs: expiresAt.getTime(),
      viewCount: 0,
      sessionCount: sessions.length,
      sessions: sanitizedSessions,
      metrics,
    };

    await setDoc(doc(db, SHARE_COLLECTION, shareId), snapshot);

    const shareUrl = buildShareUrl(shareId);
    return { success: true, shareUrl, shareId };
  } catch (err) {
    console.error('[Share] Erreur createPublicShare:', err);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────
// LIRE UN RAPPORT PUBLIC
// ─────────────────────────────────────────────

/**
 * Lit un snapshot public par son shareId.
 * Incrémente le compteur de vues.
 * Vérifie l'expiration.
 */
export async function getPublicReport(shareId) {
  try {
    const snap = await getDoc(doc(db, SHARE_COLLECTION, shareId));
    if (!snap.exists()) {
      return { success: false, error: 'Rapport introuvable ou lien invalide.' };
    }

    const data = snap.data();

    // Vérifie l'expiration
    if (data.expiresAtMs && Date.now() > data.expiresAtMs) {
      return { success: false, error: 'Ce lien a expiré. Demande un nouveau lien au propriétaire.' };
    }

    // Incrémente les vues (fire-and-forget)
    updateDoc(doc(db, SHARE_COLLECTION, shareId), {
      viewCount: increment(1),
    }).catch(() => { }); // Pas critique

    return {
      success: true,
      report: {
        shareId,
        projectName: data.projectName,
        authorName: data.authorName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        expiresAt: data.expiresAt,
        viewCount: (data.viewCount || 0) + 1,
        sessionCount: data.sessionCount,
        sessions: data.sessions,
        metrics: data.metrics,
      },
    };
  } catch (err) {
    console.error('[Share] Erreur getPublicReport:', err);
    return { success: false, error: 'Erreur lors du chargement du rapport.' };
  }
}

// ─────────────────────────────────────────────
// RÉCUPÉRER SES LIENS PARTAGÉS
// ─────────────────────────────────────────────

/**
 * Récupère les liens publics créés par un utilisateur.
 * Lecture depuis les métadonnées dans Firestore.
 * (Alternative : sous-collection users/{uid}/shares)
 */
export async function getUserSharedLinks(ownerUid) {
  // Pour simplifier sans query composite, on passe par localStorage
  // En prod : utiliser une sous-collection ou une query with index
  try {
    const stored = localStorage.getItem(`qa_shares_${ownerUid}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Sauvegarde localement les métadonnées d'un lien créé.
 */
export function saveShareMetadata(ownerUid, shareId, shareUrl, projectName) {
  try {
    const key = `qa_shares_${ownerUid}`;
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    existing.unshift({
      shareId,
      shareUrl,
      projectName,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + DEFAULT_TTL_DAYS * 86_400_000).toISOString(),
    });
    // Garde les 10 derniers
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)));
  } catch { }
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Génère un ID unique de 10 caractères (URL-safe).
 * Évite les collisions avec suffisamment d'entropie.
 */
function generateShareId() {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789'; // sans 0,o,1,l
  let id = '';
  const array = new Uint8Array(10);
  crypto.getRandomValues(array);
  array.forEach(byte => { id += chars[byte % chars.length]; });
  return id;
}

/**
 * Construit l'URL de partage.
 * Format : https://domain/shared.html?r=shareId
 */
function buildShareUrl(shareId) {
  const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
  return `${base}/shared.html?r=${shareId}`;
}

/**
 * Anonymise une session avant de la stocker publiquement.
 * Retire les données potentiellement sensibles.
 */
function anonymizeSession(session) {
  return {
    sessionId: session.sessionId,
    type: session.type,
    name: session.name,
    updatedAt: session.updatedAt,
    stats: session.stats,
    // Items sans les descriptions potentiellement sensibles
    checklist: (session.checklist || []).map(item => ({
      id: item.id,
      text: item.text,
      priority: item.priority,
      section: item.section,
      checked: item.checked,
      // desc retiré intentionnellement (peut contenir des infos internes)
    })),
  };
}
