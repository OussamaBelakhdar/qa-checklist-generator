/**
 * ai-generator.js — Génération IA de scénarios de test
 * ────────────────────────────────────────────────────
 * Interface :
 *   generateAIScenarios(description, featureType, featureName)
 *   → { items: Array<ChecklistItem>, reasoning: string }
 *
 * Les items retournés sont au même format que checklists.js :
 *   { id, text, desc, priority, section, checked, aiGenerated: true }
 */

import { generateScenarios } from './ai-client.js';

let nextId = 10000; // IDs IA commencent à 10000 pour éviter collisions

/**
 * Génère des items checklist via Gemini 2.5 Pro.
 * @param {string} description - Description en langage naturel de la feature
 * @param {string} featureType - Type de feature (login, api, etc.)
 * @param {string} featureName - Nom de la feature
 * @param {object} options - { context?, onProgress? }
 * @returns {Promise<{items: Array, reasoning: string}>}
 */
export async function generateAIScenarios(description, featureType, featureName = '', options = {}) {
    const { context = '', onProgress } = options;

    if (!description || description.trim().length < 10) {
        throw new Error('Description trop courte — minimum 10 caractères');
    }

    const rawResult = await generateScenarios(description, featureType, context, {
        onProgress: (p) => onProgress?.({ phase: 'gemini', ...p }),
    });

    // Convertir les scénarios IA en items compatibles engine.js
    // engine.js utilise { text, desc, priority, section, checked }
    const items = rawResult.scenarios.map(scenario => ({
        id: nextId++,
        text: scenario.label,
        desc: scenario.expectedResult || scenario.steps?.join(' → ') || '',
        priority: scenario.priority,
        section: `⚡ IA — ${scenario.category || 'Général'}`,
        checked: false,
        aiGenerated: true,
        steps: scenario.steps || [],
        expectedResult: scenario.expectedResult || '',
    }));

    return {
        items,
        reasoning: rawResult.reasoning,
    };
}
