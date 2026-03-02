/**
 * ai-panel.js — Interface IA complète
 * ─────────────────────────────────────
 * Gère 3 interfaces IA :
 *   1. Panneau Génération (modal) — textrea + Gemini
 *   2. Panneau Suggestions (sidebar) — Claude suggestions
 *   3. Widget Risques (inline) — badge + score + insights
 *
 * Exports :
 *   - openGeneratorPanel(featureType, featureName, onItemsAdded)
 *   - showSuggestionsPanel(checklist, featureType, featureName, onSuggestionAdded)
 *   - renderRiskWidget(container, analysisResult)
 *   - closeAllAIPanels()
 */

// ─────────────────────────────────────────────
// 1. PANNEAU GÉNÉRATION (Modal Overlay)
// ─────────────────────────────────────────────

/**
 * Ouvre le panneau de génération IA.
 * @param {string} featureType - Type de feature sélectionné
 * @param {string} featureName - Nom de la feature
 * @param {function} onItemsAdded - Callback(items[]) quand l'utilisateur ajoute les scénarios
 */
export function openGeneratorPanel(featureType, featureName, onItemsAdded) {
    // Supprimer un panneau existant
    closePanel('aiGeneratorPanel');

    const overlay = document.createElement('div');
    overlay.id = 'aiGeneratorPanel';
    overlay.className = 'ai-overlay';
    overlay.innerHTML = `
    <div class="ai-modal">
      <div class="ai-modal-header">
        <div class="ai-modal-title">
          <span class="ai-icon">✨</span>
          Générer des scénarios avec IA
        </div>
        <button id="btnCloseAIGenerator" class="ai-modal-close" aria-label="Fermer">✕</button>
      </div>

      <div class="ai-modal-body">
        <div class="ai-field">
          <label for="aiFeatureDescription">Décris la feature à tester</label>
          <textarea
            id="aiFeatureDescription"
            class="ai-textarea"
            rows="4"
            placeholder="Ex: Page de login avec email/password, Google OAuth, et rate limiting après 5 tentatives échouées..."
            data-testid="ai-feature-description"
          ></textarea>
        </div>

        <div class="ai-field">
          <label for="aiContext">Contexte technique (optionnel)</label>
          <input
            type="text"
            id="aiContext"
            class="ai-input"
            placeholder="Ex: React + Node.js, API REST, PostgreSQL..."
          />
        </div>

        <div class="ai-info-row">
          <span class="ai-badge-type">📋 ${escapeHtml(featureType)}</span>
          ${featureName ? `<span class="ai-badge-name">${escapeHtml(featureName)}</span>` : ''}
        </div>

        <div id="aiGeneratorError" class="ai-error" style="display:none"></div>

        <button id="btnRunAIGenerate" class="btn btn-ai-action" data-testid="btn-run-ai-generate">
          ⚡ Générer les scénarios
        </button>

        <div id="aiGeneratorLoading" class="ai-loading" style="display:none">
          <div class="ai-spinner"></div>
          <span class="ai-loading-text">Gemini analyse votre description<span class="ai-dots"></span></span>
        </div>

        <div id="aiScenariosResult" style="display:none">
          <div id="aiReasoning" class="ai-reasoning"></div>
          <div class="ai-scenarios-header">
            <span id="aiScenariosCount"></span>
            <button id="btnAddAIScenarios" class="btn btn-ai-add" data-testid="btn-add-ai-scenarios">
              ➕ Ajouter à ma checklist
            </button>
          </div>
          <div id="aiScenariosList" class="ai-scenarios-list"></div>
        </div>
      </div>
    </div>
  `;

    document.body.appendChild(overlay);

    // Stocker les items générés
    let generatedItems = [];

    // Events
    document.getElementById('btnCloseAIGenerator').addEventListener('click', () => {
        closePanel('aiGeneratorPanel');
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePanel('aiGeneratorPanel');
    });

    document.getElementById('btnRunAIGenerate').addEventListener('click', async () => {
        const desc = document.getElementById('aiFeatureDescription').value.trim();
        const context = document.getElementById('aiContext')?.value.trim() || '';
        const errorEl = document.getElementById('aiGeneratorError');
        const loadingEl = document.getElementById('aiGeneratorLoading');
        const resultEl = document.getElementById('aiScenariosResult');
        const btn = document.getElementById('btnRunAIGenerate');

        // Validation
        if (desc.length < 10) {
            errorEl.textContent = '⚠ Description trop courte — minimum 10 caractères';
            errorEl.style.display = 'block';
            return;
        }
        errorEl.style.display = 'none';

        // Loading
        btn.disabled = true;
        btn.textContent = '⏳ Génération en cours...';
        loadingEl.style.display = 'flex';
        resultEl.style.display = 'none';

        try {
            const { generateAIScenarios } = await import('./ai-generator.js');
            const result = await generateAIScenarios(desc, featureType, featureName, { context });

            generatedItems = result.items;

            // Afficher le reasoning
            document.getElementById('aiReasoning').textContent = result.reasoning;

            // Compter les scénarios
            document.getElementById('aiScenariosCount').textContent =
                `${generatedItems.length} scénarios générés`;

            // Afficher les scénarios
            const listEl = document.getElementById('aiScenariosList');
            listEl.innerHTML = generatedItems.map(item => `
        <div class="ai-scenario-item" data-priority="${item.priority}">
          <div class="ai-scenario-priority p-${item.priority}"></div>
          <div class="ai-scenario-content">
            <div class="ai-scenario-label">${escapeHtml(item.text)}</div>
            <div class="ai-scenario-desc">${escapeHtml(item.desc)}</div>
            <span class="badge badge-${item.priority}">${item.priority}</span>
            <span class="badge-ai-generated">⚡ AI</span>
          </div>
        </div>
      `).join('');

            loadingEl.style.display = 'none';
            resultEl.style.display = 'block';
        } catch (err) {
            errorEl.textContent = `❌ ${err.message}`;
            errorEl.style.display = 'block';
            loadingEl.style.display = 'none';
        } finally {
            btn.disabled = false;
            btn.textContent = '⚡ Générer les scénarios';
        }
    });

    document.getElementById('btnAddAIScenarios').addEventListener('click', () => {
        if (generatedItems.length > 0 && onItemsAdded) {
            onItemsAdded(generatedItems);
            closePanel('aiGeneratorPanel');
        }
    });

    // Focus sur le textarea
    setTimeout(() => document.getElementById('aiFeatureDescription')?.focus(), 100);
}

// ─────────────────────────────────────────────
// 2. PANNEAU SUGGESTIONS (Sidebar Droite)
// ─────────────────────────────────────────────

/**
 * Affiche le panneau de suggestions Claude.
 * @param {Array} checklist - Checklist actuelle
 * @param {string} featureType - Type de feature
 * @param {string} featureName - Nom
 * @param {function} onSuggestionAdded - Callback(item) quand on ajoute une suggestion
 */
export async function showSuggestionsPanel(checklist, featureType, featureName, onSuggestionAdded) {
    closePanel('aiSuggestPanel');

    const panel = document.createElement('div');
    panel.id = 'aiSuggestPanel';
    panel.className = 'ai-suggest-panel';
    panel.innerHTML = `
    <div class="ai-suggest-header">
      <div class="ai-suggest-title">
        <span class="ai-icon">💡</span> Suggestions Claude
      </div>
      <button id="btnCloseSuggest" class="ai-modal-close" aria-label="Fermer">✕</button>
    </div>
    <div class="ai-suggest-body">
      <div class="ai-loading" id="suggestLoading">
        <div class="ai-spinner"></div>
        <span class="ai-loading-text">Claude analyse votre checklist<span class="ai-dots"></span></span>
      </div>
    </div>
  `;

    document.body.appendChild(panel);

    document.getElementById('btnCloseSuggest').addEventListener('click', () => {
        closePanel('aiSuggestPanel');
    });

    // Trigger requestAnimationFrame pour l'animation
    requestAnimationFrame(() => panel.classList.add('open'));

    try {
        const { getSuggestions } = await import('./ai-suggester.js');
        const result = await getSuggestions(checklist, featureType, featureName, { force: true });

        const body = panel.querySelector('.ai-suggest-body');
        body.innerHTML = `
      <div class="suggestion-explanation">${escapeHtml(result.explanation)}</div>
      <div class="ai-suggest-list">
        ${result.suggestions.map((s, i) => `
          <div class="suggestion-item" data-index="${i}">
            <div class="suggestion-header">
              <span class="priority-dot p-${s.priority}"></span>
              <span class="suggestion-label">${escapeHtml(s.text)}</span>
              <span class="badge badge-${s.priority}">${s.priority}</span>
            </div>
            <div class="suggestion-rationale">${escapeHtml(s.rationale || s.desc || '')}</div>
            <button class="btn-add-suggestion" data-index="${i}">
              ➕ Ajouter
            </button>
          </div>
        `).join('')}
      </div>
    `;

        // Bind individual add buttons
        body.querySelectorAll('.btn-add-suggestion').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.index, 10);
                const item = result.suggestions[idx];
                if (item && onSuggestionAdded) {
                    onSuggestionAdded(item);
                    btn.textContent = '✓ Ajouté';
                    btn.disabled = true;
                    btn.classList.add('added');
                }
            });
        });
    } catch (err) {
        const body = panel.querySelector('.ai-suggest-body');
        body.innerHTML = `<div class="ai-error" style="display:block">⚠ ${escapeHtml(err.message)}</div>`;
    }
}

// ─────────────────────────────────────────────
// 3. WIDGET RISQUES (Inline)
// ─────────────────────────────────────────────

/**
 * Rend le widget d'analyse des risques dans un container.
 * @param {HTMLElement} container - Élément DOM cible
 * @param {object} analysis - Résultat de analyzeCurrentRisks()
 */
export function renderRiskWidget(container, analysis) {
    if (!container || !analysis) return;

    const levelColors = {
        critical: 'var(--danger)',
        high: '#f59e0b',
        medium: 'var(--accent)',
        low: 'var(--success)',
    };

    const levelLabels = {
        critical: '🔴 CRITIQUE',
        high: '🟠 ÉLEVÉ',
        medium: '🟡 MODÉRÉ',
        low: '🟢 FAIBLE',
    };

    container.innerHTML = `
    <div class="risk-widget" data-level="${analysis.riskLevel}">
      <div class="risk-header">
        <div class="risk-badge" data-level="${analysis.riskLevel}" style="color:${levelColors[analysis.riskLevel] || levelColors.medium}">
          ${levelLabels[analysis.riskLevel] || analysis.riskLevel}
        </div>
        <div class="risk-score">${analysis.riskScore}<span class="risk-score-label">/100</span></div>
      </div>

      <div class="risk-summary">${escapeHtml(analysis.summary)}</div>

      ${analysis.insights?.length ? `
        <div class="risk-section">
          <div class="risk-section-title">💡 Insights</div>
          ${analysis.insights.map(i => `
            <div class="risk-insight">• ${escapeHtml(i)}</div>
          `).join('')}
        </div>
      ` : ''}

      ${analysis.recommendations?.length ? `
        <div class="risk-section">
          <div class="risk-section-title">📋 Recommandations</div>
          ${analysis.recommendations.map(r => `
            <div class="risk-recommendation">
              <span class="risk-rec-priority ${r.priority}">${r.priority === 'immediate' ? '🔥' : r.priority === 'short_term' ? '⏰' : '💡'}</span>
              <div>
                <div class="risk-rec-action">${escapeHtml(r.action)}</div>
                <div class="risk-rec-rationale">${escapeHtml(r.rationale)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${analysis.blockers?.length ? `
        <div class="risk-section risk-blockers">
          <div class="risk-section-title">🚫 Blockers</div>
          ${analysis.blockers.map(b => `
            <div class="risk-blocker">⛔ ${escapeHtml(b)}</div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

/**
 * Ferme un panneau IA par son ID.
 * @param {string} panelId
 */
function closePanel(panelId) {
    const el = document.getElementById(panelId);
    if (el) el.remove();
}

/**
 * Ferme tous les panneaux IA ouverts.
 */
export function closeAllAIPanels() {
    closePanel('aiGeneratorPanel');
    closePanel('aiSuggestPanel');
}

/**
 * Échappe HTML (protection XSS).
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
