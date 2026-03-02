/**
 * test-localhost-3000.mjs
 * Playwright automation against http://localhost:3000/index-v9.html?mock=true
 *
 * Steps:
 *  1. Navigate to URL
 *  2. Wait 3s + screenshot
 *  3. Check console logs
 *  4. Select 2nd option in #featureType
 *  5. Click #btnGenerate
 *  6. Wait 2s + screenshot
 *  7. Scroll to actions bar + screenshot AI buttons
 *  8. Click AI Generate button
 *  9. Wait 1s + screenshot AI panel
 * 10. Final console log check
 */

import { chromium } from 'playwright';
import { join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const TARGET = 'http://localhost:3000/index.html?mock=true';
const ROOT = resolve('c:/Users/oussama/OneDrive - Romanian-American University (STUD)/Desktop/QA Checklist Generator');
const SS_DIR = join(ROOT, 'screenshots');
if (!existsSync(SS_DIR)) mkdirSync(SS_DIR);

// ── Screenshot helper ────────────────────────────────────────────────────────
async function shot(page, name, element) {
  const file = join(SS_DIR, name + '.png');
  if (element) {
    await element.screenshot({ path: file });
  } else {
    await page.screenshot({ path: file, fullPage: false });
  }
  console.log('  [shot] ' + name + '.png');
  return file;
}

// ── Console log collector ────────────────────────────────────────────────────
function attachConsoleCollector(page) {
  const logs = [];
  page.on('console', msg => {
    const entry = { type: msg.type(), text: msg.text() };
    logs.push(entry);
  });
  page.on('pageerror', err => {
    logs.push({ type: 'pageerror', text: err.message });
  });
  return logs;
}

function printLogs(logs, label) {
  if (logs.length === 0) {
    console.log('  (no console output)');
    return;
  }
  const icons = { log: ' ', info: 'i', warn: '!', error: 'X', pageerror: '!!' };
  console.log('  --- Console snapshot [' + label + '] ---');
  logs.forEach(({ type, text }) => {
    const icon = icons[type] || type;
    const line = text.slice(0, 160);
    console.log('  [' + icon + '] ' + line);
  });
  console.log('  --- (' + logs.length + ' entries total) ---');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Activate mock mode before any script fires
  await page.addInitScript(function () { window.__AI_MOCK__ = true; });

  const consoleLogs = attachConsoleCollector(page);

  // ── STEP 1: Navigate ────────────────────────────────────────────────────
  console.log('\n[STEP 1] Navigate to ' + TARGET);
  await page.goto(TARGET, { waitUntil: 'domcontentloaded' });
  console.log('  + Page loaded (domcontentloaded)');

  // ── STEP 2: Wait 3 s + screenshot ───────────────────────────────────────
  console.log('[STEP 2] Wait 3 s...');
  await page.waitForTimeout(3000);
  await shot(page, 'v9_01_initial_load');

  // ── STEP 3: Console logs check ──────────────────────────────────────────
  console.log('[STEP 3] Console logs after load:');
  printLogs([...consoleLogs], 'after-load');
  consoleLogs.length = 0; // reset for next phase

  // ── STEP 4: Bypass auth if needed, then select 2nd option ───────────────
  console.log('[STEP 4] Interact with #featureType...');

  const skipVisible = await page.isVisible('#skipAuth').catch(() => false);
  if (skipVisible) {
    console.log('  + Auth panel detected, clicking "Continuer sans compte"...');
    await page.click('#skipAuth');
    await page.waitForFunction(function () {
      var s = document.getElementById('featureType');
      return s && s.options.length > 1;
    }, { timeout: 8000 });
    console.log('  + Offline mode active');
  }

  // Get all option texts for logging
  const options = await page.$$eval('#featureType option', function (opts) {
    return opts.map(function (o, i) { return i + ': ' + o.value + ' — ' + o.textContent.trim(); });
  });
  console.log('  Available options:');
  options.forEach(function (o) { console.log('    ' + o); });

  // Select index 1 (2nd option = first real feature type after placeholder)
  const secondValue = await page.$eval('#featureType option:nth-child(2)', function (o) { return o.value; });
  await page.selectOption('#featureType', secondValue);
  const chosen = await page.$eval('#featureType option:checked', function (o) { return o.textContent.trim(); });
  console.log('  + Selected: "' + chosen + '" (value="' + secondValue + '")');

  // ── STEP 5: Click #btnGenerate ───────────────────────────────────────────
  console.log('[STEP 5] Click #btnGenerate...');
  await page.click('#btnGenerate');
  await page.waitForSelector('.item', { timeout: 6000 });
  const itemCount = await page.$$eval('.item', function (els) { return els.length; });
  console.log('  + ' + itemCount + ' items generated');

  // ── STEP 6: Wait 2 s + screenshot ───────────────────────────────────────
  console.log('[STEP 6] Wait 2 s + screenshot checklist...');
  await page.waitForTimeout(2000);
  await shot(page, 'v9_02_checklist_generated');

  // ── STEP 7: Scroll to actions bar + screenshot AI buttons ───────────────
  console.log('[STEP 7] Scroll to actions bar + screenshot AI buttons...');
  await page.waitForSelector('#actionsBar', { state: 'visible', timeout: 5000 });
  await page.evaluate(function () {
    document.getElementById('actionsBar').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(300);

  // Verify each AI button
  var aiDefs = [
    ['btn-ai-generate', '✨ Generer avec IA'],
    ['btn-ai-suggest', '💡 Suggestions'],
    ['btn-ai-risk', '🎯 Analyser risques'],
  ];
  for (var i = 0; i < aiDefs.length; i++) {
    var testId = aiDefs[i][0];
    var label = aiDefs[i][1];
    var vis = await page.isVisible('[data-testid="' + testId + '"]');
    console.log('  ' + (vis ? '✓' : '✗') + ' ' + label + ': ' + (vis ? 'VISIBLE' : 'NOT VISIBLE'));
  }

  // Crop just the actions bar
  const actionsEl = await page.$('#actionsBar');
  if (actionsEl) await actionsEl.screenshot({ path: join(SS_DIR, 'v9_03_actions_bar.png') });
  console.log('  [shot] v9_03_actions_bar.png');

  // Also full-page context shot
  await shot(page, 'v9_03b_actions_bar_context');

  // ── STEP 8: Click AI Generate button ────────────────────────────────────
  console.log('[STEP 8] Click AI Generate button...');
  await page.click('[data-testid="btn-ai-generate"]');
  console.log('  + Button clicked');

  // ── STEP 9: Wait 1 s + screenshot AI panel ──────────────────────────────
  console.log('[STEP 9] Wait 1 s + screenshot AI panel...');
  await page.waitForTimeout(1000);

  const panelVisible = await page.isVisible('#aiGeneratorPanel');
  console.log('  #aiGeneratorPanel visible: ' + panelVisible);

  if (panelVisible) {
    await shot(page, 'v9_04_ai_generator_panel');
    // Also screenshot the panel element alone
    const panelEl = await page.$('#aiGeneratorPanel');
    if (panelEl) {
      await panelEl.screenshot({ path: join(SS_DIR, 'v9_04b_ai_panel_crop.png') });
      console.log('  [shot] v9_04b_ai_panel_crop.png');
    }
  } else {
    await shot(page, 'v9_04_ai_generator_panel_FAIL');
    console.warn('  ! Panel did not open');
  }

  // ── STEP 10: Final console log check ────────────────────────────────────
  console.log('[STEP 10] Final console log check:');
  printLogs([...consoleLogs], 'post-interaction');

  // Summary
  const errors = consoleLogs.filter(function (l) { return l.type === 'error' || l.type === 'pageerror'; });
  const warns = consoleLogs.filter(function (l) { return l.type === 'warn'; });
  console.log('\n========= SUMMARY =========');
  console.log('  Errors:   ' + errors.length);
  console.log('  Warnings: ' + warns.length);
  console.log('  Screenshots saved to: ' + SS_DIR);
  console.log('  Files:');
  ['v9_01_initial_load', 'v9_02_checklist_generated', 'v9_03_actions_bar',
    'v9_03b_actions_bar_context', 'v9_04_ai_generator_panel', 'v9_04b_ai_panel_crop'].forEach(function (n) {
      console.log('    - ' + n + '.png');
    });

  await browser.close();
}

run().catch(function (err) {
  console.error('\n[FATAL] ' + (err.message || err));
  process.exit(1);
});
