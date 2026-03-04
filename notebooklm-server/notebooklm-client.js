/**
 * notebooklm-client.js
 * ─────────────────────────────────────────────────────────
 * Client JS pour le serveur NotebookLM local (http://localhost:5050)
 * Compatible avec n'importe quel projet JS (browser ou Node.js)
 *
 * Usage (import ES module):
 *   import { generateScenarios, suggestMissingItems, analyzeRisks } from './notebooklm-client.js';
 *
 * Usage (require CommonJS):
 *   const { generateScenarios } = require('./notebooklm-client.js');
 */

const NOTEBOOKLM_SERVER = 'http://localhost:5050';

/**
 * Appelle le serveur NotebookLM local.
 * @param {string} endpoint
 * @param {object} body
 * @returns {Promise<object>}
 */
async function callNotebookLM(endpoint, body = {}) {
    const response = await fetch(`${NOTEBOOKLM_SERVER}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Vérifie que le serveur NotebookLM local est disponible.
 * @returns {Promise<boolean>}
 */
export async function isNotebookLMAvailable() {
    try {
        const res = await fetch(`${NOTEBOOKLM_SERVER}/status`, { signal: AbortSignal.timeout(2000) });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Liste les notebooks disponibles.
 * @returns {Promise<Array>}
 */
export async function listNotebooks() {
    const res = await fetch(`${NOTEBOOKLM_SERVER}/notebooks`);
    const data = await res.json();
    return data.notebooks || [];
}

/**
 * Crée un nouveau notebook.
 * @param {string} title
 * @returns {Promise<{id: string, title: string}>}
 */
export async function createNotebook(title) {
    return callNotebookLM('/notebooks', { title });
}

/**
 * Ajoute une source URL à un notebook.
 * @param {string} notebookId
 * @param {string} url
 * @returns {Promise<object>}
 */
export async function addSourceUrl(notebookId, url) {
    const res = await fetch(`${NOTEBOOKLM_SERVER}/notebooks/${notebookId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
    });
    return res.json();
}

/**
 * Pose une question à un notebook.
 * @param {string} question
 * @param {string} notebookId
 * @returns {Promise<{answer: string}>}
 */
export async function ask(question, notebookId) {
    return callNotebookLM('/ask', { question, notebook_id: notebookId });
}

/**
 * Génère des scénarios de test QA via NotebookLM.
 * Compatible avec l'interface existante de ai-client.js
 *
 * @param {string} featureDescription
 * @param {string} featureType
 * @param {string} context
 * @param {object} options - { onProgress?, notebookId? }
 * @returns {Promise<{scenarios: Array, reasoning: string}>}
 */
export async function generateScenarios(featureDescription, featureType, context, options = {}) {
    const { onProgress, notebookId } = options;

    if (onProgress) onProgress({ status: 'calling', attempt: 0 });

    const result = await callNotebookLM('/generate-scenarios', {
        feature_description: featureDescription,
        feature_type: featureType,
        context,
        notebook_id: notebookId
    });

    if (onProgress) onProgress({ status: 'done' });
    return result;
}

/**
 * Suggère les items de test manquants via NotebookLM.
 * Compatible avec l'interface existante de ai-client.js
 *
 * @param {Array} existingItems
 * @param {string} featureType
 * @param {string} featureName
 * @param {object} options - { onProgress?, notebookId? }
 * @returns {Promise<{suggestions: Array, explanation: string}>}
 */
export async function suggestMissingItems(existingItems, featureType, featureName, options = {}) {
    const { onProgress, notebookId } = options;

    if (onProgress) onProgress({ status: 'calling', attempt: 0 });

    const result = await callNotebookLM('/suggest-missing', {
        existing_items: existingItems,
        feature_type: featureType,
        feature_name: featureName,
        notebook_id: notebookId
    });

    if (onProgress) onProgress({ status: 'done' });
    return result;
}

/**
 * Analyse les risques d'une checklist via NotebookLM.
 * Compatible avec l'interface existante de ai-client.js
 *
 * @param {Array} checklist
 * @param {object} stats
 * @param {object} options - { onProgress?, notebookId? }
 * @returns {Promise<{riskLevel, riskScore, insights, recommendations, blockers}>}
 */
export async function analyzeRisks(checklist, stats, options = {}) {
    const { onProgress, notebookId } = options;

    if (onProgress) onProgress({ status: 'calling', attempt: 0 });

    const result = await callNotebookLM('/analyze-risks', {
        checklist,
        stats,
        notebook_id: notebookId
    });

    if (onProgress) onProgress({ status: 'done' });
    return result;
}
