/**
 * auth-ui.js — Interface Authentification
 * ─────────────────────────────────────────────
 * Construit et gère les formulaires Login / Register.
 * Injecte le HTML dans la page, branche les événements.
 * Ne contient aucune logique Firebase directe — délègue à auth.js.
 */

import {
  loginWithEmail,
  loginWithGoogle,
  registerWithEmail,
} from './auth.js';
import { showToast } from './renderer.js';

// ─────────────────────────────────────────────
// RENDER AUTH PANEL
// ─────────────────────────────────────────────

/**
 * Affiche le panneau d'authentification dans la page.
 * Appelé par app.js quand l'utilisateur n'est pas connecté.
 */
export function renderAuthPanel(container) {
  container.innerHTML = buildAuthHTML();
  bindAuthEvents(container);
}

function buildAuthHTML() {
  return `
    <div class="auth-panel">
      <div class="auth-header">
        <div class="auth-logo">QA<span>·</span>GEN</div>
        <p class="auth-subtitle">Connecte-toi pour sauvegarder tes sessions dans le cloud</p>
      </div>

      <!-- Onglets Login / Register -->
      <div class="auth-tabs">
        <button class="auth-tab active" data-tab="login">Connexion</button>
        <button class="auth-tab" data-tab="register">Inscription</button>
      </div>

      <!-- FORM LOGIN -->
      <form class="auth-form" id="loginForm" data-form="login">
        <div class="form-group">
          <label for="loginEmail">Email</label>
          <input type="email" id="loginEmail" placeholder="ton@email.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="loginPassword">Mot de passe</label>
          <input type="password" id="loginPassword" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <div class="form-error" id="loginError" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-full" id="loginBtn">
          Se connecter
        </button>
      </form>

      <!-- FORM REGISTER -->
      <form class="auth-form" id="registerForm" data-form="register" style="display:none">
        <div class="form-group">
          <label for="regName">Prénom ou pseudonyme</label>
          <input type="text" id="regName" placeholder="ex: Oussama" required autocomplete="name">
        </div>
        <div class="form-group">
          <label for="regEmail">Email</label>
          <input type="email" id="regEmail" placeholder="ton@email.com" required autocomplete="email">
        </div>
        <div class="form-group">
          <label for="regPassword">Mot de passe</label>
          <input type="password" id="regPassword" placeholder="min. 6 caractères" required autocomplete="new-password">
        </div>
        <div class="form-error" id="registerError" style="display:none"></div>
        <button type="submit" class="btn btn-primary btn-full" id="registerBtn">
          Créer mon compte
        </button>
      </form>

      <!-- SÉPARATEUR -->
      <div class="auth-separator">
        <span>ou</span>
      </div>

      <!-- GOOGLE LOGIN -->
      <button class="btn-google" id="googleBtn">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continuer avec Google
      </button>

      <!-- LIEN SANS COMPTE -->
      <p class="auth-skip">
        <a href="#" id="skipAuth">Continuer sans compte →</a>
        <span>(Session locale uniquement)</span>
      </p>
    </div>
  `;
}

// ─────────────────────────────────────────────
// EVENT BINDING
// ─────────────────────────────────────────────

function bindAuthEvents(container) {
  // Onglets
  container.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab, container));
  });

  // Form login
  container.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin(container);
  });

  // Form register
  container.querySelector('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister(container);
  });

  // Google
  container.querySelector('#googleBtn').addEventListener('click', async () => {
    await handleGoogleLogin();
  });

  // Skip (mode offline)
  container.querySelector('#skipAuth').addEventListener('click', (e) => {
    e.preventDefault();
    // Émet un événement custom que app.js intercepte
    document.dispatchEvent(new CustomEvent('auth:skip'));
  });
}

// ─────────────────────────────────────────────
// HANDLERS
// ─────────────────────────────────────────────

async function handleLogin(container) {
  const email = container.querySelector('#loginEmail').value.trim();
  const password = container.querySelector('#loginPassword').value;
  const btn = container.querySelector('#loginBtn');
  const errorEl = container.querySelector('#loginError');

  setButtonLoading(btn, true, 'Connexion...');
  hideError(errorEl);

  const result = await loginWithEmail(email, password);

  setButtonLoading(btn, false, 'Se connecter');

  if (!result.success) {
    showError(errorEl, result.error);
  }
  // Si succès, onAuthChange dans app.js prend le relais
}

async function handleRegister(container) {
  const name = container.querySelector('#regName').value.trim();
  const email = container.querySelector('#regEmail').value.trim();
  const password = container.querySelector('#regPassword').value;
  const btn = container.querySelector('#registerBtn');
  const errorEl = container.querySelector('#registerError');

  setButtonLoading(btn, true, 'Création...');
  hideError(errorEl);

  const result = await registerWithEmail(email, password, name);

  setButtonLoading(btn, false, 'Créer mon compte');

  if (!result.success) {
    showError(errorEl, result.error);
  }
}

async function handleGoogleLogin() {
  const btn = document.querySelector('#googleBtn');
  if (btn) btn.disabled = true;

  const result = await loginWithGoogle();

  if (!result.success) {
    showToast('❌ ' + result.error);
    if (btn) btn.disabled = false;
  }
}

// ─────────────────────────────────────────────
// UI HELPERS
// ─────────────────────────────────────────────

function switchTab(tabName, container) {
  container.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  container.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  container.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
  container.querySelector(`[data-form="${tabName}"]`).style.display = 'block';
}

function setButtonLoading(btn, loading, originalText) {
  btn.disabled = loading;
  btn.textContent = loading ? '...' : originalText;
}

function showError(el, message) {
  el.textContent = message;
  el.style.display = 'block';
}

function hideError(el) {
  el.textContent = '';
  el.style.display = 'none';
}
