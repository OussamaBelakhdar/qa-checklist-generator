/**
 * pdf-report.js — Générateur de Rapport PDF QA
 * ─────────────────────────────────────────────
 * Produit un rapport PDF professionnel à partir des métriques.
 * Utilise jsPDF (CDN) + jsPDF-AutoTable pour les tableaux.
 *
 * STRUCTURE DU RAPPORT :
 *   Page 1 : Couverture — titre, date, score maturité
 *   Page 2 : Executive Summary — 4 KPIs + recommandation
 *   Page 3 : Couverture par priorité — tableau + barres
 *   Page 4 : Distribution features — tableau
 *   Page 5 : Sections à risque — tableau coloré
 *   Page 6 : Évolution temporelle — données brutes
 *   Dernière : Footer avec métadonnées
 *
 * DÉPENDANCES CDN :
 *   https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js
 *   https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js
 */

import {
  computeGlobalCoverage,
  computeCoverageByPriority,
  computeFeatureDistribution,
  computeTimeEvolution,
  computeRiskySections,
  computeMaturityScore,
  computeQuickStats,
} from './metrics.js';

// ─────────────────────────────────────────────
// COULEURS — palette sombre convertie en RGB pour jsPDF
// ─────────────────────────────────────────────

const C = {
  bg: [10, 10, 15],
  surface: [16, 16, 26],
  surface2: [20, 20, 32],
  border: [40, 40, 60],
  text: [232, 234, 237],
  muted: [120, 125, 140],
  accent: [0, 229, 255],
  accent2: [124, 58, 237],
  critical: [239, 68, 68],
  high: [245, 158, 11],
  medium: [6, 182, 212],
  low: [16, 185, 129],
  success: [16, 185, 129],
  white: [255, 255, 255],
};

const FEATURE_LABELS = {
  login: 'Login', form: 'Formulaires', api: 'API',
  payment: 'Paiement', upload: 'Upload', dashboard: 'Dashboard',
  crud: 'CRUD', search: 'Recherche', notification: 'Notifications',
  accessibility: 'Accessibilité', unknown: 'Autre',
};

// ─────────────────────────────────────────────
// POINT D'ENTRÉE
// ─────────────────────────────────────────────

/**
 * Génère et télécharge le rapport PDF.
 * @param {Array}  sessions     - sessions normalisées
 * @param {Object} options      - { authorName, projectName }
 * @param {Function} onProgress - callback(step, total)
 */
export async function generateQAReport(sessions, options = {}, onProgress = null) {
  await waitForJsPDF();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Pré-calcul de toutes les métriques
  const metrics = {
    global: computeGlobalCoverage(sessions),
    byPrio: computeCoverageByPriority(sessions),
    distrib: computeFeatureDistribution(sessions),
    timeline: computeTimeEvolution(sessions),
    risky: computeRiskySections(sessions),
    maturity: computeMaturityScore(sessions),
    quick: computeQuickStats(sessions),
  };

  const meta = {
    authorName: options.authorName || 'QA Engineer',
    projectName: options.projectName || 'Projet QA',
    date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
    sessionCount: sessions.length,
  };

  const totalSteps = 7;

  // ─── Page 1 : Couverture ───
  progress(onProgress, 1, totalSteps);
  buildCoverPage(doc, meta, metrics.maturity);

  // ─── Page 2 : Executive Summary ───
  progress(onProgress, 2, totalSteps);
  doc.addPage();
  buildExecutiveSummary(doc, meta, metrics);

  // ─── Page 3 : Couverture par priorité ───
  progress(onProgress, 3, totalSteps);
  doc.addPage();
  buildPriorityPage(doc, metrics.byPrio, metrics.global);

  // ─── Page 4 : Distribution features ───
  progress(onProgress, 4, totalSteps);
  doc.addPage();
  buildFeaturesPage(doc, metrics.distrib);

  // ─── Page 5 : Sections à risque ───
  progress(onProgress, 5, totalSteps);
  doc.addPage();
  buildRiskyPage(doc, metrics.risky);

  // ─── Page 6 : Évolution ───
  progress(onProgress, 6, totalSteps);
  doc.addPage();
  buildTimelinePage(doc, metrics.timeline);

  // ─── Numérotation des pages ───
  progress(onProgress, 7, totalSteps);
  addPageNumbers(doc, meta);

  // ─── Téléchargement ───
  const filename = `QA-Report_${meta.projectName.replace(/\s+/g, '-')}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);

  return { success: true, filename };
}

// ─────────────────────────────────────────────
// PAGE 1 — COUVERTURE
// ─────────────────────────────────────────────

function buildCoverPage(doc, meta, maturity) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Fond sombre
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, 'F');

  // Bande accent gauche
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 4, H, 'F');

  // Badge "QA REPORT"
  doc.setFillColor(...C.surface2);
  doc.roundedRect(20, 20, 55, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...C.accent);
  doc.text('QA REPORT · v8.0', 47, 26.5, { align: 'center' });

  // Titre principal
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.white);
  doc.text('QA Metrics', 20, 70);

  doc.setFontSize(32);
  doc.setTextColor(...C.accent);
  doc.text('Report', 20, 85);

  // Ligne séparatrice
  doc.setDrawColor(...C.accent);
  doc.setLineWidth(0.5);
  doc.line(20, 92, W - 20, 92);

  // Infos projet
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  doc.text(meta.projectName, 20, 105);

  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text(`Généré par : ${meta.authorName}`, 20, 115);
  doc.text(`Date : ${meta.date}`, 20, 122);
  doc.text(`Sessions analysées : ${meta.sessionCount}`, 20, 129);

  // Score maturité — grand affichage centré
  const label = maturity.label || { level: '—', icon: '', color: '#888' };
  const scoreColor = hexToRgb(label.color) || C.accent;

  doc.setFillColor(...C.surface);
  doc.roundedRect(20, 155, W - 40, 60, 4, 4, 'F');
  doc.setDrawColor(...scoreColor);
  doc.setLineWidth(0.8);
  doc.roundedRect(20, 155, W - 40, 60, 4, 4, 'S');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text('SCORE DE MATURITÉ QA', W / 2, 167, { align: 'center' });

  doc.setFontSize(52);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(String(maturity.score), W / 2, 195, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...C.muted);
  doc.text('/ 100', W / 2 + 16, 195);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...scoreColor);
  doc.text(label.level, W / 2, 208, { align: 'center' });

  // Footer page 1
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('automationdatacamp.com · QA Checklist Generator', W / 2, H - 10, { align: 'center' });
}

// ─────────────────────────────────────────────
// PAGE 2 — EXECUTIVE SUMMARY
// ─────────────────────────────────────────────

function buildExecutiveSummary(doc, meta, metrics) {
  const W = doc.internal.pageSize.getWidth();
  applyPageTemplate(doc, 'Executive Summary', 2);

  let y = 45;

  // 4 KPI cards en grille 2x2
  const cards = [
    { label: 'Couverture globale', value: metrics.global.percent + '%', color: coverageColor(metrics.global.percent) },
    { label: 'Sessions analysées', value: String(metrics.quick.totalSessions), color: C.accent },
    { label: 'Items testés', value: String(metrics.quick.totalItemsTested), color: C.medium },
    { label: 'Critiques non couverts', value: String(metrics.quick.criticalUncovered), color: metrics.quick.criticalUncovered === 0 ? C.low : C.critical },
  ];

  const cardW = (W - 40 - 8) / 2;
  const cardH = 30;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 20 + col * (cardW + 8);
    const cy = y + row * (cardH + 8);

    doc.setFillColor(...C.surface);
    doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'F');
    doc.setFillColor(...card.color);
    doc.rect(x, cy, 3, cardH, 'F');

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...card.color);
    doc.text(card.value, x + 10, cy + 13);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(card.label.toUpperCase(), x + 10, cy + 22);
  });

  y += 2 * (cardH + 8) + 14;

  // Maturité breakdown
  sectionTitle(doc, 'Score de Maturité — Détail', y);
  y += 10;

  if (metrics.maturity.breakdown) {
    Object.values(metrics.maturity.breakdown).forEach(dim => {
      const pct = Math.round((dim.score / dim.max) * 100);
      const color = pct >= 80 ? C.low : pct >= 50 ? C.medium : C.critical;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.text);
      doc.text(dim.label, 20, y + 4);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...color);
      doc.text(`${dim.score}/${dim.max}`, W - 20, y + 4, { align: 'right' });

      // Barre de progression
      const barX = 85;
      const barW = W - 85 - 30;
      doc.setFillColor(...C.surface2);
      doc.roundedRect(barX, y, barW, 5, 1, 1, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(barX, y, barW * pct / 100, 5, 1, 1, 'F');

      y += 12;
    });
  }

  y += 6;

  // Recommandation
  sectionTitle(doc, 'Recommandation', y);
  y += 8;

  const tip = getMaturityTip(metrics.maturity.score);
  doc.setFillColor(...C.surface);
  doc.roundedRect(20, y, W - 40, 22, 2, 2, 'F');
  doc.setFillColor(...C.accent);
  doc.rect(20, y, 3, 22, 'F');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.text);
  const lines = doc.splitTextToSize(tip, W - 55);
  doc.text(lines, 27, y + 8);
}

// ─────────────────────────────────────────────
// PAGE 3 — COUVERTURE PAR PRIORITÉ
// ─────────────────────────────────────────────

function buildPriorityPage(doc, byPrio, global) {
  const W = doc.internal.pageSize.getWidth();
  applyPageTemplate(doc, 'Couverture par Priorité', 3);

  // Tableau principal
  const priorities = [
    ['🔴 Critical', byPrio.critical],
    ['🟡 High', byPrio.high],
    ['🔵 Medium', byPrio.medium],
    ['🟢 Low', byPrio.low],
  ];

  const tableData = priorities.map(([label, p]) => [
    label,
    String(p.total),
    String(p.checked),
    String(p.unchecked),
    p.percent + '%',
    progressBar(p.percent),
  ]);

  // Ligne total
  tableData.push([
    'TOTAL',
    String(global.total),
    String(global.checked),
    String(global.unchecked),
    global.percent + '%',
    progressBar(global.percent),
  ]);

  doc.autoTable({
    startY: 45,
    head: [['Priorité', 'Total', 'Couverts', 'Non couverts', 'Couverture', 'Progression']],
    body: tableData,
    theme: 'plain',
    headStyles: {
      fillColor: C.surface2,
      textColor: C.muted,
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: 4,
    },
    bodyStyles: {
      fillColor: C.surface,
      textColor: C.text,
      fontSize: 9,
      cellPadding: 4,
    },
    alternateRowStyles: { fillColor: [14, 14, 22] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 35 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'center', cellWidth: 20, textColor: C.low },
      3: { halign: 'center', cellWidth: 26, textColor: C.critical },
      4: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
      5: { cellWidth: 50 },
    },
    didDrawCell: (data) => {
      // Colorie la cellule % selon la valeur
      if (data.column.index === 4 && data.section === 'body') {
        const val = parseInt(data.cell.text[0]);
        data.cell.styles.textColor = coverageColor(val);
      }
    },
    tableLineColor: C.border,
    tableLineWidth: 0.1,
  });
}

// ─────────────────────────────────────────────
// PAGE 4 — DISTRIBUTION FEATURES
// ─────────────────────────────────────────────

function buildFeaturesPage(doc, distribution) {
  applyPageTemplate(doc, 'Distribution des Features', 4);

  const tableData = distribution.map((d, i) => [
    String(i + 1),
    FEATURE_LABELS[d.type] || d.type,
    String(d.count),
    String(d.totalItems),
    String(d.checkedItems),
    d.coverage + '%',
  ]);

  doc.autoTable({
    startY: 45,
    head: [['#', 'Feature', 'Sessions', 'Items total', 'Items testés', 'Couverture']],
    body: tableData,
    theme: 'plain',
    headStyles: { fillColor: C.surface2, textColor: C.muted, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    bodyStyles: { fillColor: C.surface, textColor: C.text, fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [14, 14, 22] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center', textColor: C.muted },
      1: { fontStyle: 'bold', cellWidth: 40 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 26, textColor: C.low },
      5: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
    },
    didDrawCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const val = parseInt(data.cell.text[0]);
        data.cell.styles.textColor = coverageColor(val);
      }
    },
    tableLineColor: C.border,
    tableLineWidth: 0.1,
  });
}

// ─────────────────────────────────────────────
// PAGE 5 — SECTIONS À RISQUE
// ─────────────────────────────────────────────

function buildRiskyPage(doc, riskySections) {
  applyPageTemplate(doc, 'Sections à Risque', 5);

  if (riskySections.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('Pas assez de données pour calculer les zones de risque.', 20, 60);
    return;
  }

  const tableData = riskySections.map(s => [
    s.section,
    String(s.total),
    s.coverage + '%',
    String(s.criticalUnchecked),
    String(s.riskScore),
    riskLevel(s.riskScore),
  ]);

  doc.autoTable({
    startY: 45,
    head: [['Section', 'Items', 'Couverture', 'Critiques non couverts', 'Score risque', 'Niveau']],
    body: tableData,
    theme: 'plain',
    headStyles: { fillColor: C.surface2, textColor: C.muted, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    bodyStyles: { fillColor: C.surface, textColor: C.text, fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [14, 14, 22] },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45 },
      1: { halign: 'center', cellWidth: 16 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32, textColor: C.critical },
      4: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: C.high },
      5: { halign: 'center', cellWidth: 22 },
    },
    didDrawCell: (data) => {
      if (data.column.index === 2 && data.section === 'body') {
        const val = parseInt(data.cell.text[0]);
        data.cell.styles.textColor = coverageColor(val);
      }
      if (data.column.index === 5 && data.section === 'body') {
        const val = data.cell.text[0];
        data.cell.styles.textColor =
          val === 'CRITIQUE' ? C.critical :
            val === 'ÉLEVÉ' ? C.high :
              val === 'MODÉRÉ' ? C.medium : C.low;
      }
    },
    tableLineColor: C.border,
    tableLineWidth: 0.1,
  });
}

// ─────────────────────────────────────────────
// PAGE 6 — ÉVOLUTION TEMPORELLE
// ─────────────────────────────────────────────

function buildTimelinePage(doc, timeline) {
  applyPageTemplate(doc, 'Évolution de la Couverture', 6);

  if (timeline.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text('Pas assez de sessions pour afficher une évolution.', 20, 60);
    return;
  }

  const tableData = timeline.map((t, i) => [
    String(i + 1),
    t.date,
    FEATURE_LABELS[t.type] || t.type || '—',
    t.sessionName,
    String(t.checked) + '/' + String(t.total),
    t.percent + '%',
    trend(timeline, i),
  ]);

  doc.autoTable({
    startY: 45,
    head: [['#', 'Date', 'Type', 'Session', 'Items', 'Couverture', 'Tendance']],
    body: tableData,
    theme: 'plain',
    headStyles: { fillColor: C.surface2, textColor: C.muted, fontStyle: 'bold', fontSize: 9, cellPadding: 4 },
    bodyStyles: { fillColor: C.surface, textColor: C.text, fontSize: 9, cellPadding: 4 },
    alternateRowStyles: { fillColor: [14, 14, 22] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', textColor: C.muted },
      1: { cellWidth: 18, fontStyle: 'bold' },
      2: { cellWidth: 26 },
      3: { cellWidth: 50 },
      4: { cellWidth: 18, halign: 'center' },
      5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 14, halign: 'center' },
    },
    didDrawCell: (data) => {
      if (data.column.index === 5 && data.section === 'body') {
        const val = parseInt(data.cell.text[0]);
        data.cell.styles.textColor = coverageColor(val);
      }
      if (data.column.index === 6 && data.section === 'body') {
        const val = data.cell.text[0];
        data.cell.styles.textColor = val === '▲' ? C.low : val === '▼' ? C.critical : C.muted;
      }
    },
    tableLineColor: C.border,
    tableLineWidth: 0.1,
  });
}

// ─────────────────────────────────────────────
// TEMPLATE DE PAGE
// ─────────────────────────────────────────────

function applyPageTemplate(doc, title, pageNum) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Fond
  doc.setFillColor(...C.bg);
  doc.rect(0, 0, W, H, 'F');

  // Bande accent gauche
  doc.setFillColor(...C.accent);
  doc.rect(0, 0, 2, H, 'F');

  // En-tête
  doc.setFillColor(...C.surface);
  doc.rect(0, 0, W, 32, 'F');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.accent);
  doc.text(title, 12, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.muted);
  doc.text('QA Metrics Report · automationdatacamp.com', W - 12, 15, { align: 'right' });

  // Ligne séparatrice sous le header
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.3);
  doc.line(0, 32, W, 32);
}

function addPageNumbers(doc, meta) {
  const total = doc.internal.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.muted);
    doc.text(`${meta.projectName} · ${meta.date}`, 12, H - 6);
    doc.text(`Page ${i} / ${total}`, W - 12, H - 6, { align: 'right' });
  }
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function sectionTitle(doc, title, y) {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.muted);
  doc.text(title.toUpperCase(), 20, y);
  doc.setDrawColor(...C.border);
  doc.setLineWidth(0.2);
  doc.line(20, y + 2, doc.internal.pageSize.getWidth() - 20, y + 2);
}

function coverageColor(pct) {
  if (pct >= 80) return C.low;
  if (pct >= 50) return C.medium;
  if (pct >= 30) return C.high;
  return C.critical;
}

function riskLevel(score) {
  if (score > 80) return 'CRITIQUE';
  if (score > 50) return 'ÉLEVÉ';
  if (score > 25) return 'MODÉRÉ';
  return 'FAIBLE';
}

function trend(timeline, index) {
  if (index === 0) return '—';
  const prev = timeline[index - 1].percent;
  const curr = timeline[index].percent;
  if (curr > prev) return '▲';
  if (curr < prev) return '▼';
  return '—';
}

function progressBar(percent) {
  // Représentation ASCII de la barre dans le PDF
  const filled = Math.round(percent / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled) + ` ${percent}%`;
}

function getMaturityTip(score) {
  if (score >= 85) return 'Excellent niveau. Maintiens la régularité et partage tes pratiques avec l\'équipe.';
  if (score >= 70) return 'Bon niveau. Améliore la couverture des sections critiques pour progresser vers Expert.';
  if (score >= 50) return 'Niveau intermédiaire. Augmente la variété des features testées et la régularité des sessions.';
  if (score >= 30) return 'Niveau débutant. Priorise la couverture des items critical et high en premier lieu.';
  return 'Niveau initial. Commence par générer et compléter des checklists pour toutes tes features principales.';
}

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return null;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

async function waitForJsPDF(attempts = 0) {
  if (window.jspdf?.jsPDF) return;
  if (attempts > 50) throw new Error('jsPDF non chargé après 5 secondes.');
  await new Promise(r => setTimeout(r, 100));
  return waitForJsPDF(attempts + 1);
}

function progress(cb, step, total) {
  if (cb) cb(step, total);
}
