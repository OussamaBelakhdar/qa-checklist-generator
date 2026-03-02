/**
 * ai.cy.js — Tests E2E des features IA v9
 * ─────────────────────────────────────────
 * STRATÉGIE : Les appels réels IA (Gemini, Claude) sont mockés
 * via window.__AI_MOCK__ = true pour éviter latence, coût, flakiness.
 */

describe('IA — Panneau Génération (Gemini)', () => {

    beforeEach(() => {
        cy.visit('/index.html?mock=true');
        // Activer le mock mode
        cy.window().then(win => { win.__AI_MOCK__ = true; });
    });

    it('le bouton ✨ Générer avec IA est visible après génération', () => {
        cy.get('#featureType').select('login');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-generate"]').should('be.visible');
    });

    it('ouvre le panneau de génération IA', () => {
        cy.get('#featureType').select('api');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-generate"]').click();
        cy.get('#aiGeneratorPanel').should('be.visible');
        cy.get('#aiFeatureDescription').should('exist');
    });

    it('rejette une description trop courte', () => {
        cy.get('#featureType').select('login');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-generate"]').click();
        cy.get('#aiFeatureDescription').type('test');
        cy.get('[data-testid="btn-run-ai-generate"]').click();
        cy.get('#aiGeneratorError').should('be.visible');
        cy.get('#aiGeneratorError').should('contain', 'trop courte');
    });

    it('accepte une description valide et affiche les scénarios (mock)', () => {
        cy.get('#featureType').select('login');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-generate"]').click();
        cy.get('#aiFeatureDescription').type(
            'Page de login avec email/password, Google OAuth, et rate limiting après 5 tentatives'
        );
        cy.get('[data-testid="btn-run-ai-generate"]').click();
        // En mock mode : réponse après ~1.2s
        cy.get('#aiScenariosResult', { timeout: 10000 }).should('be.visible');
        cy.get('.ai-scenario-item').should('have.length.at.least', 3);
    });

    it('ajoute les scénarios IA à la checklist', () => {
        cy.get('#featureType').select('login');
        cy.get('#btnGenerate').click();
        cy.get('.item').then($items => {
            const count = $items.length;
            cy.get('[data-testid="btn-ai-generate"]').click();
            cy.get('#aiFeatureDescription').type(
                'Login avec authentification multi-facteurs via SMS et email'
            );
            cy.get('[data-testid="btn-run-ai-generate"]').click();
            cy.get('[data-testid="btn-add-ai-scenarios"]', { timeout: 10000 }).click();
            cy.get('.item').should('have.length.above', count);
        });
    });

    it('ferme le panneau avec le bouton Annuler', () => {
        cy.get('#featureType').select('form');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-generate"]').click();
        cy.get('#aiGeneratorPanel').should('be.visible');
        cy.get('#btnCloseAIGenerator').click();
        cy.get('#aiGeneratorPanel').should('not.exist');
    });

});

describe('IA — Suggestions (Claude)', () => {

    beforeEach(() => {
        cy.visit('/index.html?mock=true');
        cy.window().then(win => { win.__AI_MOCK__ = true; });
    });

    it('le bouton 💡 Suggestions est visible', () => {
        cy.get('#featureType').select('payment');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-suggest"]').should('be.visible');
    });

    it('affiche le panneau de suggestions', () => {
        cy.get('#featureType').select('api');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-suggest"]').click();
        cy.get('#aiSuggestPanel', { timeout: 10000 }).should('be.visible');
    });

    it('les suggestions ont une explication et un rationale', () => {
        cy.get('#featureType').select('form');
        cy.get('#btnGenerate').click();
        cy.get('[data-testid="btn-ai-suggest"]').click();
        cy.get('#aiSuggestPanel', { timeout: 10000 }).within(() => {
            cy.get('.suggestion-explanation').should('exist');
            cy.get('.suggestion-item').should('have.length.at.least', 1);
            cy.get('.suggestion-rationale').first().should('not.be.empty');
        });
    });

    it('ajoute une suggestion individuelle à la checklist', () => {
        cy.get('#featureType').select('login');
        cy.get('#btnGenerate').click();
        cy.get('.item').then($items => {
            const initialCount = $items.length;
            cy.get('[data-testid="btn-ai-suggest"]').click();
            cy.get('.btn-add-suggestion', { timeout: 10000 }).first().click();
            cy.get('.item').should('have.length', initialCount + 1);
        });
    });

});

describe('IA — Analyse des risques (Gemini)', () => {

    beforeEach(() => {
        cy.visit('/index.html?mock=true');
        cy.window().then(win => { win.__AI_MOCK__ = true; });
        cy.get('#featureType').select('payment');
        cy.get('#btnGenerate').click();
    });

    it('le bouton 🎯 Analyser risques est visible', () => {
        cy.get('[data-testid="btn-ai-risk"]').should('be.visible');
    });

    it('affiche le widget de risques après analyse', () => {
        cy.get('[data-testid="btn-ai-risk"]').click();
        cy.get('#riskContainer', { timeout: 15000 }).should('be.visible');
        cy.get('.risk-badge').should('exist');
        cy.get('.risk-score').should('exist');
    });

    it('le niveau de risque est cohérent (Critical si rien de coché)', () => {
        cy.get('[data-testid="btn-ai-risk"]').click();
        cy.get('#riskContainer', { timeout: 15000 }).within(() => {
            cy.get('[data-level]').should('have.attr', 'data-level').and('match', /critical|high/);
        });
    });

    it('le widget contient des insights et recommandations', () => {
        cy.get('[data-testid="btn-ai-risk"]').click();
        cy.get('#riskContainer', { timeout: 15000 }).within(() => {
            cy.get('.risk-insight').should('have.length.at.least', 1);
            cy.get('.risk-recommendation').should('have.length.at.least', 1);
        });
    });

    it('les blockers sont listés si items Critical non testés', () => {
        cy.get('[data-testid="btn-ai-risk"]').click();
        cy.get('#riskContainer', { timeout: 15000 }).within(() => {
            cy.get('.risk-blocker').should('have.length.at.least', 1);
        });
    });

});
