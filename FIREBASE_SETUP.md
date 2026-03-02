# Setup Firebase — Version 5

Guide complet pour connecter le projet à Firebase en 15 minutes.

---

## Étape 1 — Créer le projet Firebase

1. Aller sur https://console.firebase.google.com
2. Cliquer **"Ajouter un projet"**
3. Nom : `qa-checklist-generator`
4. Désactiver Google Analytics (pas nécessaire pour ce projet)
5. Cliquer **"Créer le projet"**

---

## Étape 2 — Activer Authentication

1. Dans la console Firebase → **Authentication → Get started**
2. Onglet **Sign-in method**
3. Activer **Email/Password** → Sauvegarder
4. Activer **Google** → Sauvegarder

---

## Étape 3 — Créer la base Firestore

1. Dans la console → **Firestore Database → Create database**
2. Choisir **"Start in production mode"**
3. Sélectionner la région : `europe-west1` (ou la plus proche)
4. Cliquer **Activer**

---

## Étape 4 — Déployer les Security Rules

Les règles se trouvent dans `firestore.rules` à la racine du projet.

**Option A — Via la console Firebase :**
1. Firestore → onglet **Rules**
2. Copier-coller le contenu de `firestore.rules`
3. Cliquer **Publish**

**Option B — Via Firebase CLI :**
```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

---

## Étape 5 — Récupérer la config et l'injecter

1. Console Firebase → ⚙️ **Paramètres du projet** → **Vos applications**
2. Cliquer **"</>  Ajouter une application web"**
3. Nom : `qa-checklist-web`
4. **Ne pas** cocher Firebase Hosting pour l'instant
5. Copier l'objet `firebaseConfig`

Ouvrir `src/firebase.js` et remplacer :

```javascript
const firebaseConfig = {
  apiKey:            "VOTRE_API_KEY",
  authDomain:        "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId:         "VOTRE_PROJECT_ID",
  storageBucket:     "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_SENDER_ID",
  appId:             "VOTRE_APP_ID"
};
```

---

## Étape 6 — Activer app-v5.js dans index.html

Modifier la dernière ligne de `index.html` :

```html
<!-- Avant (v3/v4) -->
<script type="module" src="src/app.js"></script>

<!-- Après (v5) -->
<script type="module" src="src/app-v5.js"></script>
```

Et ajouter le lien vers le CSS auth dans le `<head>` :

```html
<link rel="stylesheet" href="styles/auth.css">
```

---

## Étape 7 — Ajouter les éléments HTML manquants

Dans `index.html`, ajouter dans le header :

```html
<!-- Juste avant la fermeture de <header> -->
<div id="userBadge"></div>
<button id="btnLogout" class="btn btn-secondary" style="display:none">Déconnexion</button>
```

Et le panneau historique, juste avant `<!-- ─── FILTER BAR ─── -->` :

```html
<div id="historyPanel"></div>
```

---

## Étape 8 — Tester

```bash
npm run serve
# Ouvrir http://localhost:3000
```

L'overlay de connexion devrait apparaître.
Créer un compte → générer une checklist → fermer → rouvrir → session restaurée.

---

## Vérification dans la console Firebase

- **Authentication** → onglet **Users** : ton compte apparaît
- **Firestore** → collection **users** : ton profil est créé
- **Firestore** → collection **sessions** : tes sessions apparaissent

---

## Sécurité — Points importants

Les clés Firebase côté client sont **publiques par design**. Ce n'est pas un problème. La sécurité est entièrement assurée par les **Security Rules Firestore** qui empêchent tout accès non autorisé aux données.

Ce qui protège réellement :
- Les Security Rules vérifient `request.auth.uid == resource.data.uid` sur chaque accès
- Sans authentification → toutes les lectures/écritures sont refusées
- Un utilisateur A ne peut jamais accéder aux données de l'utilisateur B

---

## Coûts Firebase (plan Spark — gratuit)

| Resource | Limite gratuite |
|----------|----------------|
| Auth users | Illimité |
| Firestore reads | 50 000 / jour |
| Firestore writes | 20 000 / jour |
| Firestore storage | 1 GB |

Pour un projet portfolio avec quelques centaines d'utilisateurs, le plan gratuit est largement suffisant.
