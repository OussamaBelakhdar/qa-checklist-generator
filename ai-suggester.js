/**
 * ai-suggester.js — Suggestions d'items manquants via Claude
 * ───────────────────────────────────────────────────────────
 * Interface :
 *   getSuggestions(checklist, featureType, featureName)
 *   → { suggestions: Array<ChecklistItem>, explanation: string }
 *
 * Throttling : ne pas appeler plus d'une fois par 30 secondes
 */

import { suggestMissingItems } from './ai-client.js';

let lastCallTime = 0;
const THROTTLE_MS = 30_000; // 30 secondes minimum entre deux appels

/**
 * Obtient des suggestions d'items manquants via Claude.
 * @param {Array} checklist - Checklist actuelle
 * @param {string} featureType - Type de feature
 * @param {string} featureName - Nom de la feature
 * @param {object} options - { force?, onProgress? }
 * @returns {Promise<{suggestions: Array, explanation: string}>}
 */
export async function getSuggestions(checklist, featureType, featureName = '', options = {}) {
    const { force = false, onProgress } = options;

    const now = Date.now();
    if (!force && now - lastCallTime < THROTTLE_MS) {
        const remaining = Math.ceil((THROTTLE_MS - (now - lastCallTime)) / 1000);
        throw new Error(`Attendre encore ${remaining}s avant la prochaine suggestion`);
    }

    // N'envoyer que les métadonnées essentielles
    const minimalItems = checklist.map(({ text, desc, priority, section }) => ({
        label: text || desc,
        priority,
        category: section,
    }));

    const result = await suggestMissingItems(minimalItems, featureType, featureName, {
        onProgress: (p) => onProgress?.({ phase: 'claude', ...p }),
    });

    lastCallTime = Date.now();

    let nextId = 20000;
    const suggestions = result.suggestions.map(s => ({
        id: nextId++,
        text: s.label,
        desc: s.rationale || '',
        priority: s.priority,
        section: `💡 Suggestion — ${s.category || 'Général'}`,
        checked: false,
        aiSuggested: true,
        rationale: s.rationale,
    }));

    return { suggestions, explanation: result.explanation };
}

/**
 * Retourne le temps restant avant le prochain appel possible (en secondes).
 * @returns {number} secondes restantes, 0 si disponible
 */
export function getThrottleRemaining() {
    const elapsed = Date.now() - lastCallTime;
    if (elapsed >= THROTTLE_MS) return 0;
    return Math.ceil((THROTTLE_MS - elapsed) / 1000);
}
