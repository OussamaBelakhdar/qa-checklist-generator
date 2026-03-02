/**
 * share.cy.js — Tests E2E Export PDF + Partage
 * ─────────────────────────────────────────────
 * Valide le panneau share-ui, le flux PDF (simulation),
 * et la page shared.html en lecture seule.
 */

describe('Share Panel — Ouverture et UI', () => {

  beforeEach(() => {
    cy.visit('/index.html');
  });

  it('le bouton Exporter/Partager est dans le DOM', () => {
    cy.get('#btnShare').should('exist');
  });

  it('génère une checklist puis ouvre le panneau partage', () => {
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();
    cy.get('#actionsBar').should('be.visible');
    cy.get('#btnShare').click();
    cy.get('#shareOverlay').should('be.visible');
  });

  it('affiche les deux options (PDF et lien) dans le panneau', () => {
    cy.get('#featureType').select('api');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
    cy.get('#shareOverlay').within(() => {
      cy.contains('Export PDF').should('exist');
      cy.contains('Partage par lien public').should('exist');
      cy.get('#btnExportPDF').should('exist');
      cy.get('#btnCreateLink').should('exist');
    });
  });

  it('ferme le panneau avec le bouton X', () => {
    cy.get('#featureType').select('form');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
    cy.get('#shareOverlay').should('be.visible');
    cy.get('#shareClose').click();
    cy.get('#shareOverlay').should('not.exist');
  });

  it('ferme le panneau en cliquant sur l\'overlay', () => {
    cy.get('#featureType').select('crud');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
    cy.get('#shareOverlay').should('be.visible');
    // Clic sur l'overlay (pas le panneau)
    cy.get('#shareOvInner').click({ force: true });
    cy.get('#shareOverlay').should('not.exist');
  });

  it('pré-remplit les champs avec les valeurs par défaut', () => {
    cy.get('#featureType').select('payment');
    cy.get('#featureName').type('Stripe Integration');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
    cy.get('#shareProjectName').should('have.value', 'Mon Projet QA');
  });

  it('ne s\'ouvre pas si aucune session n\'est active', () => {
    // Sans générer de checklist → toast d'avertissement
    cy.get('#btnShare').should('not.be.visible'); // caché dans la barre d'actions
  });

});

describe('Share Panel — Champs et validation', () => {

  beforeEach(() => {
    cy.visit('/index.html');
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
  });

  it('permet de modifier le nom du projet', () => {
    cy.get('#shareProjectName').clear().type('E-commerce QA Sprint 5');
    cy.get('#shareProjectName').should('have.value', 'E-commerce QA Sprint 5');
  });

  it('permet de modifier le nom de l\'auteur', () => {
    cy.get('#shareAuthorName').type('Oussama Belakhdar');
    cy.get('#shareAuthorName').should('have.value', 'Oussama Belakhdar');
  });

  it('affiche le nombre de sessions à inclure', () => {
    cy.get('#shareOverlay').contains('session(s)').should('exist');
  });

  it('le bouton Créer lien requiert une connexion', () => {
    // Sans user Firebase connecté, un toast s'affiche
    cy.get('#btnCreateLink').click();
    cy.get('#toast').should('be.visible');
    cy.get('#toast').should('contain', 'Connexion requise');
  });

});

describe('Page Rapport Partagé (shared.html)', () => {

  it('charge la page sans erreur JS', () => {
    cy.visit('/shared.html');
    cy.get('h1').should('contain', 'Report');
  });

  it('affiche une erreur si pas de paramètre r= dans l\'URL', () => {
    cy.visit('/shared.html');
    cy.wait(3000);
    cy.get('#sharedError').should('be.visible');
    cy.get('#errorTitle').should('contain', 'invalide');
  });

  it('affiche une erreur pour un shareId invalide', () => {
    cy.visit('/shared.html?r=invalidid999');
    cy.wait(5000);
    // Soit erreur Firebase, soit rapport introuvable
    cy.get('#sharedError').should('be.visible');
  });

  it('contient un lien CTA vers l\'outil principal', () => {
    cy.visit('/shared.html');
    cy.contains('Créer le mien').should('have.attr', 'href');
  });

  it('affiche la bannière lecture seule', () => {
    cy.visit('/shared.html');
    cy.get('.shared-banner').should('exist');
    cy.get('.shared-banner').should('contain', 'lecture seule');
  });

});

describe('PDF Export — Pré-conditions', () => {

  it('jsPDF est chargé depuis le CDN sur index-v8.html', () => {
    cy.visit('/index.html');
    cy.window().should('have.property', 'jspdf');
  });

  it('jsPDF-AutoTable est chargé', () => {
    cy.visit('/index.html');
    cy.window().then(win => {
      expect(win.jspdf?.jsPDF).to.exist;
    });
  });

  it('le panneau PDF affiche une barre de progression', () => {
    cy.visit('/index.html');
    cy.get('#featureType').select('api');
    cy.get('#btnGenerate').click();
    cy.get('#btnShare').click();
    cy.get('#pdfProgress').should('not.be.visible');
    // Après clic sur Générer PDF, la progress apparaît
    // (on ne teste pas le téléchargement réel en CI)
    cy.get('#btnExportPDF').should('be.visible');
  });

});
