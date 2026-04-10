/**
 * Suporte para E2E com Cypress
 * Arquivo: cypress/support/e2e.js
 */

// ===== Importar Comandos Padrão =====
import './commands';

// ===== Configuração Global =====
beforeEach(() => {
  // Resetar mocks e state antes de cada teste
  cy.clearAllCookies();
  cy.clearAllLocalStorage();
  cy.clearAllSessionStorage();
});

// ===== Usar Supabase em Testes (se necessário) =====
// Antes de usar, configure a URL base e autenticação apropriadas

/**
 * Hooks de Ciclo de Vida
 */

// Antes de cada teste
beforeEach(function () {
  cy.window().then((win) => {
    // Verificar se aplicação está pronta
    expect(win).to.exist;
  });
});

// Depois de cada teste
afterEach(function () {
  // Limpar state da aplicação se necessário
  cy.window().then((win) => {
    if (win.localStorage) {
      win.localStorage.clear();
    }
  });
});

/**
 * Handler para Erros Uncaught
 */
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignorar certos erros esperados
  if (
    err.message.includes('ResizeObserver') ||
    err.message.includes('Cannot read properties of undefined') ||
    err.message.includes('Cannot set property')
  ) {
    return false;
  }
  // Deixar erro propagar para falhar o teste
  return true;
});

/**
 * Esperar por elementos carregarem
 */
Cypress.on('fail', (error, runnable) => {
  console.error('Cypress failed:', error);
  // Pode adicionar lógica customizada aqui
});

/**
 * Helpers para Testes Comuns
 */

// Login padrão
Cypress.Commands.add('loginAdmin', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('admin@example.com');
  cy.get('input[name="password"]').type('senha123');
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/clinica');
});

// Login como profissional
Cypress.Commands.add('loginProfessional', (email = 'doctor@example.com', password = 'senha123') => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/clinica');
});

// Logout
Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.contains('Sair').click();
  cy.url().should('include', '/login');
});

// Verificar elemento visível
Cypress.Commands.add('shouldBeVisible', (selector) => {
  cy.get(selector).should('be.visible');
});

// Aguardar carregamento
Cypress.Commands.add('waitForLoad', () => {
  cy.get('[data-testid="loading-spinner"]', { timeout: 30000 }).should('not.exist');
});

// Preenchimento de formulário
Cypress.Commands.add('fillForm', (data) => {
  Object.entries(data).forEach(([fieldName, value]) => {
    cy.get(`input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`)
      .first()
      .then(($el) => {
        if ($el.is('select')) {
          cy.wrap($el).select(value);
        } else if ($el.is('textarea')) {
          cy.wrap($el).type(value, { delay: 0 });
        } else {
          cy.wrap($el).clear().type(value, { delay: 0 });
        }
      });
  });
});

// Submeter formulário
Cypress.Commands.add('submitForm', () => {
  cy.get('button[type="submit"]').click();
});

// Verificar mensagem de sucesso
Cypress.Commands.add('shouldShowSuccess', (message) => {
  cy.contains(message, { timeout: 10000 }).should('be.visible');
  cy.contains(message).should('have.class', 'bg-green');
});

// Verificar mensagem de erro
Cypress.Commands.add('shouldShowError', (message) => {
  cy.contains(message, { timeout: 10000 }).should('be.visible');
  cy.contains(message).should('have.class', 'bg-red');
});

// Aguardar por notificação
Cypress.Commands.add('waitForNotification', () => {
  cy.get('[role="alert"]', { timeout: 10000 }).should('exist');
});

// Fechar notificação
Cypress.Commands.add('closeNotification', () => {
  cy.get('[role="alert"] button').click();
});

// Navegar para página
Cypress.Commands.add('goToPage', (path) => {
  cy.visit(`/clinica${path}`);
  cy.waitForLoad();
});

// Resetar formulário
Cypress.Commands.add('resetForm', () => {
  cy.contains('button', /resetar|limpar|cancelar/i).click();
});

/**
 * Helpers para Elementos Específicos
 */

// Abrir modal/dialog
Cypress.Commands.add('openModal', (title) => {
  cy.contains('button', title).click();
  cy.get('[role="dialog"]').should('be.visible');
});

// Fechar modal/dialog
Cypress.Commands.add('closeModal', () => {
  cy.get('[role="dialog"] button[aria-label="Close"]').click();
  cy.get('[role="dialog"]').should('not.exist');
});

// Selecionar na tabela
Cypress.Commands.add('selectTableRow', (text) => {
  cy.contains('table tr', text).click();
});

// Deletar linha da tabela
Cypress.Commands.add('deleteTableRow', (text) => {
  cy.contains('table tr', text).find('[data-action="delete"]').click();
  cy.contains('button', /confirmar|sim/i).click();
});

// Ordenar tabela
Cypress.Commands.add('sortTable', (columnHeader) => {
  cy.contains('th', columnHeader).click();
});

/**
 * Helpers para Testes de Performance
 */

// Medir tempo de carregamento
Cypress.Commands.add('measureLoadTime', (selector) => {
  const start = Date.now();
  cy.get(selector, { timeout: 30000 }).then(() => {
    const loadTime = Date.now() - start;
    cy.log(`⏱️ Tempo de carregamento: ${loadTime}ms`);
    expect(loadTime).to.be.lessThan(5000); // Menos de 5s
  });
});

/**
 * Helpers para Validação
 */

// Verificar campo obrigatório (mostra erro)
Cypress.Commands.add('checkRequired', (fieldName) => {
  cy.get(`[name="${fieldName}"]`).focus().blur();
  cy.get(`[name="${fieldName}"]`).closest('div').contains('obrigatório').should('be.visible');
});

// Verificar campo com padrão (como email)
Cypress.Commands.add('checkPattern', (fieldName, invalidValue, errorText) => {
  cy.get(`[name="${fieldName}"]`).type(invalidValue);
  cy.get(`[name="${fieldName}"]`).blur();
  cy.contains(errorText).should('be.visible');
});

/**
 * Helpers para Dados Dinâmicos
 */

// Gerar dados aleatórios
Cypress.Commands.add('generateRandomData', () => {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@example.com`,
    name: `Test User ${timestamp}`,
    phone: `119${Math.random().toString().slice(2, 11)}`,
    cpf: `${Math.random().toString().slice(2, 12)}`
  };
});

/**
 * Helpers para Integração com API
 */

// Mock de requisição API
Cypress.Commands.add('mockApiRequest', (method, path, response, statusCode = 200) => {
  cy.intercept(method, `*${path}`, {
    statusCode,
    body: response
  }).as(`${method}${path}`);
});

// Verificar que requisição foi feita
Cypress.Commands.add('verifyApiCall', (method, path) => {
  cy.wait(`@${method}${path}`);
});

/**
 * Debugging
 */

// Tomar screenshot customizado
Cypress.Commands.add('takeScreenshot', (name) => {
  cy.screenshot(`${name}-${Date.now()}`);
});

// Logar estado da aplicação
Cypress.Commands.add('logAppState', () => {
  cy.window().then((win) => {
    const state = win.__APP_STATE__ || {};
    cy.log('App State:', JSON.stringify(state, null, 2));
  });
});

// ===== Tipos TypeScript (se usar TypeScript) =====
// declare global {
//   namespace Cypress {
//     interface Chainable {
//       loginAdmin(): Chainable<void>
//       loginProfessional(email?: string, password?: string): Chainable<void>
//       logout(): Chainable<void>
//       // ... etc
//     }
//   }
// }
