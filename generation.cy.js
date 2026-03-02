/**
 * generation.cy.js — Tests E2E : Génération de checklist
 * ─────────────────────────────────────────────
 * Ce fichier teste que l'outil génère correctement
 * les checklists selon le type de feature sélectionné.
 *
 * Pour lancer : npx cypress open
 */

describe('QA Checklist Generator — Génération', () => {

  beforeEach(() => {
    cy.visit('/');
  });

  // ─── ÉTAT INITIAL ───
  it('affiche l\'état vide au chargement', () => {
    cy.get('.empty-state').should('be.visible');
    cy.get('#filterBar').should('not.be.visible');
    cy.get('#actionsBar').should('not.be.visible');
  });

  it('le select contient tous les types de features', () => {
    const expectedTypes = ['login', 'form', 'api', 'payment', 'upload', 'dashboard', 'crud', 'search', 'notification', 'accessibility'];
    expectedTypes.forEach(type => {
      cy.get(`#featureType option[value="${type}"]`).should('exist');
    });
  });

  // ─── GÉNÉRATION ───
  it('génère une checklist Login avec des items', () => {
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();

    cy.get('.item').should('have.length.greaterThan', 10);
    cy.get('#filterBar').should('be.visible');
    cy.get('#actionsBar').should('be.visible');
  });

  it('affiche un titre correct après génération avec nom personnalisé', () => {
    cy.get('#featureType').select('login');
    cy.get('#featureName').type('Login Page v2');
    cy.get('#btnGenerate').click();

    cy.get('.checklist-title').should('contain', 'Login Page v2');
  });

  it('affiche les 4 statistiques correctement', () => {
    cy.get('#featureType').select('api');
    cy.get('#btnGenerate').click();

    cy.get('.stat-card').should('have.length', 4);
    cy.get('.stat-card').first().should('contain', '0/');
  });

  it('affiche des items Critical pour le type Login', () => {
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();

    cy.get('.badge-critical').should('have.length.greaterThan', 0);
  });

  it('génère différents nombres d\'items selon le type', () => {
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();
    cy.get('.item').its('length').as('loginCount');

    cy.get('#featureType').select('accessibility');
    cy.get('#btnGenerate').click();

    cy.get('@loginCount').then(loginCount => {
      cy.get('.item').its('length').should('not.equal', loginCount);
    });
  });

  // ─── VALIDATION ───
  it('affiche un toast d\'erreur si aucun type sélectionné', () => {
    cy.get('#btnGenerate').click();
    cy.get('.toast').should('be.visible').and('contain', '⚠');
  });
});
