# Pipeline CI/CD — Documentation

## Vue d'ensemble

```
Developer pushes code
        │
        ▼
┌─────────────────────────────────────────────┐
│  Push sur feature branch                    │
│  → ci.yml déclenché                         │
│  → Tests Cypress lancés                     │
│  → ✓ ou ✗ visible dans GitHub              │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│  Pull Request vers main                     │
│  → pr-check.yml : vérif structure           │
│  → ci.yml : tests complets                  │
│  → ✓ ou ✗ → merge autorisé ou bloqué       │
└─────────────────────────────────────────────┘
        │
        ▼ (merge dans main)
┌─────────────────────────────────────────────┐
│  deploy.yml déclenché                       │
│  → Job test  : re-lance les tests           │
│  → Job build : prépare le dossier dist/     │
│  → Job deploy: GitHub Pages live            │
│  → URL publique disponible                  │
└─────────────────────────────────────────────┘
```

## Les 3 workflows

### 1. `ci.yml` — Intégration Continue

**Déclenche sur :** Tous les push, toutes branches + PRs vers main

**Étapes :**
1. Checkout du code
2. Setup Node.js 20
3. `npm ci` (install déterministe)
4. `npx serve . --listen 3000 &` (serveur en background)
5. Health check HTTP
6. Cypress E2E (Chrome, headless)
7. Upload screenshots si échec (artefact GitHub, 7 jours)
8. Résumé dans GitHub Actions UI

**Durée estimée :** 2-4 minutes

---

### 2. `deploy.yml` — Déploiement Continu

**Déclenche sur :** Push sur `main` uniquement

**Jobs en séquence :**
```
test → build → deploy
```
Si un job échoue, les suivants sont annulés.

**Build "statique" :**
```bash
mkdir dist
cp index.html landing.html dist/
cp -r styles src dist/
```
Pas de bundler pour l'instant. Prêt pour Vite en v5.

**Durée estimée :** 4-6 minutes

---

### 3. `pr-check.yml` — Gate de Pull Request

**Déclenche sur :** Toutes les PRs vers main

**Fait :**
- Vérifie que tous les fichiers requis existent
- Vérifie la syntaxe JavaScript
- Génère un rapport de stats (lignes de code par fichier)
- Feedback en 30 secondes (avant les tests Cypress)

**Durée estimée :** < 1 minute

---

## Prérequis pour activer GitHub Pages

1. Aller dans **Settings → Pages**
2. Source : sélectionner **"GitHub Actions"**
3. Sauvegarder

Au prochain push sur `main`, le déploiement se fait automatiquement.

L'URL sera : `https://<username>.github.io/<repo-name>/`

---

## Résolution de problèmes courants

### Les tests échouent en CI mais passent en local
Cause probable : le serveur n'a pas démarré à temps.
Solution : augmenter `wait-on-timeout` dans `ci.yml` (30 → 60).

### GitHub Pages affiche 404
Cause : Pages n'est pas configuré en mode "GitHub Actions".
Solution : Settings → Pages → Source → GitHub Actions.

### Le job deploy ne se déclenche pas
Cause : les tests ont échoué dans le job `test`.
Solution : corriger les tests, re-pusher sur main.

---

## Évolution du pipeline (prévue en v5)

```yaml
# Ce que le pipeline deviendra avec un backend Firebase :
jobs:
  test:       # Tests unitaires + E2E
  lint:       # ESLint + Prettier
  build:      # npm run build (Vite)
  deploy-staging:   # Firebase Hosting staging
  smoke-test:       # Tests Cypress contre staging
  deploy-prod:      # Firebase Hosting production
```
