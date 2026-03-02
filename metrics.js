/**
 * metrics.js — Calcul des KPIs QA
 * ─────────────────────────────────────────────
 * Module pur : reçoit des sessions, retourne des métriques.
 * Aucune dépendance DOM, aucune dépendance Firebase.
 * Testable unitairement de façon isolée.
 *
 * MÉTRIQUES CALCULÉES :
 *   - Taux de couverture global (items cochés / total)
 *   - Couverture par priorité (critical, high, medium, low)
 *   - Distribution des features testées
 *   - Evolution temporelle (couverture par session, dans le temps)
 *   - Top sections à risque (sections avec le moins de couverture)
 *   - Score de maturité QA (composite 0–100)
 *   - Vitesse de test (items cochés par session)
 */

// ─────────────────────────────────────────────
// COUVERTURE GLOBALE
// ─────────────────────────────────────────────

/**
 * Calcule la couverture globale sur toutes les sessions.
 * @param {Array} sessions - tableau de sessions Firestore
 * @returns {{ total, checked, unchecked, percent }}
 */
export function computeGlobalCoverage(sessions) {
  let total   = 0;
  let checked = 0;

  for (const session of sessions) {
    const items = session.checklist || [];
    total   += items.length;
    checked += items.filter(i => i.checked).length;
  }

  return {
    total,
    checked,
    unchecked: total - checked,
    percent: total ? Math.round((checked / total) * 100) : 0,
  };
}

// ─────────────────────────────────────────────
// COUVERTURE PAR PRIORITÉ
// ─────────────────────────────────────────────

/**
 * Calcule la couverture pour chaque niveau de priorité.
 * @returns {Object} { critical: {total,checked,percent}, high: ..., ... }
 */
export function computeCoverageByPriority(sessions) {
  const priorities = ['critical', 'high', 'medium', 'low'];
  const result = {};

  for (const priority of priorities) {
    let total   = 0;
    let checked = 0;

    for (const session of sessions) {
      const items = (session.checklist || []).filter(i => i.priority === priority);
      total   += items.length;
      checked += items.filter(i => i.checked).length;
    }

    result[priority] = {
      total,
      checked,
      unchecked: total - checked,
      percent: total ? Math.round((checked / total) * 100) : 0,
    };
  }

  return result;
}

// ─────────────────────────────────────────────
// DISTRIBUTION DES FEATURES
// ─────────────────────────────────────────────

/**
 * Compte combien de fois chaque type de feature a été testé.
 * @returns {Array} [{ type, label, count, coverage }] trié par count desc
 */
export function computeFeatureDistribution(sessions) {
  const map = {};

  for (const session of sessions) {
    const type = session.type || 'unknown';
    if (!map[type]) {
      map[type] = { type, count: 0, totalItems: 0, checkedItems: 0 };
    }
    map[type].count++;

    const items = session.checklist || [];
    map[type].totalItems   += items.length;
    map[type].checkedItems += items.filter(i => i.checked).length;
  }

  return Object.values(map)
    .map(entry => ({
      ...entry,
      coverage: entry.totalItems
        ? Math.round((entry.checkedItems / entry.totalItems) * 100)
        : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

// ─────────────────────────────────────────────
// ÉVOLUTION TEMPORELLE
// ─────────────────────────────────────────────

/**
 * Retourne l'évolution de la couverture session par session,
 * triées par date croissante. Utile pour un graphique linéaire.
 * @returns {Array} [{ date, sessionName, percent, checked, total }]
 */
export function computeTimeEvolution(sessions) {
  return [...sessions]
    .filter(s => s.updatedAt || s.createdAt)
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateA - dateB;
    })
    .map(session => {
      const items   = session.checklist || [];
      const total   = items.length;
      const checked = items.filter(i => i.checked).length;
      const date    = session.updatedAt || session.createdAt;

      return {
        date: formatShortDate(date),
        sessionName: session.name || session.type || 'Session',
        type: session.type,
        percent: total ? Math.round((checked / total) * 100) : 0,
        checked,
        total,
      };
    });
}

// ─────────────────────────────────────────────
// TOP SECTIONS À RISQUE
// ─────────────────────────────────────────────

/**
 * Identifie les sections les moins bien couvertes.
 * Ces sections représentent les zones de risque les plus élevées.
 * @returns {Array} [{ section, total, checked, coverage, riskScore }] trié par risque
 */
export function computeRiskySections(sessions) {
  const sectionMap = {};

  for (const session of sessions) {
    for (const item of (session.checklist || [])) {
      const section = item.section || 'Autre';
      if (!sectionMap[section]) {
        sectionMap[section] = { section, total: 0, checked: 0, criticalUnchecked: 0 };
      }
      sectionMap[section].total++;
      if (item.checked) {
        sectionMap[section].checked++;
      } else if (item.priority === 'critical' || item.priority === 'high') {
        sectionMap[section].criticalUnchecked++;
      }
    }
  }

  return Object.values(sectionMap)
    .filter(s => s.total >= 2) // filtre les sections avec peu de données
    .map(s => ({
      ...s,
      coverage: Math.round((s.checked / s.total) * 100),
      // Score de risque : plus c'est haut, plus c'est risqué
      // Pèse plus lourd si des items critiques sont non couverts
      riskScore: Math.round(
        (1 - s.checked / s.total) * 100 +
        s.criticalUnchecked * 15
      ),
    }))
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8); // top 8 sections à risque
}

// ─────────────────────────────────────────────
// SCORE DE MATURITÉ QA
// ─────────────────────────────────────────────

/**
 * Calcule un score composite de maturité QA (0–100).
 *
 * Dimensions :
 *   - Couverture globale (40 pts)
 *   - Couverture des items critiques (30 pts)
 *   - Variété des features testées (20 pts)
 *   - Régularité des tests dans le temps (10 pts)
 */
export function computeMaturityScore(sessions) {
  if (sessions.length === 0) return { score: 0, breakdown: {} };

  const global        = computeGlobalCoverage(sessions);
  const byPriority    = computeCoverageByPriority(sessions);
  const distribution  = computeFeatureDistribution(sessions);
  const evolution     = computeTimeEvolution(sessions);

  // 1. Couverture globale (40 pts)
  const coverageScore = Math.round((global.percent / 100) * 40);

  // 2. Couverture critical (30 pts)
  const criticalScore = Math.round((byPriority.critical.percent / 100) * 30);

  // 3. Variété features (20 pts) — 10 features = 20pts, 5 = 10pts
  const featureTypes   = distribution.length;
  const varietyScore   = Math.min(20, Math.round((featureTypes / 10) * 20));

  // 4. Régularité (10 pts) — sessions réparties sur plusieurs jours
  const regularityScore = computeRegularityScore(evolution, 10);

  const total = coverageScore + criticalScore + varietyScore + regularityScore;

  return {
    score: Math.min(100, total),
    breakdown: {
      coverage:    { score: coverageScore,    max: 40, label: 'Couverture globale' },
      critical:    { score: criticalScore,    max: 30, label: 'Couverture critique' },
      variety:     { score: varietyScore,     max: 20, label: 'Variété des features' },
      regularity:  { score: regularityScore,  max: 10, label: 'Régularité des tests' },
    },
    label: getMaturityLabel(total),
  };
}

function computeRegularityScore(evolution, maxScore) {
  if (evolution.length < 2) return 0;
  const uniqueDays = new Set(evolution.map(e => e.date)).size;
  return Math.min(maxScore, Math.round((uniqueDays / 7) * maxScore));
}

function getMaturityLabel(score) {
  if (score >= 85) return { level: 'Expert',       color: '#10b981', icon: '🏆' };
  if (score >= 70) return { level: 'Avancé',        color: '#06b6d4', icon: '⭐' };
  if (score >= 50) return { level: 'Intermédiaire', color: '#f59e0b', icon: '📈' };
  if (score >= 30) return { level: 'Débutant',      color: '#f97316', icon: '🌱' };
  return                  { level: 'Initial',        color: '#ef4444', icon: '🔴' };
}

// ─────────────────────────────────────────────
// STATISTIQUES RAPIDES (pour les cards en haut)
// ─────────────────────────────────────────────

/**
 * Calcule les 4 métriques clés affichées dans les stat cards.
 */
export function computeQuickStats(sessions) {
  const global   = computeGlobalCoverage(sessions);
  const maturity = computeMaturityScore(sessions);
  const byPrio   = computeCoverageByPriority(sessions);

  const criticalUncovered = byPrio.critical.unchecked;
  const lastSession = sessions.length > 0
    ? (sessions[0].updatedAt || sessions[0].createdAt)
    : null;

  return {
    totalSessions:      sessions.length,
    globalCoverage:     global.percent,
    maturityScore:      maturity.score,
    maturityLabel:      maturity.label,
    criticalUncovered,
    lastSessionDate:    lastSession ? formatShortDate(lastSession) : '—',
    totalItemsTested:   global.checked,
  };
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function formatShortDate(isoString) {
  if (!isoString) return '—';
  const d = new Date(isoString);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}
