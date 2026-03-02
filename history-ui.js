/**
 * history-ui.js — Interface Historique des Sessions
 * ─────────────────────────────────────────────
 * Affiche la liste des sessions sauvegardées de l'utilisateur.
 * Permet de rouvrir une session ou de la supprimer.
 */

import { getUserSessions, deleteSession } from './sessions.js';
import { showToast } from './renderer.js';

// ─────────────────────────────────────────────
// RENDER
// ─────────────────────────────────────────────

/**
 * Charge et affiche l'historique des sessions dans un panneau latéral.
 * onRestore(session) est appelé quand l'utilisateur clique sur une session.
 */
export async function renderHistory(uid, container, onRestore) {
  container.innerHTML = buildLoadingHTML();

  const sessions = await getUserSessions(uid, 20);

  if (sessions.length === 0) {
    container.innerHTML = buildEmptyHistoryHTML();
    return;
  }

  container.innerHTML = buildHistoryHTML(sessions);
  bindHistoryEvents(container, sessions, onRestore);
}

// ─────────────────────────────────────────────
// BUILDERS
// ─────────────────────────────────────────────

function buildLoadingHTML() {
  return `
    <div class="history-loading">
      <div class="spinner"></div>
      <p>Chargement de l'historique...</p>
    </div>
  `;
}

function buildEmptyHistoryHTML() {
  return `
    <div class="history-empty">
      <span>📋</span>
      <p>Aucune session sauvegardée</p>
      <small>Génère ta première checklist pour la retrouver ici</small>
    </div>
  `;
}

function buildHistoryHTML(sessions) {
  const TYPE_ICONS = {
    login: '🔐', form: '📝', api: '🔌', payment: '💳',
    upload: '📁', dashboard: '📊', crud: '🗃️',
    search: '🔍', notification: '🔔', accessibility: '♿',
  };

  const items = sessions.map(session => {
    const icon = TYPE_ICONS[session.type] || '📋';
    const date = formatDate(session.updatedAt);
    const percent = session.stats?.percent ?? 0;
    const total = session.stats?.total ?? '?';
    const checked = session.stats?.checked ?? '?';

    return `
      <div class="history-item" data-session-id="${session.sessionId}">
        <div class="history-icon">${icon}</div>
        <div class="history-content">
          <div class="history-name">${escapeHtml(session.name)}</div>
          <div class="history-meta">${date} · ${checked}/${total} · ${percent}%</div>
          <div class="history-bar">
            <div class="history-bar-fill" style="width:${percent}%"></div>
          </div>
        </div>
        <div class="history-actions">
          <button class="history-restore" data-id="${session.sessionId}" title="Rouvrir">↗</button>
          <button class="history-delete" data-id="${session.sessionId}" title="Supprimer">✕</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="history-panel">
      <div class="history-header">
        <span class="history-title">Mes sessions</span>
        <span class="history-count">${sessions.length}</span>
      </div>
      <div class="history-list">
        ${items}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindHistoryEvents(container, sessions, onRestore) {
  // Restaurer une session
  container.querySelectorAll('.history-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const session = sessions.find(s => s.sessionId === id);
      if (session) onRestore(session);
    });
  });

  // Clic sur l'item entier = restaurer aussi
  container.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = item.dataset.sessionId;
      const session = sessions.find(s => s.sessionId === id);
      if (session) onRestore(session);
    });
  });

  // Supprimer une session
  container.querySelectorAll('.history-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;

      if (!confirm('Supprimer cette session ?')) return;

      const result = await deleteSession(id);
      if (result.success) {
        // Retire visuellement l'item
        const item = container.querySelector(`[data-session-id="${id}"]`);
        if (item) {
          item.style.transition = 'opacity 0.3s';
          item.style.opacity = '0';
          setTimeout(() => item.remove(), 300);
        }
        showToast('🗑 Session supprimée');
      } else {
        showToast('❌ Erreur lors de la suppression');
      }
    });
  });
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function formatDate(isoString) {
  if (!isoString) return 'Date inconnue';
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  if (diff < 60_000) return 'À l\'instant';
  if (diff < 3_600_000) return `Il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `Il y a ${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `Il y a ${Math.floor(diff / 86_400_000)}j`;

  return date.toLocaleDateString('fr-FR');
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
