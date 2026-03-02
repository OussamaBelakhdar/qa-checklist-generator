/**
 * ai-client.js — Client front-end pour les Firebase Functions IA
 * ─────────────────────────────────────────────────────────────
 * Appelle les 3 fonctions : generateScenarios, suggestMissingItems, analyzeRisks
 * Gère : retry automatique, timeout, erreurs Firebase, loading callbacks
 *
 * MODE MOCK :
 *   Si window.__AI_MOCK__ === true, retourne des fixtures au lieu d'appeler Firebase.
 *   Utile pour les tests Cypress et le développement local sans clés API.
 */

import { isFirebaseConfigured } from './firebase.js';

// ─── MOCK DATA ───
const MOCK_SCENARIOS = {
    reasoning: "Analyse mock : feature standard nécessitant des tests fonctionnels, de sécurité et d'edge cases.",
    scenarios: [
        {
            label: "Scénario nominal — fonctionnement attendu",
            priority: "critical",
            category: "Fonctionnel",
            steps: ["Préparer les données de test", "Exécuter l'action principale", "Vérifier le résultat"],
            expectedResult: "L'action se déroule sans erreur avec le résultat attendu",
            aiGenerated: true
        },
        {
            label: "Gestion d'erreur — données invalides",
            priority: "critical",
            category: "Fonctionnel",
            steps: ["Soumettre des données invalides", "Vérifier le message d'erreur"],
            expectedResult: "Message d'erreur clair sans crash",
            aiGenerated: true
        },
        {
            label: "Protection contre les injections (XSS/SQL)",
            priority: "critical",
            category: "Sécurité",
            steps: ["Injecter du code malveillant dans les champs", "Vérifier que l'injection est neutralisée"],
            expectedResult: "Aucune exécution de code, données sanitisées",
            aiGenerated: true
        },
        {
            label: "Authentification et autorisation",
            priority: "critical",
            category: "Sécurité",
            steps: ["Tester sans authentification", "Tester avec un rôle insuffisant"],
            expectedResult: "Accès refusé avec code 401/403 approprié",
            aiGenerated: true
        },
        {
            label: "Performance sous charge normale",
            priority: "high",
            category: "Performance",
            steps: ["Simuler une utilisation normale", "Mesurer le temps de réponse"],
            expectedResult: "Temps de réponse < 3 secondes",
            aiGenerated: true
        },
        {
            label: "Comportement hors ligne / timeout réseau",
            priority: "high",
            category: "Edge Cases",
            steps: ["Couper le réseau pendant l'opération", "Vérifier le comportement"],
            expectedResult: "Message d'erreur approprié, pas de corruption de données",
            aiGenerated: true
        },
        {
            label: "Double soumission (idempotence)",
            priority: "high",
            category: "Edge Cases",
            steps: ["Cliquer deux fois rapidement", "Vérifier qu'une seule action est enregistrée"],
            expectedResult: "Pas de doublon, bouton désactivé après 1er clic",
            aiGenerated: true
        },
        {
            label: "Données vides / état initial",
            priority: "high",
            category: "Edge Cases",
            steps: ["Accéder à la feature sans données", "Vérifier l'état vide"],
            expectedResult: "Message empty state clair, pas de crash",
            aiGenerated: true
        },
        {
            label: "Validation des champs avec longueurs limites",
            priority: "high",
            category: "Fonctionnel",
            steps: ["Tester avec 0 caractère", "Tester avec le maximum", "Tester au-delà du maximum"],
            expectedResult: "Validation correcte aux bornes",
            aiGenerated: true
        },
        {
            label: "Accessibilité clavier complète",
            priority: "medium",
            category: "Accessibilité",
            steps: ["Naviguer uniquement au clavier", "Vérifier le focus visible"],
            expectedResult: "Tous les éléments accessibles, focus visible",
            aiGenerated: true
        },
        {
            label: "Responsive design — mobile 375px",
            priority: "medium",
            category: "UX",
            steps: ["Redimensionner à 375px", "Vérifier la mise en page"],
            expectedResult: "Mise en page adaptée, pas de débordement horizontal",
            aiGenerated: true
        },
        {
            label: "Compatibilité navigateurs (Chrome, Firefox, Safari)",
            priority: "medium",
            category: "UX",
            steps: ["Tester dans chaque navigateur majeur"],
            expectedResult: "Fonctionnement identique",
            aiGenerated: true
        },
        {
            label: "Affichage correct avec données longues",
            priority: "medium",
            category: "UX",
            steps: ["Insérer un texte très long", "Vérifier le rendu"],
            expectedResult: "Texte tronqué ou wrappé proprement",
            aiGenerated: true
        },
        {
            label: "Logs et monitoring — pas de données sensibles",
            priority: "low",
            category: "Sécurité",
            steps: ["Vérifier les logs réseau et console", "Chercher des données sensibles"],
            expectedResult: "Aucune donnée sensible dans les logs",
            aiGenerated: true
        },
        {
            label: "Message d'erreur localisé en français",
            priority: "low",
            category: "UX",
            steps: ["Déclencher chaque type d'erreur", "Vérifier la langue"],
            expectedResult: "Tous les messages en français",
            aiGenerated: true
        }
    ]
};

const MOCK_SUGGESTIONS = {
    explanation: "La checklist actuelle couvre bien les cas fonctionnels de base mais manque de tests de sécurité (injection, XSS), de tests d'accessibilité WCAG, et de scénarios de performance sous charge.",
    suggestions: [
        {
            label: "Injection SQL dans les champs de formulaire",
            priority: "critical",
            category: "Sécurité",
            rationale: "Les formulaires sans sanitization exposent à des attaques SQL injection. Tester avec des payloads classiques.",
            aiSuggested: true
        },
        {
            label: "Protection XSS dans les entrées utilisateur",
            priority: "critical",
            category: "Sécurité",
            rationale: "Les données utilisateur non échappées peuvent permettre l'exécution de scripts malveillants.",
            aiSuggested: true
        },
        {
            label: "Navigation clavier complète (tabindex)",
            priority: "medium",
            category: "Accessibilité",
            rationale: "WCAG 2.1 requiert une navigation complète au clavier pour tous les éléments interactifs.",
            aiSuggested: true
        },
        {
            label: "Contraste des couleurs conforme WCAG AA",
            priority: "medium",
            category: "Accessibilité",
            rationale: "Le ratio de contraste minimum 4.5:1 doit être respecté pour le texte standard.",
            aiSuggested: true
        },
        {
            label: "Temps de chargement initial sous 3 secondes",
            priority: "high",
            category: "Performance",
            rationale: "Au-delà de 3s, le taux d'abandon augmente significativement. À mesurer avec Lighthouse.",
            aiSuggested: true
        }
    ]
};

const MOCK_RISK_ANALYSIS = {
    riskLevel: "critical",
    riskScore: 78,
    summary: "Plusieurs items Critical non testés représentent un risque élevé de mise en production.",
    insights: [
        "Aucun test de sécurité complété — vulnérabilités potentielles non détectées",
        "La gestion des erreurs n'est pas validée — risque de crash en production",
        "Les scénarios d'edge cases ne sont pas couverts — comportements imprévus possibles"
    ],
    recommendations: [
        {
            action: "Prioriser les tests de sécurité (injection, XSS, authentification)",
            priority: "immediate",
            rationale: "Impact direct sur la sécurité des données utilisateurs"
        },
        {
            action: "Valider la gestion de toutes les erreurs réseau et serveur",
            priority: "immediate",
            rationale: "Expérience utilisateur dégradée en cas de problème réseau"
        },
        {
            action: "Couvrir les cas limites (données vides, longues, caractères spéciaux)",
            priority: "short_term",
            rationale: "Bugs fréquents en production liés aux données non standard"
        }
    ],
    blockers: [
        "Tests de sécurité non effectués — bloquant pour la mise en production",
        "Validation des erreurs critiques manquante"
    ]
};

// ─── Firebase Functions Dynamic Import ───
let functionsModule = null;
let functionsInstance = null;

/**
 * Initialise le module Firebase Functions de façon lazy.
 * @returns {Promise<object|null>}
 */
async function getFunctionsInstance() {
    if (functionsInstance) return functionsInstance;
    if (!isFirebaseConfigured()) return null;

    try {
        functionsModule = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
        const { initializeApp, getApps } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
        const app = getApps()[0];
        if (app) {
            functionsInstance = functionsModule.getFunctions(app, 'us-central1');
        }
    } catch (err) {
        console.warn('Firebase Functions non disponible:', err.message);
    }
    return functionsInstance;
}

/**
 * Vérifie si le mode mock est actif.
 * @returns {boolean}
 */
function isMockMode() {
    return typeof window !== 'undefined' && window.__AI_MOCK__ === true;
}

/**
 * Simule un délai réseau pour le mode mock.
 * @param {number} ms
 */
async function mockDelay(ms = 800) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * Appelle une Firebase Function avec retry, ou retourne des mock data.
 * @param {string} name - Nom de la function
 * @param {object} data - Données à envoyer
 * @param {object} options - { onProgress?, maxRetries?, timeout? }
 * @returns {Promise<object>}
 */
async function callFunction(name, data, options = {}) {
    const { onProgress, maxRetries = 2, timeout = 55000 } = options;

    // ── Mock Mode ──
    if (isMockMode()) {
        if (onProgress) onProgress({ status: 'calling', attempt: 0 });
        await mockDelay(1200);
        if (onProgress) onProgress({ status: 'done' });

        switch (name) {
            case 'generateScenarios': return MOCK_SCENARIOS;
            case 'suggestMissingItems': return MOCK_SUGGESTIONS;
            case 'analyzeRisks': return MOCK_RISK_ANALYSIS;
            default: throw new Error(`Fonction mock inconnue : ${name}`);
        }
    }

    // ── Real Mode ──
    const functions = await getFunctionsInstance();
    if (!functions) {
        throw new Error('Firebase non configuré — mode offline indisponible pour les features IA');
    }

    const fn = functionsModule.httpsCallable(functions, name, { timeout });
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (onProgress) onProgress({ status: 'calling', attempt });
            const result = await fn(data);
            if (onProgress) onProgress({ status: 'done' });
            return result.data;
        } catch (err) {
            lastError = err;
            // Ne pas retry si non authentifié
            if (err.code === 'functions/unauthenticated') throw err;
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
            }
        }
    }

    throw lastError;
}

// ─── EXPORTS ───

/**
 * Génère des scénarios de test via Gemini 2.5 Pro (Firebase Function).
 * @param {string} featureDescription - Description en langage naturel
 * @param {string} featureType - Type de feature (login, api, etc.)
 * @param {string} context - Contexte technique additionnel
 * @param {object} options - { onProgress? }
 * @returns {Promise<{scenarios: Array, reasoning: string}>}
 */
export async function generateScenarios(featureDescription, featureType, context, options) {
    return callFunction('generateScenarios', { featureDescription, featureType, context }, options);
}

/**
 * Suggère les items manquants via Claude (Firebase Function).
 * @param {Array} existingItems - Items existants (label, priority, category)
 * @param {string} featureType - Type de feature
 * @param {string} featureName - Nom de la feature
 * @param {object} options - { onProgress? }
 * @returns {Promise<{suggestions: Array, explanation: string}>}
 */
export async function suggestMissingItems(existingItems, featureType, featureName, options) {
    return callFunction('suggestMissingItems', { existingItems, featureType, featureName }, options);
}

/**
 * Analyse les risques de la checklist via Gemini (Firebase Function).
 * @param {Array} checklist - Items avec état checked
 * @param {object} stats - Statistiques (coverage, totals)
 * @param {object} options - { onProgress? }
 * @returns {Promise<{riskLevel, riskScore, insights, recommendations, blockers}>}
 */
export async function analyzeRisks(checklist, stats, options) {
    return callFunction('analyzeRisks', { checklist, stats }, options);
}
