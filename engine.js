/**
 * engine.js — Couche Logique Métier (Core)
 * ─────────────────────────────────────────────
 * Responsabilité unique : gérer l'état de l'application.
 * Ne touche JAMAIS au DOM. Ne connaît pas le HTML.
 * Reçoit des données, retourne des données.
 *
 * C'est le cerveau pur de l'application.
 */

import { CHECKLISTS } from './checklists.js';

// ─────────────────────────────────────────────
// STATE — Source unique de vérité
// ─────────────────────────────────────────────
let state = {
  type: null,           // clé du type de feature (ex: 'login')
  name: '',             // nom personnalisé de la session
  checklist: [],        // liste plate de tous les items avec leurs states
  filter: 'all',        // filtre actif : 'all' | 'critical' | 'high' | 'medium' | 'low'
};

/**
 * Retourne une copie de l'état courant.
 * Les composants UI lisent toujours depuis getState().
 */
export function getState() {
  return { ...state, checklist: [...state.checklist] };
}

// ─────────────────────────────────────────────
// ACTIONS — Toutes les mutations de l'état
// ─────────────────────────────────────────────

/**
 * Génère une nouvelle checklist à partir d'un type de feature.
 * Remet le filtre à 'all' et réinitialise tous les items.
 */
export function generateChecklist(type, name = '') {
  if (!CHECKLISTS[type]) {
    throw new Error(`Type de feature inconnu : "${type}"`);
  }

  const data = CHECKLISTS[type];
  const checklist = [];
  let id = 0;

  for (const [section, items] of Object.entries(data.sections)) {
    for (const item of items) {
      checklist.push({
        ...item,
        section,
        id: id++,
        checked: false,
      });
    }
  }

  state = {
    type,
    name: name || data.label,
    checklist,
    filter: 'all',
  };

  return getState();
}

/**
 * Coche ou décoche un item par son ID.
 * Retourne le nouvel état.
 */
export function toggleItem(id) {
  const item = state.checklist.find(i => i.id === id);
  if (!item) return getState();

  item.checked = !item.checked;
  return getState();
}

/**
 * Coche tous les items.
 */
export function checkAll() {
  state.checklist.forEach(i => i.checked = true);
  return getState();
}

/**
 * Décoche tous les items.
 */
export function uncheckAll() {
  state.checklist.forEach(i => i.checked = false);
  return getState();
}

/**
 * Change le filtre actif.
 */
export function setFilter(filter) {
  const valid = ['all', 'critical', 'high', 'medium', 'low'];
  if (!valid.includes(filter)) return getState();
  state.filter = filter;
  return getState();
}

/**
 * Restaure un état complet depuis une session sauvegardée.
 */
export function restoreState(savedState) {
  state = { ...savedState };
  return getState();
}

/**
 * Ajoute des items (IA ou suggestions) à la checklist active.
 * Les IDs sont recalculés pour éviter les collisions.
 * @param {Array} newItems - Items à ajouter ({ text, desc, priority, section, ... })
 * @returns {object} État mis à jour
 */
export function addItems(newItems) {
  if (!state.type || !Array.isArray(newItems) || newItems.length === 0) return getState();

  const maxId = state.checklist.reduce((max, i) => Math.max(max, i.id || 0), 0);
  let nextId = maxId + 1;

  for (const item of newItems) {
    state.checklist.push({
      ...item,
      id: nextId++,
      checked: item.checked ?? false,
    });
  }

  return getState();
}

// ─────────────────────────────────────────────
// COMPUTED — Calculs dérivés de l'état
// ─────────────────────────────────────────────

/**
 * Retourne les items visibles selon le filtre actif.
 */
export function getVisibleItems() {
  const { checklist, filter } = state;
  return filter === 'all'
    ? checklist
    : checklist.filter(i => i.priority === filter);
}

/**
 * Retourne les items groupés par section (pour l'affichage).
 */
export function getItemsBySection() {
  const visible = getVisibleItems();
  const sections = {};

  for (const item of visible) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }

  return sections;
}

/**
 * Retourne les statistiques de la session courante.
 */
export function getStats() {
  const { checklist } = state;
  const total = checklist.length;
  const checked = checklist.filter(i => i.checked).length;

  return {
    total,
    checked,
    unchecked: total - checked,
    percent: total ? Math.round((checked / total) * 100) : 0,
    critical: checklist.filter(i => i.priority === 'critical').length,
    high: checklist.filter(i => i.priority === 'high').length,
    medium: checklist.filter(i => i.priority === 'medium').length,
    low: checklist.filter(i => i.priority === 'low').length,
  };
}

/**
 * Retourne true si l'état courant est valide (une checklist est chargée).
 */
export function hasActiveSession() {
  return state.type !== null && state.checklist.length > 0;
}
