/**
 * dashboard.js — Interface du Tableau de Bord QA Metrics
 * ─────────────────────────────────────────────
 * Construit et anime le dashboard complet.
 * Utilise Chart.js (CDN) pour les graphiques.
 *
 * LAYOUT :
 *   ┌─────────────────────────────────────────┐
 *   │ HEADER — Titre + score maturité + boutons│
 *   ├──────┬──────┬──────┬───────────────────┤
 *   │ Card │ Card │ Card │ Card              │  ← Quick stats
 *   ├──────┴──────┴──────┴───────────────────┤
 *   │ Couverture par priorité (Bar)           │
 *   ├──────────────────┬──────────────────────┤
 *   │ Features (Radar) │ Evolution (Line)     │
 *   ├──────────────────┴──────────────────────┤
 *   │ Sections à risque (Heatmap table)       │
 *   ├─────────────────────────────────────────┤
 *   │ Score maturité — Breakdown détaillé     │
 *   └─────────────────────────────────────────┘
 */

import {
  computeQuickStats,
  computeCoverageByPriority,
  computeFeatureDistribution,
  computeTimeEvolution,
  computeRiskySections,
  computeMaturityScore,
} from './metrics.js';

// ─────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────

const COLORS = {
  critical: '#ef4444',
  high: '#f59e0b',
  medium: '#06b6d4',
  low: '#10b981',
  accent: '#00e5ff',
  accent2: '#7c3aed',
  bg: '#0a0a0f',
  surface: '#10101a',
  border: 'rgba(255,255,255,0.08)',
  text: '#e8eaed',
  muted: 'rgba(255,255,255,0.4)',
};

const FEATURE_LABELS = {
  login: 'Login', form: 'Formulaires', api: 'API',
  payment: 'Paiement', upload: 'Upload', dashboard: 'Dashboard',
  crud: 'CRUD', search: 'Recherche', notification: 'Notifications',
  accessibility: 'Accessibilité', unknown: 'Autre',
};

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────

/**
 * Entrée principale : construit tout le dashboard.
 * @param {HTMLElement} container - div#dashboardRoot
 * @param {Array}       sessions  - sessions normalisées
 * @param {boolean}     isDemo    - true si données de démo
 */
export function renderDashboard(container, sessions, isDemo = false) {
  const quick = computeQuickStats(sessions);
  const byPrio = computeCoverageByPriority(sessions);
  const distrib = computeFeatureDistribution(sessions);
  const timeline = computeTimeEvolution(sessions);
  const risky = computeRiskySections(sessions);
  const maturity = computeMaturityScore(sessions);

  container.innerHTML = buildDashboardHTML(quick, maturity, isDemo);

  // Charts asynchrones (Chart.js chargé en CDN)
  waitForChartJS(() => {
    renderPriorityChart(byPrio);
    renderFeatureRadar(distrib);
    renderTimelineChart(timeline);
    renderMaturityBreakdown(maturity);
  });

  renderRiskTable(risky);
  renderQuickStats(quick);
}

// ─────────────────────────────────────────────
// HTML BUILDER
// ─────────────────────────────────────────────

function buildDashboardHTML(quick, maturity, isDemo) {
  const label = maturity.label || { level: '—', icon: '⚪', color: '#888' };

  return `
    <!-- DEMO BANNER -->
    ${isDemo ? `
    <div class="dash-demo-banner">
      ⚡ Mode démonstration — Données générées automatiquement.
      <a href="index.html">Connecte-toi</a> pour voir tes vraies métriques.
    </div>` : ''}

    <!-- HEADER -->
    <div class="dash-header">
      <div>
        <h2 class="dash-title">QA Metrics <span>Dashboard</span></h2>
        <p class="dash-subtitle">${quick.totalSessions} session(s) analysée(s) · Dernière activité : ${quick.lastSessionDate}</p>
      </div>
      <div class="dash-maturity-badge" style="border-color:${label.color}20;background:${label.color}0d">
        <span class="dash-maturity-icon">${label.icon}</span>
        <div>
          <div class="dash-maturity-level" style="color:${label.color}">${label.level}</div>
          <div class="dash-maturity-score">${maturity.score} / 100</div>
        </div>
      </div>
    </div>

    <!-- QUICK STATS -->
    <div class="dash-stats-grid" id="dashQuickStats"></div>

    <!-- CHARTS ROW 1 -->
    <div class="dash-charts-row">
      <div class="dash-chart-card dash-full">
        <div class="dash-card-title">Couverture par Priorité</div>
        <canvas id="chartPriority" height="80"></canvas>
      </div>
    </div>

    <!-- CHARTS ROW 2 -->
    <div class="dash-charts-row">
      <div class="dash-chart-card">
        <div class="dash-card-title">Distribution Features</div>
        <canvas id="chartFeatures" height="220"></canvas>
      </div>
      <div class="dash-chart-card">
        <div class="dash-card-title">Évolution de la Couverture</div>
        <canvas id="chartTimeline" height="220"></canvas>
      </div>
    </div>

    <!-- SECTIONS À RISQUE -->
    <div class="dash-chart-card">
      <div class="dash-card-title">
        Sections à Risque
        <span class="dash-badge-risk">🔴 Priorité haute</span>
      </div>
      <div id="dashRiskTable"></div>
    </div>

    <!-- SCORE MATURITÉ BREAKDOWN -->
    <div class="dash-chart-card">
      <div class="dash-card-title">Score de Maturité QA — Détail</div>
      <div id="dashMaturityBreakdown"></div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// QUICK STATS CARDS
// ─────────────────────────────────────────────

function renderQuickStats(quick) {
  const container = document.getElementById('dashQuickStats');
  if (!container) return;

  const cards = [
    {
      icon: '📊',
      value: quick.totalSessions,
      label: 'Sessions analysées',
      color: COLORS.accent,
    },
    {
      icon: '✅',
      value: quick.globalCoverage + '%',
      label: 'Couverture globale',
      color: quick.globalCoverage >= 70 ? COLORS.low : (quick.globalCoverage >= 40 ? COLORS.high : COLORS.critical),
    },
    {
      icon: '⚠',
      value: quick.criticalUncovered,
      label: 'Critiques non couverts',
      color: quick.criticalUncovered === 0 ? COLORS.low : COLORS.critical,
    },
    {
      icon: '🔬',
      value: quick.totalItemsTested,
      label: 'Items testés (total)',
      color: COLORS.medium,
    },
  ];

  container.innerHTML = cards.map(card => `
    <div class="dash-stat-card">
      <div class="dash-stat-icon">${card.icon}</div>
      <div class="dash-stat-value" style="color:${card.color}">${card.value}</div>
      <div class="dash-stat-label">${card.label}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// CHART — COUVERTURE PAR PRIORITÉ
// ─────────────────────────────────────────────

function renderPriorityChart(byPriority) {
  const canvas = document.getElementById('chartPriority');
  if (!canvas || !window.Chart) return;

  const priorities = ['critical', 'high', 'medium', 'low'];
  const labels = ['🔴 Critical', '🟡 High', '🔵 Medium', '🟢 Low'];
  const covered = priorities.map(p => byPriority[p].checked);
  const uncovered = priorities.map(p => byPriority[p].unchecked);
  const percents = priorities.map(p => byPriority[p].percent);

  new window.Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Couvert',
          data: covered,
          backgroundColor: priorities.map(p => COLORS[p] + 'cc'),
          borderColor: priorities.map(p => COLORS[p]),
          borderWidth: 1,
          borderRadius: 3,
        },
        {
          label: 'Non couvert',
          data: uncovered,
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1,
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { labels: { color: COLORS.muted, font: { family: 'Space Mono', size: 11 } } },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => {
              const idx = ctx.dataIndex;
              return `Couverture : ${percents[idx]}%`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: COLORS.muted, font: { family: 'Space Mono', size: 11 } },
          grid: { color: COLORS.border },
        },
        y: {
          stacked: true,
          ticks: { color: COLORS.muted, font: { family: 'Space Mono', size: 11 } },
          grid: { color: COLORS.border },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// CHART — RADAR FEATURES
// ─────────────────────────────────────────────

function renderFeatureRadar(distribution) {
  const canvas = document.getElementById('chartFeatures');
  if (!canvas || !window.Chart) return;

  const top = distribution.slice(0, 8);
  const labels = top.map(d => FEATURE_LABELS[d.type] || d.type);
  const coverage = top.map(d => d.coverage);

  new window.Chart(canvas, {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Couverture (%)',
        data: coverage,
        backgroundColor: COLORS.accent + '22',
        borderColor: COLORS.accent,
        borderWidth: 2,
        pointBackgroundColor: COLORS.accent,
        pointBorderColor: COLORS.accent,
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            color: COLORS.muted,
            backdropColor: 'transparent',
            font: { family: 'Space Mono', size: 9 },
            stepSize: 25,
          },
          grid: { color: COLORS.border },
          pointLabels: { color: COLORS.text, font: { family: 'Syne', size: 11 } },
          angleLines: { color: COLORS.border },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// CHART — ÉVOLUTION TEMPORELLE
// ─────────────────────────────────────────────

function renderTimelineChart(evolution) {
  const canvas = document.getElementById('chartTimeline');
  if (!canvas || !window.Chart) return;

  const labels = evolution.map(e => e.date);
  const values = evolution.map(e => e.percent);

  new window.Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Couverture (%)',
        data: values,
        borderColor: COLORS.accent2,
        backgroundColor: COLORS.accent2 + '15',
        borderWidth: 2,
        pointBackgroundColor: COLORS.accent2,
        pointRadius: 5,
        fill: true,
        tension: 0.3,
      }],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const idx = items[0].dataIndex;
              return evolution[idx]?.sessionName || items[0].label;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: { color: COLORS.muted, font: { family: 'Space Mono', size: 10 } },
          grid: { color: COLORS.border },
        },
        y: {
          min: 0,
          max: 100,
          ticks: {
            color: COLORS.muted,
            font: { family: 'Space Mono', size: 10 },
            callback: v => v + '%',
          },
          grid: { color: COLORS.border },
        },
      },
    },
  });
}

// ─────────────────────────────────────────────
// TABLE — SECTIONS À RISQUE
// ─────────────────────────────────────────────

function renderRiskTable(riskySections) {
  const container = document.getElementById('dashRiskTable');
  if (!container) return;

  if (riskySections.length === 0) {
    container.innerHTML = `<div class="dash-empty">Pas assez de données pour calculer les zones de risque.</div>`;
    return;
  }

  const maxRisk = Math.max(...riskySections.map(s => s.riskScore));

  const rows = riskySections.map(section => {
    const riskPercent = Math.round((section.riskScore / maxRisk) * 100);
    const riskColor = section.riskScore > 70 ? COLORS.critical :
      section.riskScore > 40 ? COLORS.high : COLORS.medium;
    const coverageColor = section.coverage < 40 ? COLORS.critical :
      section.coverage < 70 ? COLORS.high : COLORS.low;

    return `
      <div class="dash-risk-row">
        <div class="dash-risk-name">${escapeHtml(section.section)}</div>
        <div class="dash-risk-bar-wrap">
          <div class="dash-risk-bar-fill" style="width:${riskPercent}%;background:${riskColor}33;border-right:2px solid ${riskColor}"></div>
        </div>
        <div class="dash-risk-coverage" style="color:${coverageColor}">${section.coverage}%</div>
        <div class="dash-risk-critical">${section.criticalUnchecked > 0 ? `⚠ ${section.criticalUnchecked} critique(s)` : '—'}</div>
        <div class="dash-risk-total">${section.checked}/${section.total}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="dash-risk-header">
      <span>Section</span>
      <span>Niveau de risque</span>
      <span>Couverture</span>
      <span>Alertes</span>
      <span>Items</span>
    </div>
    ${rows}
  `;
}

// ─────────────────────────────────────────────
// MATURITÉ — BREAKDOWN
// ─────────────────────────────────────────────

function renderMaturityBreakdown(maturity) {
  const container = document.getElementById('dashMaturityBreakdown');
  if (!container || !maturity.breakdown) return;

  const breakdown = Object.values(maturity.breakdown);
  const label = maturity.label || { level: '—', icon: '⚪', color: '#888' };

  const bars = breakdown.map(dim => {
    const pct = Math.round((dim.score / dim.max) * 100);
    const color = pct >= 80 ? COLORS.low : pct >= 50 ? COLORS.medium : COLORS.critical;
    return `
      <div class="dash-maturity-row">
        <div class="dash-maturity-dim">${dim.label}</div>
        <div class="dash-maturity-bar-wrap">
          <div class="dash-maturity-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="dash-maturity-pts" style="color:${color}">${dim.score} / ${dim.max}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="dash-maturity-total">
      <span class="dash-maturity-total-icon">${label.icon}</span>
      <span class="dash-maturity-total-score" style="color:${label.color}">${maturity.score}</span>
      <span class="dash-maturity-total-label" style="color:${label.color}">${label.level}</span>
    </div>
    <div class="dash-maturity-dims">${bars}</div>
    <p class="dash-maturity-tip">
      ${getMaturityTip(maturity.score)}
    </p>
  `;
}

function getMaturityTip(score) {
  if (score >= 85) return '🏆 Excellent niveau. Maintiens la régularité et partage tes pratiques avec l\'équipe.';
  if (score >= 70) return '⭐ Bon niveau. Améliore la couverture des sections critiques pour progresser vers Expert.';
  if (score >= 50) return '📈 Niveau intermédiaire. Augmente la variété des features testées et la régularité.';
  if (score >= 30) return '🌱 Niveau débutant. Priorise la couverture des items critical et high en premier.';
  return '🔴 Niveau initial. Commence par générer et compléter des checklists pour toutes tes features principales.';
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Attend que Chart.js soit disponible (chargé en CDN).
 * Retries toutes les 100ms pendant 3 secondes max.
 */
function waitForChartJS(callback, attempts = 0) {
  if (window.Chart) {
    callback();
    return;
  }
  if (attempts > 30) {
    console.warn('[Dashboard] Chart.js non disponible après 3s');
    return;
  }
  setTimeout(() => waitForChartJS(callback, attempts + 1), 100);
}
