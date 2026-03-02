/**
 * filters.cy.js — Tests E2E : Filtres & Interactions
 */

describe('QA Checklist Generator — Filtres & Interactions', () => {

  beforeEach(() => {
    cy.visit('/');
    cy.get('#featureType').select('login');
    cy.get('#btnGenerate').click();
  });

  // ─── FILTRES ───
  it('filtre par Critical réduit le nombre d\'items', () => {
    cy.get('.item').its('length').as('totalItems');

    cy.get('.tag[data-priority="critical"]').click();
    cy.get('.tag[data-priority="critical"]').should('have.class', 'active');

    cy.get('@totalItems').then(total => {
      cy.get('.item').its('length').should('be.lessThan', total);
    });
  });

  it('filtre "Tout" restaure tous les items', () => {
    cy.get('.item').its('length').as('totalItems');
    cy.get('.tag[data-priority="critical"]').click();
    cy.get('.tag[data-priority="all"]').click();

    cy.get('@totalItems').then(total => {
      cy.get('.item').should('have.length', total);
    });
  });

  it('tous les items du filtre Critical ont le badge critical', () => {
    cy.get('.tag[data-priority="critical"]').click();
    cy.get('.item').each(($item) => {
      cy.wrap($item).find('.badge-critical').should('exist');
    });
  });

  // ─── COCHER / DÉCOCHER ───
  it('cocher un item met à jour le compteur', () => {
    cy.get('.stat-card').first().invoke('text').then(before => {
      cy.get('.item').first().click();
      cy.get('.stat-card').first().invoke('text').should('not.eq', before);
    });
  });

  it('cocher un item ajoute la classe checked', () => {
    cy.get('.item').first().click();
    cy.get('.item').first().should('have.class', 'checked');
  });

  it('"Tout cocher" coche tous les items', () => {
    cy.get('#btnCheckAll').click();
    cy.get('.item').each($item => {
      cy.wrap($item).should('have.class', 'checked');
    });
  });

  it('"Tout décocher" décoche tous les items', () => {
    cy.get('#btnCheckAll').click();
    cy.get('#btnUncheckAll').click();
    cy.get('.item').each($item => {
      cy.wrap($item).should('not.have.class', 'checked');
    });
  });

  it('la barre de progression augmente quand on coche des items', () => {
    cy.get('.progress-fill').invoke('css', 'width').then(before => {
      cy.get('#btnCheckAll').click();
      cy.get('.progress-fill').invoke('css', 'width').should('not.eq', before);
    });
  });
});
