/**
 * exporters.js — Couche Export
 * ─────────────────────────────────────────────
 * Responsabilité unique : transformer l'état en formats exportables.
 * Markdown, CSV, texte brut — chaque format est une fonction isolée.
 */

// ─────────────────────────────────────────────
// MARKDOWN
// ─────────────────────────────────────────────

/**
 * Génère un fichier Markdown et déclenche son téléchargement.
 */
export function exportMarkdown(state) {
  const md = buildMarkdown(state);
  const filename = `qa-checklist-${state.type}-${Date.now()}.md`;
  downloadFile(md, filename, 'text/markdown');
}

/**
 * Construit la string Markdown depuis l'état.
 */
export function buildMarkdown(state) {
  const { name, type, checklist } = state;
  const date = new Date().toLocaleDateString('fr-FR');
  const stats = computeStats(checklist);

  let md = `# QA Checklist — ${name}\n\n`;
  md += `> **Date :** ${date}  \n`;
  md += `> **Type :** ${type}  \n`;
  md += `> **Progression :** ${stats.checked}/${stats.total} (${stats.percent}%)  \n`;
  md += `> **Généré par :** QA Checklist Generator — AutomationDataCamp\n\n`;
  md += `---\n\n`;

  // Groupe les items par section
  const sections = groupBySection(checklist);

  for (const [section, items] of Object.entries(sections)) {
    md += `## ${section}\n\n`;
    items.forEach(item => {
      const check = item.checked ? 'x' : ' ';
      md += `- [${check}] **[${item.priority.toUpperCase()}]** ${item.text}\n`;
      md += `  > ${item.desc}\n\n`;
    });
  }

  md += `---\n\n`;
  md += `## Résumé\n\n`;
  md += `| Priorité | Total | Cochés |\n`;
  md += `|----------|-------|--------|\n`;
  md += `| 🔴 Critical | ${stats.critical} | ${checklist.filter(i => i.priority === 'critical' && i.checked).length} |\n`;
  md += `| 🟡 High | ${stats.high} | ${checklist.filter(i => i.priority === 'high' && i.checked).length} |\n`;
  md += `| 🔵 Medium | ${stats.medium} | ${checklist.filter(i => i.priority === 'medium' && i.checked).length} |\n`;
  md += `| 🟢 Low | ${stats.low} | ${checklist.filter(i => i.priority === 'low' && i.checked).length} |\n`;
  md += `| **Total** | **${stats.total}** | **${stats.checked}** |\n`;

  return md;
}

// ─────────────────────────────────────────────
// CSV
// ─────────────────────────────────────────────

/**
 * Génère un fichier CSV et déclenche son téléchargement.
 * Compatible Excel, Google Sheets, Jira, TestRail.
 */
export function exportCSV(state) {
  const csv = buildCSV(state);
  const filename = `qa-checklist-${state.type}-${Date.now()}.csv`;
  downloadFile(csv, filename, 'text/csv;charset=utf-8;');
}

export function buildCSV(state) {
  const { name, checklist } = state;
  const date = new Date().toLocaleDateString('fr-FR');

  const headers = ['ID', 'Section', 'Test Case', 'Description', 'Priorité', 'Statut', 'Feature', 'Date'];
  const rows = checklist.map(item => [
    item.id + 1,
    item.section,
    item.text,
    item.desc,
    item.priority.toUpperCase(),
    item.checked ? 'PASS' : 'TODO',
    name,
    date,
  ]);

  const escape = (val) => `"${String(val).replace(/"/g, '""')}"`;

  return [headers, ...rows]
    .map(row => row.map(escape).join(','))
    .join('\n');
}

// ─────────────────────────────────────────────
// CLIPBOARD
// ─────────────────────────────────────────────

/**
 * Copie la checklist dans le presse-papiers en texte brut.
 */
export async function copyToClipboard(state) {
  const text = buildPlainText(state);
  await navigator.clipboard.writeText(text);
}

export function buildPlainText(state) {
  const { name, checklist } = state;
  const sections = groupBySection(checklist);

  let text = `QA Checklist — ${name}\n${'─'.repeat(50)}\n\n`;

  for (const [section, items] of Object.entries(sections)) {
    text += `▸ ${section}\n`;
    items.forEach(item => {
      const check = item.checked ? '☑' : '☐';
      text += `  ${check} [${item.priority.toUpperCase()}] ${item.text}\n`;
    });
    text += '\n';
  }

  text += `\nGénéré par QA Checklist Generator — AutomationDataCamp`;
  return text;
}

// ─────────────────────────────────────────────
// UTILITAIRES INTERNES
// ─────────────────────────────────────────────

function groupBySection(checklist) {
  const sections = {};
  for (const item of checklist) {
    if (!sections[item.section]) sections[item.section] = [];
    sections[item.section].push(item);
  }
  return sections;
}

function computeStats(checklist) {
  const total = checklist.length;
  const checked = checklist.filter(i => i.checked).length;
  return {
    total,
    checked,
    percent: total ? Math.round((checked / total) * 100) : 0,
    critical: checklist.filter(i => i.priority === 'critical').length,
    high: checklist.filter(i => i.priority === 'high').length,
    medium: checklist.filter(i => i.priority === 'medium').length,
    low: checklist.filter(i => i.priority === 'low').length,
  };
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
