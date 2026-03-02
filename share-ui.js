/**
 * share-ui.js — Interface Export PDF + Partage
 * ─────────────────────────────────────────────
 * Panneau modal pour :
 *   1. Générer et télécharger le rapport PDF
 *   2. Créer un lien de partage public
 *   3. Voir les liens existants
 */

import { generateQAReport } from './pdf-report.js';
import { createPublicShare, saveShareMetadata, getUserSharedLinks } from './share.js';
import { showToast } from './renderer.js';
import { getCurrentUser } from './auth.js';

// ─────────────────────────────────────────────
// POINT D'ENTRÉE
// ─────────────────────────────────────────────

/**
 * Ouvre le panneau Export/Partage.
 * @param {Array}  sessions     - sessions à exporter
 * @param {Object} userProfile  - { displayName }
 */
export function openSharePanel(sessions, userProfile = {}) {
  removeSharePanel();
  const overlay = document.createElement('div');
  overlay.id = 'shareOverlay';
  overlay.innerHTML = buildShareHTML(sessions.length);
  document.body.appendChild(overlay);
  bindShareEvents(overlay, sessions, userProfile);
  loadUserLinks(overlay, userProfile.uid);
}

export function removeSharePanel() {
  const el = document.getElementById('shareOverlay');
  if (el) el.remove();
}

// ─────────────────────────────────────────────
// HTML
// ─────────────────────────────────────────────

function buildShareHTML(sessionCount) {
  return `
    <div class="share-overlay" id="shareOvInner">
      <div class="share-panel">

        <!-- HEADER -->
        <div class="share-header">
          <div class="share-title">
            <span>📤</span>
            <span>Export & Partage</span>
          </div>
          <button class="share-close" id="shareClose">✕</button>
        </div>

        <div class="share-body">

          <!-- INFOS PROJET -->
          <div class="share-section">
            <div class="share-section-label">Informations du rapport</div>
            <div class="share-form">
              <div class="share-form-row">
                <label>Nom du projet</label>
                <input type="text" id="shareProjectName" placeholder="ex: QA E-commerce Sprint 12" value="Mon Projet QA">
              </div>
              <div class="share-form-row">
                <label>Auteur</label>
                <input type="text" id="shareAuthorName" placeholder="ex: Oussama Belakhdar">
              </div>
            </div>
            <div class="share-sessions-count">
              <span>📊</span>
              <span><strong>${sessionCount}</strong> session(s) · seront incluses dans le rapport</span>
            </div>
          </div>

          <!-- EXPORT PDF -->
          <div class="share-section">
            <div class="share-section-label">Export PDF</div>
            <div class="share-option-card" id="pdfCard">
              <div class="share-option-icon">📄</div>
              <div class="share-option-info">
                <div class="share-option-title">Rapport PDF Professionnel</div>
                <div class="share-option-desc">
                  6 pages · Couverture, Executive Summary, Priorités, Features, Risques, Évolution
                </div>
              </div>
              <button class="share-action-btn" id="btnExportPDF">
                Générer PDF ↓
              </button>
            </div>

            <!-- Progress PDF -->
            <div class="share-progress" id="pdfProgress" style="display:none">
              <div class="share-progress-bar">
                <div class="share-progress-fill" id="pdfProgressFill" style="width:0%"></div>
              </div>
              <div class="share-progress-text" id="pdfProgressText">Initialisation...</div>
            </div>
          </div>

          <!-- PARTAGE PAR LIEN -->
          <div class="share-section">
            <div class="share-section-label">Partage par lien public</div>

            <div class="share-option-card" id="linkCard">
              <div class="share-option-icon">🔗</div>
              <div class="share-option-info">
                <div class="share-option-title">Lien de partage (30 jours)</div>
                <div class="share-option-desc">
                  Accessible sans compte · Lecture seule · Sessions anonymisées
                </div>
              </div>
              <button class="share-action-btn" id="btnCreateLink">
                Créer le lien →
              </button>
            </div>

            <!-- Résultat du lien -->
            <div class="share-link-result" id="shareLinkResult" style="display:none">
              <div class="share-link-label">Ton lien de partage :</div>
              <div class="share-link-box">
                <input type="text" id="shareLinkInput" readonly>
                <button id="btnCopyLink" title="Copier">⎘</button>
              </div>
              <div class="share-link-meta" id="shareLinkMeta"></div>
            </div>

            <!-- Liens existants -->
            <div id="existingLinks"></div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="share-footer">
          <button class="share-btn-close" id="shareBtnClose">Fermer</button>
        </div>

      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// EVENTS
// ─────────────────────────────────────────────

function bindShareEvents(overlay, sessions, userProfile) {
  overlay.querySelector('#shareClose').addEventListener('click', removeSharePanel);
  overlay.querySelector('#shareBtnClose').addEventListener('click', removeSharePanel);
  overlay.querySelector('#shareOvInner').addEventListener('click', (e) => {
    if (e.target.id === 'shareOvInner') removeSharePanel();
  });

  // PDF
  overlay.querySelector('#btnExportPDF').addEventListener('click', async () => {
    await handlePDFExport(overlay, sessions, userProfile);
  });

  // Lien public
  overlay.querySelector('#btnCreateLink').addEventListener('click', async () => {
    await handleCreateLink(overlay, sessions, userProfile);
  });

  // Copier le lien
  overlay.querySelector('#btnCopyLink').addEventListener('click', () => {
    const input = overlay.querySelector('#shareLinkInput');
    navigator.clipboard.writeText(input.value).then(() => {
      showToast('⎘ Lien copié');
    });
  });
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handlePDFExport(overlay, sessions, userProfile) {
  const btn = overlay.querySelector('#btnExportPDF');
  const progressEl = overlay.querySelector('#pdfProgress');
  const progressFill = overlay.querySelector('#pdfProgressFill');
  const progressText = overlay.querySelector('#pdfProgressText');
  const projectName = overlay.querySelector('#shareProjectName').value.trim() || 'Mon Projet QA';
  const authorName = overlay.querySelector('#shareAuthorName').value.trim() || (userProfile.displayName || 'QA Engineer');

  btn.disabled = true;
  btn.textContent = 'Génération...';
  progressEl.style.display = 'block';

  const STEP_LABELS = [
    'Page de couverture...',
    'Executive Summary...',
    'Couverture par priorité...',
    'Distribution features...',
    'Sections à risque...',
    'Évolution temporelle...',
    'Finalisation...',
  ];

  const onProgress = (step, total) => {
    const pct = Math.round((step / total) * 100);
    progressFill.style.width = pct + '%';
    progressText.textContent = STEP_LABELS[step - 1] || `Étape ${step}/${total}`;
  };

  try {
    const result = await generateQAReport(sessions, { projectName, authorName }, onProgress);

    progressFill.style.width = '100%';
    progressText.textContent = `✓ ${result.filename}`;

    btn.textContent = '✓ PDF téléchargé';
    showToast('📄 Rapport PDF téléchargé');
  } catch (err) {
    progressText.textContent = '✗ Erreur : ' + err.message;
    btn.disabled = false;
    btn.textContent = 'Générer PDF ↓';
    showToast('❌ Erreur lors de la génération PDF');
    console.error('[PDF]', err);
  }
}

async function handleCreateLink(overlay, sessions, userProfile) {
  const user = getCurrentUser();
  if (!user) {
    showToast('⚠ Connexion requise pour créer un lien de partage');
    return;
  }

  const btn = overlay.querySelector('#btnCreateLink');
  const resultEl = overlay.querySelector('#shareLinkResult');
  const projectName = overlay.querySelector('#shareProjectName').value.trim() || 'Mon Projet QA';
  const authorName = overlay.querySelector('#shareAuthorName').value.trim() || (userProfile.displayName || 'QA Engineer');

  btn.disabled = true;
  btn.textContent = 'Création...';

  const result = await createPublicShare(user.uid, sessions, { projectName, authorName });

  btn.disabled = false;
  btn.textContent = 'Créer le lien →';

  if (!result.success) {
    showToast('❌ ' + result.error);
    return;
  }

  // Sauvegarde locale des métadonnées
  saveShareMetadata(user.uid, result.shareId, result.shareUrl, projectName);

  // Affiche le lien
  resultEl.style.display = 'block';
  overlay.querySelector('#shareLinkInput').value = result.shareUrl;

  const meta = overlay.querySelector('#shareLinkMeta');
  meta.textContent = `Valide 30 jours · ID: ${result.shareId} · Accessible sans compte`;

  // Recharge la liste des liens
  await loadUserLinks(overlay, user.uid);

  showToast('🔗 Lien de partage créé');
}

// ─────────────────────────────────────────────
// LIENS EXISTANTS
// ─────────────────────────────────────────────

async function loadUserLinks(overlay, uid) {
  if (!uid) return;
  const container = overlay.querySelector('#existingLinks');
  if (!container) return;

  const links = await getUserSharedLinks(uid);
  if (links.length === 0) return;

  const now = Date.now();
  const items = links.map(link => {
    const expired = new Date(link.expiresAt).getTime() < now;
    const expDate = new Date(link.expiresAt).toLocaleDateString('fr-FR');
    const tag = expired ? '⏱ Expiré' : `Expire le ${expDate}`;
    const tagStyle = expired ? 'color:var(--danger)' : 'color:var(--text-muted)';

    return `
      <div class="share-existing-link ${expired ? 'share-link-expired' : ''}">
        <div class="share-existing-info">
          <div class="share-existing-name">${escapeHtml(link.projectName)}</div>
          <div class="share-existing-meta" style="${tagStyle}">${tag}</div>
        </div>
        <button class="share-existing-copy" data-url="${escapeHtml(link.shareUrl)}"
                ${expired ? 'disabled' : ''} title="Copier le lien">
          ⎘
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="share-existing-title">Liens précédents</div>
    <div class="share-existing-list">${items}</div>
  `;

  container.querySelectorAll('.share-existing-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.url).then(() => showToast('⎘ Lien copié'));
    });
  });
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
