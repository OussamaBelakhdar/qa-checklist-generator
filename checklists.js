/**
 * checklists.js — Couche Données
 * ─────────────────────────────────────────────
 * Contient tous les cas de test par type de feature.
 * Chaque item a : text, desc, priority (critical|high|medium|low)
 *
 * Pour ajouter un nouveau type :
 *   1. Ajouter une clé dans CHECKLISTS
 *   2. Définir label + sections
 *   3. L'outil le détecte automatiquement
 */

export const CHECKLISTS = {

  login: {
    label: "Login / Authentification",
    sections: {
      "Cas nominaux": [
        { text: "Login avec credentials valides", desc: "Email + mot de passe corrects → redirection vers home", priority: "critical" },
        { text: "Login admin vs user standard", desc: "Rôles différents → pages de destination différentes", priority: "high" },
        { text: "Remember me / Stay logged in", desc: "Cookie persistant entre sessions", priority: "medium" },
        { text: "Logout complet", desc: "Session détruite, token invalidé, redirection vers login", priority: "critical" },
      ],
      "Cas d'erreur": [
        { text: "Mot de passe incorrect", desc: "Message d'erreur générique (ne pas révéler si c'est l'email ou le MDP)", priority: "critical" },
        { text: "Email inexistant", desc: "Même message que MDP incorrect (sécurité)", priority: "critical" },
        { text: "Champs vides à la soumission", desc: "Validation front bloquante", priority: "high" },
        { text: "Format email invalide", desc: "ex: 'user@' ou 'user.com'", priority: "high" },
        { text: "Tentatives multiples échouées", desc: "Blocage après N tentatives, captcha ou message d'avertissement", priority: "critical" },
      ],
      "Sécurité": [
        { text: "Mot de passe non visible en clair dans les logs", desc: "Vérifier Network tab + backend logs", priority: "critical" },
        { text: "HTTPS obligatoire", desc: "HTTP redirige vers HTTPS", priority: "critical" },
        { text: "Token JWT / session expiration", desc: "Après X minutes d'inactivité → re-login requis", priority: "high" },
        { text: "Protection CSRF", desc: "Token CSRF présent dans le formulaire", priority: "high" },
        { text: "SQL Injection basique", desc: "ex: ' OR 1=1 -- dans les champs", priority: "critical" },
      ],
      "UX & Accessibilité": [
        { text: "Focus automatique sur le champ email", desc: "À l'ouverture de la page", priority: "low" },
        { text: "Navigation clavier complète", desc: "Tab → Email → MDP → Submit sans souris", priority: "medium" },
        { text: "Afficher / masquer le mot de passe", desc: "Icône toggle visible et fonctionnelle", priority: "medium" },
        { text: "Message d'erreur accessible", desc: "role='alert' ou aria-live pour les screen readers", priority: "medium" },
        { text: "Design responsive", desc: "Login fonctionnel sur mobile 375px", priority: "high" },
      ]
    }
  },

  form: {
    label: "Formulaire",
    sections: {
      "Validation des champs": [
        { text: "Champs requis vides → erreur bloquante", desc: "Pas de soumission possible tant que les champs obligatoires sont vides", priority: "critical" },
        { text: "Longueur min/max des champs texte", desc: "ex: prénom 2-50 chars, message 10-2000 chars", priority: "high" },
        { text: "Format email valide", desc: "Regex email standard", priority: "high" },
        { text: "Format téléphone", desc: "Accepte les formats internationaux si requis", priority: "medium" },
        { text: "Caractères spéciaux et XSS", desc: "Saisie de <script>alert(1)</script> → aucune exécution", priority: "critical" },
      ],
      "Soumission": [
        { text: "Soumission réussie → confirmation visuelle", desc: "Message de succès, redirection ou email de confirmation", priority: "critical" },
        { text: "Double soumission (double clic)", desc: "Le bouton se désactive après le 1er clic", priority: "high" },
        { text: "Soumission avec erreur serveur (500)", desc: "Message d'erreur compréhensible, pas de crash", priority: "high" },
        { text: "Soumission hors ligne", desc: "Comportement si le réseau est coupé pendant l'envoi", priority: "medium" },
      ],
      "Expérience utilisateur": [
        { text: "Les erreurs s'affichent au bon endroit", desc: "À côté du champ concerné, pas seulement en haut de page", priority: "high" },
        { text: "Les données ne se réinitialisent pas sur erreur", desc: "L'utilisateur ne perd pas ses saisies en cas d'erreur de validation", priority: "high" },
        { text: "Placeholder vs Label", desc: "Les labels restent visibles même après saisie", priority: "medium" },
        { text: "Ordre de tabulation logique", desc: "Tab suit l'ordre visuel des champs", priority: "low" },
      ],
      "Performance": [
        { text: "Temps de réponse après soumission < 3s", desc: "Sur connexion normale 4G", priority: "medium" },
        { text: "Indicateur de chargement pendant l'envoi", desc: "Spinner ou état disabled du bouton", priority: "medium" },
      ]
    }
  },

  api: {
    label: "API REST",
    sections: {
      "Méthodes HTTP": [
        { text: "GET — Retourne la ressource correcte", desc: "Status 200, body conforme au schema attendu", priority: "critical" },
        { text: "POST — Crée la ressource avec données valides", desc: "Status 201, ressource créée en base", priority: "critical" },
        { text: "PUT/PATCH — Met à jour partiellement / totalement", desc: "Status 200, données mises à jour correctement", priority: "critical" },
        { text: "DELETE — Supprime la ressource", desc: "Status 204, ressource introuvable après suppression", priority: "critical" },
        { text: "GET — Ressource inexistante → 404", desc: "Pas de 500, message d'erreur structuré", priority: "high" },
      ],
      "Codes de statut": [
        { text: "200 OK / 201 Created / 204 No Content", desc: "Vérifier le bon code selon l'opération", priority: "critical" },
        { text: "400 Bad Request — données invalides", desc: "Corps manquant, format incorrect", priority: "high" },
        { text: "401 Unauthorized — token manquant", desc: "Sans token d'auth → 401", priority: "critical" },
        { text: "403 Forbidden — permissions insuffisantes", desc: "Token valide mais rôle insuffisant → 403", priority: "critical" },
        { text: "422 Unprocessable Entity", desc: "Données syntaxiquement correctes mais sémantiquement invalides", priority: "high" },
        { text: "500 Internal Server Error", desc: "Ne doit pas leaker de stack trace en production", priority: "critical" },
      ],
      "Données & Schema": [
        { text: "Response body conforme au contrat API", desc: "Tous les champs attendus présents, types corrects", priority: "critical" },
        { text: "Pagination fonctionnelle", desc: "page, limit, total, hasNext présents et cohérents", priority: "high" },
        { text: "Filtres et tri fonctionnels", desc: "?status=active&sort=createdAt:desc retourne les bons résultats", priority: "high" },
        { text: "Dates en ISO 8601", desc: "Format standardisé pour toutes les dates", priority: "medium" },
      ],
      "Sécurité": [
        { text: "Authentification Bearer Token", desc: "Token valide → accès, token expiré → 401", priority: "critical" },
        { text: "Rate limiting", desc: "Après N requêtes → 429 Too Many Requests", priority: "high" },
        { text: "CORS configuré correctement", desc: "Origines autorisées seulement", priority: "high" },
        { text: "Injection dans les paramètres URL", desc: "?id=1 OR 1=1 → pas d'injection SQL", priority: "critical" },
      ]
    }
  },

  payment: {
    label: "Paiement / Checkout",
    sections: {
      "Flux de paiement": [
        { text: "Carte valide → paiement accepté", desc: "Utiliser les cards de test Stripe/Braintree", priority: "critical" },
        { text: "Carte refusée → message explicite", desc: "Pas de charge sur la carte + message compréhensible", priority: "critical" },
        { text: "Carte expirée → erreur claire", desc: "Différencier des autres erreurs", priority: "critical" },
        { text: "3DS / Authentification forte", desc: "Flow 3D Secure complet testé", priority: "critical" },
        { text: "Double paiement (double clic)", desc: "Idempotence : un seul débit effectué", priority: "critical" },
      ],
      "Données & Sécurité": [
        { text: "Numéro de carte non stocké en clair", desc: "PCI compliance — tokenization uniquement", priority: "critical" },
        { text: "CVV jamais loggé", desc: "Vérifier les logs réseau et backend", priority: "critical" },
        { text: "Montant correct affiché et débité", desc: "Cohérence panier → confirmation → relevé", priority: "critical" },
        { text: "Email de confirmation envoyé", desc: "Reçu avec bon montant et détails", priority: "high" },
      ],
      "Edge Cases": [
        { text: "Timeout pendant la transaction", desc: "Comportement si le réseau coupe à mi-paiement", priority: "critical" },
        { text: "Fonds insuffisants", desc: "Message spécifique vs carte refusée", priority: "high" },
        { text: "Remboursement / refund", desc: "Flux de remboursement testé", priority: "high" },
        { text: "Codes promo appliqués correctement", desc: "Réduction appliquée avant débit", priority: "medium" },
      ]
    }
  },

  upload: {
    label: "Upload de fichier",
    sections: {
      "Fonctionnel": [
        { text: "Upload fichier valide → succès", desc: "Image PNG, JPG, PDF selon le contexte", priority: "critical" },
        { text: "Aperçu avant validation", desc: "Thumbnail ou nom de fichier affiché", priority: "medium" },
        { text: "Drag & drop fonctionnel", desc: "Si implémenté", priority: "medium" },
        { text: "Upload multiple", desc: "Tous les fichiers uploadés correctement", priority: "high" },
      ],
      "Validation": [
        { text: "Extension non autorisée → erreur", desc: ".exe, .sh, .php → rejeté avec message", priority: "critical" },
        { text: "Taille maximale dépassée → erreur", desc: "ex: > 5MB → message précisant la limite", priority: "critical" },
        { text: "Fichier vide (0 bytes)", desc: "Rejeté avec message explicite", priority: "high" },
        { text: "Fichier corrompu", desc: "Image invalide → erreur compréhensible", priority: "high" },
      ],
      "Sécurité": [
        { text: "Scan antivirus", desc: "Fichier malveillant détecté et rejeté", priority: "critical" },
        { text: "Renommage du fichier côté serveur", desc: "Pas d'utilisation du nom original en chemin serveur", priority: "critical" },
        { text: "Stockage hors racine web", desc: "Fichiers non accessibles directement par URL", priority: "high" },
      ]
    }
  },

  dashboard: {
    label: "Dashboard / Analytics",
    sections: {
      "Données": [
        { text: "Les KPIs affichent les bonnes valeurs", desc: "Comparaison avec la source de données directe", priority: "critical" },
        { text: "Filtre par période fonctionnel", desc: "Aujourd'hui, 7j, 30j, custom → données recalculées", priority: "critical" },
        { text: "Données temps réel / refresh", desc: "Auto-refresh ou bouton refresh retourne les données à jour", priority: "high" },
        { text: "Graphiques avec données nulles / vides", desc: "Pas de crash, affichage d'un état vide clair", priority: "high" },
      ],
      "Performance": [
        { text: "Chargement initial < 3s", desc: "Dashboard avec données réelles", priority: "critical" },
        { text: "Pas de rechargement complet lors des filtres", desc: "Mise à jour partielle, pas de refresh page entière", priority: "medium" },
        { text: "Pagination des tableaux de données", desc: "Ne pas charger 10 000 lignes d'un coup", priority: "high" },
      ],
      "Droits": [
        { text: "Admin voit toutes les données", desc: "Périmètre complet", priority: "critical" },
        { text: "User standard voit seulement ses données", desc: "Isolation des données par rôle", priority: "critical" },
        { text: "Export CSV / PDF avec les bonnes données", desc: "Export cohérent avec les filtres actifs", priority: "medium" },
      ]
    }
  },

  crud: {
    label: "CRUD (Liste + Détail)",
    sections: {
      "Create": [
        { text: "Création avec données valides → succès", desc: "Item apparaît dans la liste", priority: "critical" },
        { text: "Création avec données invalides → erreurs", desc: "Validation complète avant envoi", priority: "critical" },
        { text: "Création en double (idempotence)", desc: "Comportement défini en cas de doublon", priority: "high" },
      ],
      "Read": [
        { text: "Liste complète affichée correctement", desc: "Tous les items, pagination si > N items", priority: "critical" },
        { text: "Détail d'un item → données complètes", desc: "Tous les champs du item affichés", priority: "critical" },
        { text: "Item inexistant → 404 page", desc: "Pas de crash, redirection propre", priority: "high" },
        { text: "Tri et filtres fonctionnels", desc: "Tri par date, nom, statut...", priority: "medium" },
      ],
      "Update": [
        { text: "Modification partielle sauvegardée", desc: "Seuls les champs modifiés sont changés", priority: "critical" },
        { text: "Annulation de modification", desc: "Cancel → données originales restaurées", priority: "high" },
        { text: "Mise à jour concurrente (2 users)", desc: "Conflict detection ou last-write-wins défini", priority: "medium" },
      ],
      "Delete": [
        { text: "Suppression avec confirmation", desc: "Modal de confirmation avant suppression", priority: "critical" },
        { text: "Item supprimé disparaît de la liste", desc: "Sans refresh manuel", priority: "critical" },
        { text: "Suppression d'un item lié à d'autres data", desc: "Cascade ou erreur explicite", priority: "high" },
      ]
    }
  },

  search: {
    label: "Recherche",
    sections: {
      "Fonctionnel": [
        { text: "Recherche exacte retourne le bon résultat", desc: "Mot-clé exact → résultat correspondant en premier", priority: "critical" },
        { text: "Recherche partielle (fuzzy)", desc: "'appl' → résultats contenant 'apple', 'application'...", priority: "high" },
        { text: "Recherche insensible à la casse", desc: "'TEST' == 'test' == 'Test'", priority: "high" },
        { text: "Aucun résultat → message vide state clair", desc: "Pas de page blanche, suggestion ou message d'aide", priority: "high" },
      ],
      "Performance": [
        { text: "Délai de recherche < 1s", desc: "Sur dataset standard", priority: "critical" },
        { text: "Debounce implémenté", desc: "Pas de requête à chaque frappe, attente de 300-500ms", priority: "medium" },
      ],
      "Edge Cases": [
        { text: "Requête vide (Enter sans saisie)", desc: "Comportement défini : rien / tout afficher / message", priority: "high" },
        { text: "Caractères spéciaux dans la requête", desc: "% $ & @ # → pas d'erreur, résultats cohérents", priority: "high" },
        { text: "Très longue requête (100+ chars)", desc: "Tronquée ou gérée sans erreur serveur", priority: "medium" },
      ]
    }
  },

  notification: {
    label: "Notifications",
    sections: {
      "Déclenchement": [
        { text: "Notification déclenchée au bon moment", desc: "Event attendu → notification reçue", priority: "critical" },
        { text: "Notification non dupliquée", desc: "Un seul event → une seule notification", priority: "critical" },
        { text: "Notification reçue après reconnexion", desc: "Events manqués pendant déconnexion rattrapés", priority: "high" },
      ],
      "Contenu": [
        { text: "Contenu clair et informatif", desc: "Titre + message suffisamment descriptif", priority: "high" },
        { text: "Liens dans la notification fonctionnels", desc: "CTA redirige vers la bonne ressource", priority: "high" },
        { text: "Pas de données sensibles dans le texte", desc: "Pas de MDP, token ou info privée visible", priority: "critical" },
      ],
      "Gestion": [
        { text: "Marquer comme lu fonctionnel", desc: "Badge compteur mis à jour", priority: "medium" },
        { text: "Supprimer une notification", desc: "Disparaît immédiatement", priority: "medium" },
        { text: "Préférences de notification respectées", desc: "User désactive → plus de notif de ce type", priority: "high" },
      ]
    }
  },

  accessibility: {
    label: "Accessibilité (a11y)",
    sections: {
      "Navigation clavier": [
        { text: "Tous les éléments interactifs accessibles au clavier", desc: "Tab navigue sur tous les liens, boutons, champs", priority: "critical" },
        { text: "Focus visible sur tous les éléments", desc: "Outline visible (pas de outline:none sans alternative)", priority: "critical" },
        { text: "Skip link présent", desc: "'Aller au contenu principal' en premier element de page", priority: "high" },
        { text: "Pas de piège clavier", desc: "Modals : focus piégé dans la modal, Escape pour fermer", priority: "critical" },
      ],
      "Contenu": [
        { text: "Images avec texte alternatif pertinent", desc: "alt='...' descriptif, alt='' pour images décoratives", priority: "critical" },
        { text: "Contraste suffisant (4.5:1 minimum)", desc: "Texte sur fond → ratio WCAG AA respecté", priority: "critical" },
        { text: "Formulaires avec labels liés aux champs", desc: "for='' / aria-labelledby sur chaque input", priority: "critical" },
        { text: "Messages d'erreur liés aux champs", desc: "aria-describedby ou aria-errormessage", priority: "high" },
      ],
      "Structure": [
        { text: "Hiérarchie des titres logique (H1→H2→H3)", desc: "Pas de saut de niveau (H1 → H4)", priority: "high" },
        { text: "Landmarks ARIA présents", desc: "main, nav, header, footer sémantiques", priority: "medium" },
        { text: "Langue déclarée dans le HTML", desc: "lang='fr' sur la balise html", priority: "medium" },
      ]
    }
  }
};

/**
 * Retourne la liste de tous les types disponibles
 * avec leur clé et leur label pour remplir un <select>
 */
export function getFeatureTypes() {
  return Object.entries(CHECKLISTS).map(([key, val]) => ({
    key,
    label: val.label
  }));
}
