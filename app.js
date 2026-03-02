/**
 * app-v9.js — Orchestrateur v9 (IA: Gemini + Claude)
 * ─────────────────────────────────────────────
 * Extension de app-v8.js.
 * Ajoute 3 features IA :
 *   - ✨ Génération de scénarios (Gemini 2.5 Pro)
 *   - 💡 Suggestions d'items manquants (Claude)
 *   - 🎯 Analyse des risques (Gemini)
 *
 * NOUVEAUTÉS v9 :
 *   - Boutons IA dans la barre d'actions
 *   - Panneau de génération IA (modal)
 *   - Panneau de suggestions (sidebar)
 *   - Widget d'analyse des risques (inline)
 *   - Auto-trigger risk analysis après X items cochés
 *   - Mode mock (window.__AI_MOCK__) pour dev/test
 */

// ─── Imports v6-v8 ───
import { CHECKLISTS, getFeatureTypes } from './checklists.js';
import {
    generateChecklist, toggleItem, checkAll, uncheckAll,
    setFilter, getState, restoreState, hasActiveSession,
    addItems,
} from './engine.js';
import { saveSession as saveLocal, loadSession as loadLocal, clearSession as clearLocal } from './storage.js';
import {
    renderChecklist, showRestoreBanner, removeRestoreBanner,
    showToast, updateFilterUI, showControls,
} from './renderer.js';
import { exportMarkdown, exportCSV, copyToClipboard } from './exporters.js';
import { onAuthChange, logout, getCurrentUser } from './auth.js';
import { getUserProfile, touchUserActivity, incrementSessionCount } from './users.js';
import {
    saveSession as saveCloud, updateSession,
    getUserSessions, computeSessionStats,
} from './sessions.js';
import { renderAuthPanel } from './auth-ui.js';
import { renderHistory } from './history-ui.js';
import { isFirebaseConfigured } from './firebase.js';
import { openIntegrationPanel } from './integrations-ui.js';

// ─── Import v8 ───
import { openSharePanel } from './share-ui.js';
import { loadAllSessions } from './aggregator.js';

// ─── Imports v9 (IA) ───
import { generateAIScenarios } from './ai-generator.js';
import { getSuggestions } from './ai-suggester.js';
import { analyzeCurrentRisks, shouldAutoTrigger } from './ai-risk-analyzer.js';
import { openGeneratorPanel, showSuggestionsPanel, renderRiskWidget, closeAllAIPanels } from './ai-panel.js';

// ─────────────────────────────────────────────
// ÉTAT GLOBAL
// ─────────────────────────────────────────────
let currentUser = null;
let currentSessionId = null;
let offlineMode = false;
let currentProfile = null;
let riskAnalysisTriggered = false; // Éviter les auto-triggers multiples par session

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // ─── Mock mode (dev/test) ───
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mock') === 'true') {
        window.__AI_MOCK__ = true;
    }

    if (!isFirebaseConfigured()) {
        // Firebase non configuré → démarrage immédiat en mode local, pas d'overlay auth
        showFirebaseWarning();
        offlineMode = true;
        initToolOffline();
        return;
    }

    onAuthChange(handleAuthStateChange);
    document.addEventListener('auth:skip', () => {
        offlineMode = true;
        hideAuthPanel();
        initToolOffline();
    });
});

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────

async function handleAuthStateChange(user) {
    if (user) {
        currentUser = user;
        offlineMode = false;
        hideAuthPanel();
        await touchUserActivity(user.uid);
        currentProfile = await getUserProfile(user.uid);
        renderUserBadge(currentProfile || { displayName: user.displayName || user.email });
        await initToolAuthenticated(user);
    } else {
        currentUser = null;
        currentProfile = null;
        if (!offlineMode) showAuthPanel();
    }
}

// ─────────────────────────────────────────────
// INIT OUTIL
// ─────────────────────────────────────────────

async function initToolAuthenticated(user) {
    populateFeatureSelect();
    bindAllEvents();
    renderHistoryPanel(user.uid);

    const localSession = loadLocal();
    if (localSession && CHECKLISTS[localSession.type]) {
        restoreToEngine(localSession);
    } else {
        const sessions = await getUserSessions(user.uid, 1);
        if (sessions.length > 0) restoreToEngine(sessions[0]);
    }
}

function initToolOffline() {
    populateFeatureSelect();
    bindAllEvents();
    const session = loadLocal();
    if (session && CHECKLISTS[session.type]) restoreToEngine(session);
}

function restoreToEngine(session) {
    const state = restoreState(session);
    document.getElementById('featureType').value = session.type || '';
    document.getElementById('featureName').value = session.name || '';
    renderChecklist(state);
    updateFilterUI(state.filter);
    showControls(true);
    if (session.savedAt || session.updatedAt) {
        showRestoreBanner(session.savedAt || session.updatedAt, () => {
            clearLocal();
            showToast('🗑 Session effacée');
        });
    }
    if (session.sessionId) currentSessionId = session.sessionId;
}

// ─────────────────────────────────────────────
// PERSIST
// ─────────────────────────────────────────────

async function persistSession(state) {
    saveLocal(state);
    if (!currentUser) return;
    const stats = computeSessionStats(state.checklist);
    const payload = { ...state, stats };
    if (currentSessionId) {
        await updateSession(currentSessionId, payload);
    } else {
        const result = await saveCloud(currentUser.uid, payload);
        if (result.success) currentSessionId = result.sessionId;
    }
}

// ─────────────────────────────────────────────
// FEATURE SELECT
// ─────────────────────────────────────────────

function populateFeatureSelect() {
    const select = document.getElementById('featureType');
    if (select.options.length > 1) return;
    const ICONS = {
        login: '🔐', form: '📝', api: '🔌', payment: '💳',
        upload: '📁', dashboard: '📊', crud: '🗃️',
        search: '🔍', notification: '🔔', accessibility: '♿',
    };
    getFeatureTypes().forEach(({ key, label }) => {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${ICONS[key] || '📋'} ${label}`;
        select.appendChild(opt);
    });
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindAllEvents() {
    if (document.getElementById('btnGenerate')._bound) return;
    document.getElementById('btnGenerate')._bound = true;

    document.getElementById('btnGenerate').addEventListener('click', handleGenerate);
    document.getElementById('featureName').addEventListener('keydown', (e) => { if (e.key === 'Enter') handleGenerate(); });
    document.getElementById('filterBar').addEventListener('click', (e) => { const t = e.target.closest('.tag'); if (t) handleFilter(t.dataset.priority); });
    document.getElementById('output').addEventListener('click', (e) => { const i = e.target.closest('.item'); if (i) handleToggle(parseInt(i.dataset.id, 10)); });
    document.getElementById('btnRegenerate').addEventListener('click', handleGenerate);
    document.getElementById('btnCheckAll').addEventListener('click', handleCheckAll);
    document.getElementById('btnUncheckAll').addEventListener('click', handleUncheckAll);
    document.getElementById('btnExportMd').addEventListener('click', handleExportMarkdown);
    document.getElementById('btnExportCsv').addEventListener('click', handleExportCSV);
    document.getElementById('btnCopy').addEventListener('click', handleCopy);
    document.getElementById('btnReset').addEventListener('click', handleReset);
    document.getElementById('btnLogout')?.addEventListener('click', handleLogout);
    document.getElementById('btnGitHub')?.addEventListener('click', () => handleOpenIntegration('github'));
    document.getElementById('btnJira')?.addEventListener('click', () => handleOpenIntegration('jira'));

    // ─── v8 ───
    document.getElementById('btnShare')?.addEventListener('click', handleOpenShare);

    // ─── v9 IA ───
    document.getElementById('btnAIGenerate')?.addEventListener('click', handleAIGenerate);
    document.getElementById('btnAISuggest')?.addEventListener('click', handleAISuggest);
    document.getElementById('btnAIRisk')?.addEventListener('click', handleAIRisk);

    document.addEventListener('keydown', handleKeyboard);
}

// ─────────────────────────────────────────────
// HANDLERS — v6-v8 (inchangés)
// ─────────────────────────────────────────────

async function handleGenerate() {
    const type = document.getElementById('featureType').value;
    const name = document.getElementById('featureName').value.trim();
    if (!type) { showToast('⚠ Sélectionne un type de feature'); return; }
    currentSessionId = null;
    riskAnalysisTriggered = false; // Reset pour la nouvelle session
    const state = generateChecklist(type, name);
    renderChecklist(state);
    updateFilterUI('all');
    showControls(true);
    removeRestoreBanner();
    await persistSession(state);
    if (currentUser) {
        await incrementSessionCount(currentUser.uid);
        renderHistoryPanel(currentUser.uid);
    }
    showToast('✓ Checklist générée');
}

async function handleToggle(id) {
    const s = toggleItem(id);
    renderChecklist(s);
    await persistSession(s);

    // ─── v9 Auto-trigger risk analysis ───
    if (!riskAnalysisTriggered && shouldAutoTrigger(s)) {
        riskAnalysisTriggered = true;
        handleAIRiskSilent();
    }
}

async function handleFilter(p) { const s = setFilter(p); renderChecklist(s); updateFilterUI(p); await persistSession(s); }
async function handleCheckAll() { const s = checkAll(); renderChecklist(s); await persistSession(s); showToast('☑ Tous cochés'); }
async function handleUncheckAll() { const s = uncheckAll(); renderChecklist(s); await persistSession(s); showToast('☐ Tous décochés'); }

function handleExportMarkdown() { if (!hasActiveSession()) return; exportMarkdown(getState()); showToast('⬇ Markdown téléchargé'); }
function handleExportCSV() { if (!hasActiveSession()) return; exportCSV(getState()); showToast('⬇ CSV téléchargé'); }
async function handleCopy() {
    if (!hasActiveSession()) return;
    try { await copyToClipboard(getState()); showToast('⎘ Copié'); }
    catch { showToast('❌ Impossible de copier'); }
}
function handleReset() { clearLocal(); currentSessionId = null; location.reload(); }
async function handleLogout() { await logout(); clearLocal(); location.reload(); }
function handleOpenIntegration(p) {
    if (!hasActiveSession()) { showToast('⚠ Génère une checklist d\'abord'); return; }
    const s = getState();
    openIntegrationPanel(p, s.checklist, s.name || document.getElementById('featureName').value.trim() || 'Feature QA');
}

async function handleOpenShare() {
    const uid = currentUser?.uid || null;
    const sessions = await loadAllSessions(uid, 50);
    if (sessions.length === 0) {
        showToast('⚠ Génère au moins une checklist d\'abord');
        return;
    }
    const profile = currentProfile || { displayName: currentUser?.displayName || 'QA Engineer', uid };
    openSharePanel(sessions, profile);
}

// ─────────────────────────────────────────────
// HANDLERS — v9 IA
// ─────────────────────────────────────────────

/**
 * ✨ Ouvre le panneau de génération IA (Gemini).
 */
function handleAIGenerate() {
    if (!hasActiveSession()) {
        showToast('⚠ Génère une checklist d\'abord');
        return;
    }

    const state = getState();
    const featureType = state.type || document.getElementById('featureType').value;
    const featureName = state.name || document.getElementById('featureName').value.trim();

    openGeneratorPanel(featureType, featureName, (items) => {
        // Ajouter les items IA à la checklist
        const newState = addItems(items);
        renderChecklist(newState);
        persistSession(newState);
        showToast(`⚡ ${items.length} scénarios IA ajoutés`);
    });
}

/**
 * 💡 Ouvre le panneau de suggestions Claude.
 */
async function handleAISuggest() {
    if (!hasActiveSession()) {
        showToast('⚠ Génère une checklist d\'abord');
        return;
    }

    const state = getState();
    const featureType = state.type;
    const featureName = state.name;

    showSuggestionsPanel(state.checklist, featureType, featureName, (item) => {
        // Ajouter une suggestion individuelle
        const newState = addItems([item]);
        renderChecklist(newState);
        persistSession(newState);
        showToast('💡 Suggestion ajoutée');
    });
}

/**
 * 🎯 Lance l'analyse des risques (Gemini).
 */
async function handleAIRisk() {
    if (!hasActiveSession()) {
        showToast('⚠ Génère une checklist d\'abord');
        return;
    }

    const container = document.getElementById('riskContainer');
    if (!container) return;

    // Loading indicator
    container.innerHTML = `
    <div class="ai-loading">
      <div class="ai-spinner"></div>
      <span class="ai-loading-text">Analyse des risques en cours<span class="ai-dots"></span></span>
    </div>
  `;

    try {
        const state = getState();
        const stats = {
            ...computeSessionStats(state.checklist),
            percent: Math.round(
                (state.checklist.filter(i => i.checked).length / state.checklist.length) * 100
            ),
        };

        const analysis = await analyzeCurrentRisks(state.checklist, stats);
        renderRiskWidget(container, analysis);
        showToast('🎯 Analyse des risques terminée');
    } catch (err) {
        container.innerHTML = `
      <div class="ai-error" style="display:block">⚠ ${err.message}</div>
    `;
    }
}

/**
 * Auto-trigger silencieux (ne montre pas de toast d'erreur en cas d'échec).
 */
async function handleAIRiskSilent() {
    try {
        const container = document.getElementById('riskContainer');
        if (!container) return;

        const state = getState();
        const stats = {
            ...computeSessionStats(state.checklist),
            percent: Math.round(
                (state.checklist.filter(i => i.checked).length / state.checklist.length) * 100
            ),
        };

        const analysis = await analyzeCurrentRisks(state.checklist, stats);
        renderRiskWidget(container, analysis);
    } catch {
        // Silencieux — pas de toast pour l'auto-trigger
    }
}

function handleKeyboard(e) {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    const shortcuts = { 'g': handleGenerate, 'e': handleExportMarkdown, 'c': handleExportCSV, 'a': handleCheckAll, 'u': handleUncheckAll };
    const h = shortcuts[e.key.toLowerCase()];
    if (h) h();
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────

function showAuthPanel() {
    let panel = document.getElementById('authOverlay');
    if (!panel) { panel = document.createElement('div'); panel.id = 'authOverlay'; document.body.appendChild(panel); }
    panel.style.display = 'flex';
    renderAuthPanel(panel);
}

function hideAuthPanel() {
    const panel = document.getElementById('authOverlay');
    if (panel) panel.style.display = 'none';
}

function renderUserBadge(profile) {
    const badge = document.getElementById('userBadge');
    if (!badge) return;
    badge.innerHTML = `
    <span class="user-avatar">${(profile.displayName || '?')[0].toUpperCase()}</span>
    <span class="user-name">${profile.displayName}</span>
  `;
    badge.style.display = 'flex';
}

async function renderHistoryPanel(uid) {
    const panel = document.getElementById('historyPanel');
    if (!panel) return;
    await renderHistory(uid, panel, (session) => {
        currentSessionId = session.sessionId;
        restoreToEngine(session);
        showToast('⚡ Session restaurée');
    });
}

function showFirebaseWarning() {
    const banner = document.createElement('div');
    banner.style.cssText = `background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3);color:#f59e0b;padding:12px 20px;text-align:center;font-size:13px;font-family:'Space Mono',monospace;`;
    banner.textContent = '⚠ Firebase non configuré — Mode local uniquement. Voir firebase.js';
    document.body.prepend(banner);

    // En mode offline sans Firebase, activer le mock IA automatiquement
    window.__AI_MOCK__ = true;
}
