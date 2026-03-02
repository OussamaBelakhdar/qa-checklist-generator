/**
 * test-ui-screenshots.mjs  — Playwright UI automation
 * Steps: skip auth → select Login → generate → screenshots
 * Run from: /tmp/pw-test/   (node test-ui-screenshots.mjs)
 */

import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join, resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';

const ROOT = resolve('c:/Users/oussama/OneDrive - Romanian-American University (STUD)/Desktop/QA Checklist Generator');
const SCREENSHOTS_DIR = join(ROOT, 'screenshots');
if (!existsSync(SCREENSHOTS_DIR)) mkdirSync(SCREENSHOTS_DIR);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

function startServer(port) {
  return new Promise((res) => {
    const server = createServer(async (req, rsp) => {
      let path = req.url.split('?')[0];
      if (path === '/' || path === '') path = '/index.html';
      const filePath = join(ROOT, path);
      try {
        const data = await readFile(filePath);
        const mime = MIME[extname(filePath)] || 'text/plain';
        rsp.writeHead(200, { 'Content-Type': mime });
        rsp.end(data);
      } catch {
        rsp.writeHead(404);
        rsp.end('Not found: ' + path);
      }
    });
    server.listen(port, () => {
      console.log('[server] http://localhost:' + port);
      res({ server, url: 'http://localhost:' + port });
    });
  });
}

async function shot(page, name) {
  const file = join(SCREENSHOTS_DIR, name + '.png');
  await page.screenshot({ path: file, fullPage: false });
  console.log('  + Saved: screenshots/' + name + '.png');
  return file;
}

async function run() {
  const { server, url } = await startServer(3979);
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.warn('  [page:error] ' + msg.text().slice(0, 120));
  });

  // Mock mode active before any script runs
  await page.addInitScript(() => { window.__AI_MOCK__ = true; });

  // ── STEP 1: Load app ──────────────────────────────────────────────────────
  console.log('\n[STEP 1] Load app...');
  await page.goto(url + '/?mock=true', { waitUntil: 'domcontentloaded' });

  // ── STEP 2: Bypass auth ───────────────────────────────────────────────────
  console.log('[STEP 2] Bypass auth (Continuer sans compte)...');
  await page.waitForSelector('#skipAuth', { timeout: 10000 });
  await page.click('#skipAuth');
  console.log('  + Auth skipped');

  // Wait for select to be populated
  await page.waitForFunction(function() {
    var sel = document.getElementById('featureType');
    return sel && sel.options.length > 1;
  }, { timeout: 10000 });
  const optCount = await page.$eval('#featureType', function(s) { return s.options.length; });
  console.log('  + Select populated with ' + optCount + ' options');

  // ── STEP 3: Select "Login / Authentification" ─────────────────────────────
  console.log('[STEP 3] Select Login/Authentification...');
  await page.selectOption('#featureType', 'login');
  const chosen = await page.$eval('#featureType option:checked', function(el) { return el.textContent.trim(); });
  console.log('  + Selected: ' + chosen);

  // ── STEP 4: Click "Générer" ───────────────────────────────────────────────
  console.log('[STEP 4] Click Generer...');
  await page.click('#btnGenerate');
  await page.waitForSelector('.item', { timeout: 5000 });
  await page.waitForTimeout(2000);
  const itemCount = await page.$$eval('.item', function(els) { return els.length; });
  console.log('  + ' + itemCount + ' checklist items rendered');

  // ── STEP 5: Screenshot — checklist ───────────────────────────────────────
  console.log('[STEP 5] Screenshot: checklist...');
  await shot(page, '01_checklist_login');

  // ── STEP 6: Scroll to actions bar + verify AI buttons ────────────────────
  console.log('[STEP 6] Check actions bar + AI buttons...');
  await page.waitForSelector('#actionsBar', { state: 'visible', timeout: 5000 });
  await page.evaluate(function() {
    document.getElementById('actionsBar').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(300);

  var aiTests = [
    ['btn-ai-generate', 'Generer avec IA'],
    ['btn-ai-suggest', 'Suggestions'],
    ['btn-ai-risk', 'Analyser risques'],
  ];
  for (var i = 0; i < aiTests.length; i++) {
    var testId = aiTests[i][0];
    var label = aiTests[i][1];
    var visible = await page.isVisible('[data-testid="' + testId + '"]');
    console.log('  ' + (visible ? '✓' : '✗') + ' ' + label + ': ' + (visible ? 'VISIBLE' : 'NOT VISIBLE'));
  }

  // ── STEP 7: Screenshot — actions bar ─────────────────────────────────────
  console.log('[STEP 7] Screenshot: actions bar...');
  const actionsEl = await page.$('#actionsBar');
  if (actionsEl) {
    await actionsEl.screenshot({ path: join(SCREENSHOTS_DIR, '02_actions_bar.png') });
    console.log('  + Saved: screenshots/02_actions_bar.png');
  }

  // ── STEP 8: "Generer avec IA" → modal ────────────────────────────────────
  console.log('[STEP 8] Test Generer avec IA modal...');
  await page.click('[data-testid="btn-ai-generate"]');
  await page.waitForTimeout(700);
  const modalVisible = await page.isVisible('#aiGeneratorPanel');
  console.log('  ' + (modalVisible ? '✓' : '✗') + ' #aiGeneratorPanel visible: ' + modalVisible);

  if (modalVisible) {
    await shot(page, '03_ai_generator_modal');
    var closeBtn = page.locator('#btnCloseAIGenerator');
    if (await closeBtn.isVisible().catch(function() { return false; })) {
      await closeBtn.click();
      await page.waitForTimeout(400);
    }
  } else {
    await shot(page, '03_ai_generator_modal_FAIL');
  }

  // ── STEP 9: "Analyser risques" → widget ──────────────────────────────────
  console.log('[STEP 9] Test Analyser risques widget...');
  await page.evaluate(function() {
    document.getElementById('actionsBar').scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await page.waitForTimeout(200);
  await page.click('[data-testid="btn-ai-risk"]');

  try {
    await page.waitForFunction(function() {
      var el = document.getElementById('riskContainer');
      return el && el.children.length > 0;
    }, { timeout: 12000 });
    var widgetOk = await page.isVisible('#riskContainer');
    console.log('  + #riskContainer visible: ' + widgetOk);
    await page.evaluate(function() {
      document.getElementById('riskContainer').scrollIntoView({ behavior: 'instant', block: 'center' });
    });
    await page.waitForTimeout(500);
    await shot(page, '04_risk_widget');
  } catch(e) {
    console.warn('  ! Risk widget timeout: ' + e.message);
    await shot(page, '04_risk_widget_TIMEOUT');
  }

  console.log('\n=== ALL STEPS DONE ===');
  console.log('Screenshots: ' + SCREENSHOTS_DIR);
  await browser.close();
  server.close();
}

run().catch(function(err) {
  console.error('\n[FATAL] ' + (err.message || err));
  process.exit(1);
});
