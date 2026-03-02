/**
 * renderer.js — Couche Interface Utilisateur
 * ─────────────────────────────────────────────
 * Responsabilité unique : construire et mettre à jour le DOM.
 * Ne contient AUCUNE logique métier.
 * Reçoit des données depuis engine.js, affiche, c'est tout.
 */

import { getItemsBySection, getStats } from './engine.js';

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Rend la checklist complète dans le DOM.
 * Appelé à chaque changement d'état.
 */
export function renderChecklist(state) {
  const { name } = state;
  const stats = getStats();
  const sections = getItemsBySection();
  const output = document.getElementById('output');

  output.innerHTML = buildHeader(name, stats)
    + buildStats(stats)
    + buildProgressBar(stats.percent)
    + buildSections(sections);
}

// ─────────────────────────────────────────────
// BUILDERS — Chaque fonction construit un morceau de HTML
// ─────────────────────────────────────────────

function buildHeader(name, stats) {
  const date = new Date().toLocaleDateString('fr-FR');
  return `
    <div class="checklist-header">
      <div>
        <div class="checklist-title">${escapeHtml(name)}</div>
        <div class="checklist-meta">
          Session du ${date} · ${stats.total} test cases
        </div>
      </div>
    </div>
  `;
}

function buildStats(stats) {
  return `
    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${stats.checked}/${stats.total}</div>
        <div class="stat-label">Complété</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--danger)">${stats.critical}</div>
        <div class="stat-label">Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--accent3)">${stats.high}</div>
        <div class="stat-label">High</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" style="color:var(--success)">${stats.medium + stats.low}</div>
        <div class="stat-label">Med / Low</div>
      </div>
    </div>
  `;
}

function buildProgressBar(percent) {
  return `
    <div class="progress-bar">
      <div class="progress-fill" style="width:${percent}%"></div>
    </div>
  `;
}

function buildSections(sections) {
  if (Object.keys(sections).length === 0) {
    return `
      <div class="empty-state">
        <span class="empty-icon">🔍</span>
        <h3>Aucun item</h3>
        <p>Aucun item ne correspond au filtre sélectionné.</p>
      </div>
    `;
  }

  return Object.entries(sections).map(([sectionName, items]) => `
    <div class="section">
      <div class="section-title">${escapeHtml(sectionName)}</div>
      ${items.map((item, i) => buildItem(item, i)).join('')}
    </div>
  `).join('');
}

function buildItem(item, index) {
  const checkedClass = item.checked ? 'checked' : '';
  const checkIcon = item.checked ? '✓' : '';

  return `
    <div
      class="item ${checkedClass}"
      data-id="${item.id}"
      style="animation-delay:${index * 0.04}s"
    >
      <div class="priority-dot p-${item.priority}"></div>
      <div class="checkbox">${checkIcon}</div>
      <div class="item-content">
        <div class="item-text">${escapeHtml(item.text)}</div>
        <div class="item-desc">${escapeHtml(item.desc)}</div>
        <span class="badge badge-${item.priority}">${item.priority}</span>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// BANNIÈRE DE RESTAURATION
// ─────────────────────────────────────────────

export function showRestoreBanner(savedAt, onClear) {
  removeRestoreBanner();

  const date = new Date(savedAt);
  const formatted = date.toLocaleDateString('fr-FR')
    + ' à '
    + date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const banner = document.createElement('div');
  banner.id = 'restoreBanner';
  banner.className = 'restore-banner';
  banner.innerHTML = `
    <span>⚡ Session restaurée — sauvegardée le ${formatted}</span>
    <button id="clearBannerBtn" class="banner-close">✕ Effacer</button>
  `;

  const filterBar = document.getElementById('filterBar');
  filterBar.parentNode.insertBefore(banner, filterBar);

  document.getElementById('clearBannerBtn').addEventListener('click', () => {
    onClear();
    removeRestoreBanner();
  });
}

export function removeRestoreBanner() {
  const existing = document.getElementById('restoreBanner');
  if (existing) existing.remove();
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Échappe les caractères HTML pour éviter les injections XSS.
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Met à jour le filtre actif visuellement dans les boutons de filtre.
 */
export function updateFilterUI(activeFilter) {
  document.querySelectorAll('.tag').forEach(tag => {
    tag.classList.remove('active');
    if (tag.dataset.priority === activeFilter) {
      tag.classList.add('active');
    }
  });
}

/**
 * Affiche ou cache la barre de filtres et la barre d'actions.
 */
export function showControls(visible) {
  const filterBar = document.getElementById('filterBar');
  const actionsBar = document.getElementById('actionsBar');
  const display = visible ? 'flex' : 'none';
  if (filterBar) filterBar.style.display = display;
  if (actionsBar) actionsBar.style.display = display;
}
