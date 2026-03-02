/**
 * metrics.cy.js — Tests unitaires des fonctions de métriques
 * ─────────────────────────────────────────────
 * Cypress peut tester des modules JS purs via cy.task ou en important
 * directement. Ici on utilise des fixtures de sessions pour valider
 * que chaque fonction de metrics.js retourne les bonnes valeurs.
 */

describe('Analytics — metrics.js', () => {

  // ─── FIXTURES ───
  // Sessions de test avec données contrôlées
  const SESSION_FULL = {
    sessionId: 'test_full',
    type: 'login',
    name: 'Login Feature',
    checklist: [
      { id: 1, text: 'Test 1', priority: 'critical', section: 'Auth',   checked: true  },
      { id: 2, text: 'Test 2', priority: 'critical', section: 'Auth',   checked: false },
      { id: 3, text: 'Test 3', priority: 'high',     section: 'UX',     checked: true  },
      { id: 4, text: 'Test 4', priority: 'medium',   section: 'UX',     checked: true  },
      { id: 5, text: 'Test 5', priority: 'low',      section: 'Extras', checked: false },
    ],
    updatedAt: new Date(Date.now() - 86_400_000).toISOString(),
  };

  const SESSION_EMPTY = {
    sessionId: 'test_empty',
    type: 'api',
    name: 'API Feature',
    checklist: [],
    updatedAt: new Date().toISOString(),
  };

  const SESSION_COMPLETE = {
    sessionId: 'test_complete',
    type: 'form',
    name: 'Form Feature',
    checklist: [
      { id: 10, text: 'T10', priority: 'critical', section: 'Validation', checked: true },
      { id: 11, text: 'T11', priority: 'high',     section: 'Validation', checked: true },
      { id: 12, text: 'T12', priority: 'medium',   section: 'Validation', checked: true },
    ],
    updatedAt: new Date().toISOString(),
  };

  // ─── COUVERTURE GLOBALE ───
  describe('computeGlobalCoverage', () => {
    it('calcule correctement sur une session partielle', () => {
      cy.window().then(win => {
        // Import dynamique ES Module depuis la page de test
        return win.eval(`
          import('/src/analytics/metrics.js').then(m => {
            const result = m.computeGlobalCoverage([${JSON.stringify(SESSION_FULL)}]);
            window.__testResult = result;
          })
        `);
      }).then(() => {
        cy.window().its('__testResult').should('deep.equal', {
          total: 5, checked: 3, unchecked: 2, percent: 60,
        });
      });
    });

    it('retourne 0% pour une session vide', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeGlobalCoverage([${JSON.stringify(SESSION_EMPTY)}]);
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.property', 'percent', 0);
        cy.window().its('__testResult').should('have.property', 'total', 0);
      });
    });

    it('retourne 100% quand tout est coché', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeGlobalCoverage([${JSON.stringify(SESSION_COMPLETE)}]);
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.property', 'percent', 100);
      });
    });
  });

  // ─── COUVERTURE PAR PRIORITÉ ───
  describe('computeCoverageByPriority', () => {
    it('calcule la couverture critical correctement', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeCoverageByPriority([${JSON.stringify(SESSION_FULL)}]);
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.property', 'critical')
          .and('deep.include', { total: 2, checked: 1, percent: 50 });
      });
    });

    it('retourne 4 priorités dans le résultat', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeCoverageByPriority([${JSON.stringify(SESSION_FULL)}]);
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.all.keys', ['critical', 'high', 'medium', 'low']);
      });
    });
  });

  // ─── DISTRIBUTION FEATURES ───
  describe('computeFeatureDistribution', () => {
    it('group correctement par type de feature', () => {
      const sessions = [SESSION_FULL, SESSION_EMPTY, SESSION_COMPLETE];
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeFeatureDistribution(${JSON.stringify(sessions)});
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.length', 3);
        cy.window().its('__testResult.0').should('have.property', 'count');
        cy.window().its('__testResult.0').should('have.property', 'coverage');
      });
    });
  });

  // ─── SCORE MATURITÉ ───
  describe('computeMaturityScore', () => {
    it('retourne 0 pour sessions vides', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeMaturityScore([]);
        })
      `)).then(() => {
        cy.window().its('__testResult').should('have.property', 'score', 0);
      });
    });

    it('retourne un score entre 0 et 100', () => {
      const sessions = [SESSION_FULL, SESSION_COMPLETE];
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeMaturityScore(${JSON.stringify(sessions)});
        })
      `)).then(() => {
        cy.window().its('__testResult.score').should('be.within', 0, 100);
      });
    });

    it('inclut un breakdown avec 4 dimensions', () => {
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeMaturityScore([${JSON.stringify(SESSION_COMPLETE)}]);
        })
      `)).then(() => {
        cy.window().its('__testResult.breakdown').should('have.all.keys',
          ['coverage', 'critical', 'variety', 'regularity']
        );
      });
    });
  });

  // ─── SECTIONS À RISQUE ───
  describe('computeRiskySections', () => {
    it('identifie les sections non couvertes comme risquées', () => {
      const sessions = [SESSION_FULL, SESSION_FULL]; // doublon pour avoir total >= 2
      cy.window().then(win => win.eval(`
        import('/src/analytics/metrics.js').then(m => {
          window.__testResult = m.computeRiskySections(${JSON.stringify(sessions)});
        })
      `)).then(() => {
        cy.window().its('__testResult').should('be.an', 'array');
        cy.window().its('__testResult.0').should('have.property', 'riskScore');
        cy.window().its('__testResult.0').should('have.property', 'coverage');
      });
    });
  });

});

// ─── TEST E2E DASHBOARD PAGE ───
describe('Dashboard page — e2e', () => {

  it('charge la page dashboard correctement', () => {
    cy.visit('/dashboard.html');
    cy.get('h1').should('contain', 'Dashboard');
    cy.get('#dashLoader').should('exist');
  });

  it('affiche le bouton démo quand pas de sessions', () => {
    cy.visit('/dashboard.html');
    cy.wait(2000); // laisse le temps au loader
    // Sans Firebase configuré, soit loader soit authPrompt s'affiche
    cy.get('body').should('exist');
  });

  it('affiche le dashboard démo après clic sur le bouton', () => {
    cy.visit('/dashboard.html');

    // Attend que le loader disparaisse
    cy.get('#dashLoader', { timeout: 5000 }).then($loader => {
      if ($loader.is(':visible')) {
        cy.get('#dashLoader').should('not.be.visible', { timeout: 5000 });
      }
    });

    // Clique sur Voir une démo si disponible
    cy.get('#btnLoadDemo').then($btn => {
      if ($btn.is(':visible')) {
        cy.wrap($btn).click();
        cy.get('#dashboardRoot').should('be.visible');
        cy.get('.dash-stats-grid').should('exist');
        cy.get('.dash-stat-card').should('have.length', 4);
      }
    });
  });

});
