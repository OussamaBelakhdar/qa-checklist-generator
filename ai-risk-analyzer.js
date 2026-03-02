/**
 * ai-risk-analyzer.js — Analyse des risques via Gemini
 * ──────────────────────────────────────────────────────
 * Interface :
 *   analyzeCurrentRisks(checklist, stats)
 *   → { riskLevel, riskScore, summary, insights, recommendations, blockers }
 *
 * Déclenchement automatique :
 *   - Quand coverage < 40% sur des items Critical
 *   - Après 10 items cochés
 *   - Sur demande explicite
 */

import { analyzeRisks } from './ai-client.js';

/**
 * Analyse les risques de la checklist courante.
 * @param {Array} checklist - Items avec état checked
 * @param {object} stats - { percent, total, checked, critical, high, medium, low }
 * @returns {Promise<{riskLevel, riskScore, summary, insights, recommendations, blockers}>}
 */
export async function analyzeCurrentRisks(checklist, stats) {
    if (checklist.length < 5) {
        throw new Error("Pas assez d'items pour une analyse pertinente (minimum 5)");
    }

    const criticalUnchecked = checklist.filter(i => i.priority === 'critical' && !i.checked).length;
    const highUnchecked = checklist.filter(i => i.priority === 'high' && !i.checked).length;

    return analyzeRisks(checklist, {
        coverage: stats.percent,
        totalItems: stats.total,
        checkedItems: stats.checked,
        criticalUnchecked,
        highUnchecked,
    });
}

/**
 * Détermine si l'analyse des risques doit se déclencher automatiquement.
 * Conditions : >= 10 items cochés ET items Critical encore non testés.
 * @param {object} state - État courant du moteur (getState())
 * @returns {boolean}
 */
export function shouldAutoTrigger(state) {
    if (!state?.checklist?.length) return false;

    const criticalUnchecked = state.checklist.filter(
        i => i.priority === 'critical' && !i.checked
    ).length;
    const totalChecked = state.checklist.filter(i => i.checked).length;

    // Auto-trigger si : 10+ items cochés ET items critical encore non testés
    return totalChecked >= 10 && criticalUnchecked > 0;
}
