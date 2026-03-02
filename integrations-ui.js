/**
 * integrations-ui.js — Panneau d'intégration GitHub / Jira (stub v6)
 * ─────────────────────────────────────────────
 * Ce module sera implémenté complètement dans une version ultérieure.
 * Pour l'instant, il expose les fonctions attendues par l'orchestrateur.
 */

import { showToast } from './renderer.js';

/**
 * Ouvre le panneau d'intégration GitHub ou Jira.
 * @param {string} platform - 'github' ou 'jira'
 * @param {Array} checklist - Items de la checklist
 * @param {string} featureName - Nom de la feature
 */
export function openIntegrationPanel(platform, checklist, featureName) {
    showToast(`⚠ Intégration ${platform} — à venir dans une prochaine version`);
}
