# 🌐 Exemplos Detalhados de Testes E2E com Cypress

## 📋 Índice

1. Fluxo básico de teste
2. Manipulação de elementos
3. Validações
4. Máscaras de input
5. Selects cascata
6. Tratamento de erros
7. Performance
8. Debugging

---

## 1️⃣ Fluxo Básico de Teste

### Estrutura Padrão

```javascript
describe('Nome da Suíte', () => {
  beforeEach(() => {
    // Setup executado antes de cada teste
    cy.visit('/pagina');
  });

  it('descrição do teste', () => {
    // Arrange (preparação)
    // Act (ação)
    // Assert (verificação)
  });
});
```

### Exemplo: Login e Navegação

```javascript
describe('Autenticação e Navegação', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('faz login com credenciais válidas', () => {
    // Arrange (já feito em beforeEach)

    // Act
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();

    // Assert
    cy.url().should('include', '/clinica');
    cy.contains('Dashboard').should('be.visible');
  });

  it('mostra erro com credenciais inválidas', () => {
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senhaErrada');
    cy.get('button[type="submit"]').click();

    cy.contains('Email ou senha inválidos').should('be.visible');
  });
});
```

---

## 2️⃣ Manipulação de Elementos

### Seletores

```javascript
// ✓ Por role (melhor)
cy.getByRole('button', { name: /enviar/i });

// ✓ Por label (para inputs)
cy.get('input[aria-label="Email"]');

// ✓ Por atributo
cy.get('input[name="email"]');

// ✗ Por classe (frágil)
cy.get('.btn-submit');

// ✗ Por index (muito frágil)
cy.get('button').eq(0);
```

### Interações

```javascript
// Digitar texto
cy.get('input[name="email"]').type('teste@example.com');

// Clear antes de digitar
cy.get('input[name="email"]').clear().type('novo@example.com');

// Clicar
cy.get('button').click();

// Duplo clique
cy.get('element').dblclick();

// Clicar com opções
cy.get('element').click({ force: true });

// Selecionar em dropdown
cy.get('select[name="status"]').select('ativo');

// Verificar e desmarcar checkbox
cy.get('input[type="checkbox"]').check();
cy.get('input[type="checkbox"]').uncheck();

// Tab (para blur)
cy.focused().tab();

// Enter
cy.get('input').type('{enter}');

// Escape
cy.get('input').type('{esc}');

// Setas
cy.get('input').type('{uparrow}');
cy.get('input').type('{downarrow}');
```

### Verificações

```javascript
// Visibilidade
cy.get('element').should('be.visible');
cy.get('element').should('not.be.visible');

// Estar no DOM
cy.get('element').should('exist');
cy.get('element').should('not.exist');

// Conteúdo
cy.contains('Texto esperado').should('be.visible');
cy.get('element').should('have.text', 'Exato');
cy.get('element').should('contain.text', 'Parte');

// Atributos
cy.get('input').should('have.value', 'teste@example.com');
cy.get('element').should('have.class', 'ativo');
cy.get('element').should('have.attr', 'href', '/home');

// Desabilitado
cy.get('button').should('be.disabled');
cy.get('button').should('not.be.disabled');

// Checked
cy.get('input[type="checkbox"]').should('be.checked');
cy.get('input[type="checkbox"]').should('not.be.checked');
```

---

## 3️⃣ Validações

### Validações em Tempo Real

```javascript
describe('Validações de Input', () => {
  beforeEach(() => {
    cy.visit('/cadastro');
  });

  it('mostra erro de email inválido', () => {
    cy.get('input[name="email"]').type('email_invalido');
    cy.get('input[name="email"]').blur(); // trigger validation

    cy.contains('Email inválido').should('be.visible');
    cy.get('input[name="email"]').should('have.class', 'border-red-500');
  });

  it('limpa erro ao corrigir valor', () => {
    // Digitar inválido
    cy.get('input[name="email"]').type('invalido@');
    cy.get('input[name="email"]').blur();
    cy.contains('Email inválido').should('be.visible');

    // Corrigir
    cy.get('input[name="email"]').clear().type('correto@example.com');
    cy.get('input[name="email"]').blur();

    // Erro deve desaparecer
    cy.contains('Email inválido').should('not.exist');
  });

  it('mostra sucesso ao digitar valor válido', () => {
    cy.get('input[name="email"]').type('correto@example.com');
    cy.get('input[name="email"]').blur();

    // Ícone de sucesso
    cy.get('input[name="email"]')
      .parent()
      .find('svg.text-green-500')
      .should('be.visible');
  });
});
```

### Validações de Formulário

```javascript
describe('Validação de Campos Obrigatórios', () => {
  it('impede submissão sem campos obrigatórios', () => {
    cy.visit('/profissionais/novo');

    // Tentar submeter vazio
    cy.get('button:contains("Enviar")').click();

    // Deve mostrar erros
    cy.contains('Nome é obrigatório').should('be.visible');
    cy.contains('Email é obrigatório').should('be.visible');
    cy.contains('CPF é obrigatório').should('be.visible');

    // Não deve navegar
    cy.url().should('include', '/profissionais/novo');
  });

  it('permite submissão com campos preenchidos', () => {
    cy.visit('/profissionais/novo');

    cy.fillForm({
      name: 'Dr. João',
      email: 'joao@example.com',
      cpf: '12345678901'
    });

    cy.get('button:contains("Enviar")').click();

    // Deve navegar para sucesso
    cy.url().should('not.include', '/novo');
  });
});
```

---

## 4️⃣ Máscaras de Input

### Teste de Formatação

```javascript
describe('Máscaras de Input', () => {
  beforeEach(() => {
    cy.visit('/cadastro');
  });

  it('formata CPF automaticamente', () => {
    cy.get('input[name="cpf"]').type('12345678901');

    // Deve estar formatado
    cy.get('input[name="cpf"]').should('have.value', '123.456.789-01');
  });

  it('formata telefone automaticamente', () => {
    cy.get('input[name="phone"]').type('11987654321');

    cy.get('input[name="phone"]').should('have.value', '(11) 98765-4321');
  });

  it('formata data automaticamente', () => {
    cy.get('input[name="birthDate"]').type('15011990');

    cy.get('input[name="birthDate"]').should('have.value', '15/01/1990');
  });

  it('formata CEP automaticamente', () => {
    cy.get('input[name="zipCode"]').type('01310100');

    cy.get('input[name="zipCode"]').should('have.value', '01310-100');
  });

  it('formata moeda automaticamente', () => {
    cy.get('input[name="amount"]').type('12345');

    cy.get('input[name="amount"]').should('have.value', 'R$ 123,45');
  });

  it('limita quantidade de dígitos', () => {
    cy.get('input[name="cpf"]').type('123456789012345');

    // Deve ter apenas 11 dígitos formatados
    cy.get('input[name="cpf"]').invoke('val').then(val => {
      const digits = val.replace(/\D/g, '');
      expect(digits).to.have.length(11);
    });
  });

  it('aceita pasting de valores formatados', () => {
    cy.get('input[name="cpf"]').then($input => {
      // Simular paste
      $input.val('123.456.789-01');
      cy.wrap($input).trigger('change');
    });

    cy.get('input[name="cpf"]').should('have.value', '123.456.789-01');
  });
});
```

---

## 5️⃣ Selects Cascata

### Teste de Dependência

```javascript
describe('Selects Dependentes', () => {
  beforeEach(() => {
    cy.visit('/agenda/nova-consulta');
  });

  it('carrega serviços ao selecionar profissional', () => {
    // Inicialmente desabilitado
    cy.get('select[name="service"]').should('be.disabled');

    // Selecionar profissional
    cy.get('select[name="professional"]').select('Dr. João');

    // Aguardar carregamento
    cy.get('select[name="service"]').should('not.be.disabled');

    // Verificar que serviços foram carregados
    cy.get('select[name="service"] option').should('have.length.greaterThan', 1);
    cy.get('select[name="service"] option').contains('Consulta Geral');
  });

  it('carrega planos ao selecionar convênio', () => {
    cy.get('select[name="insurance"]').select('Convênio A');

    cy.get('select[name="plan"] option').should('have.length.greaterThan', 1);
    cy.get('select[name="plan"]').should('not.be.disabled');
  });

  it('limpa campo dependente ao mudar seleção', () => {
    // Selecionar profissional A
    cy.get('select[name="professional"]').select('Dr. João');
    cy.get('select[name="service"]').select('Consulta Geral');

    // Mudar para profissional B
    cy.get('select[name="professional"]').select('Dra. Maria');

    // Campo de serviço deve ser resetado
    cy.get('select[name="service"]').should('have.value', '');
  });

  it('mantém valores ao fazer reload (se usando localStorage)', () => {
    cy.get('select[name="professional"]').select('Dr. João');
    cy.get('select[name="service"]').select('Consulta Geral');

    // Reload
    cy.reload();

    // Valores devem ser mantidos
    cy.get('select[name="professional"]').should('have.value', 'dr-joao');
    cy.get('select[name="service"]').should('have.value', 'consulta-geral');
  });
});
```

---

## 6️⃣ Tratamento de Erros

### Simular Falhas de API

```javascript
describe('Tratamento de Erros', () => {
  it('mostra erro ao falhar requisição', () => {
    // Mock da API com erro
    cy.intercept('POST', '/api/profissionais', {
      statusCode: 500,
      body: { error: 'Erro ao salvar' }
    });

    cy.visit('/profissionais/novo');
    cy.fillForm({
      name: 'Dr. João',
      email: 'joao@example.com'
    });

    cy.get('button:contains("Enviar")').click();

    // Deve mostrar erro
    cy.contains('Erro ao salvar').should('be.visible');
  });

  it('mostra erro de timeout', () => {
    cy.intercept('POST', '/api/profissionais', (req) => {
      // Simular timeout (delay muito grande)
      req.reply((res) => {
        res.delay(15000); // Maior que timeout padrão
      });
    });

    cy.visit('/profissionais/novo');
    cy.fillForm({ name: 'Dr. João' });
    cy.get('button:contains("Enviar")').click();

    cy.contains('Timeout|Timed out').should('be.visible');
  });

  it('permite tentar novamente após erro', () => {
    let attempt = 0;

    cy.intercept('POST', '/api/profissionais', (req) => {
      attempt++;
      if (attempt === 1) {
        // Primeira tentativa falha
        req.reply({ statusCode: 500, body: { error: 'Erro' } });
      } else {
        // Segunda tentativa sucede
        req.reply({ statusCode: 200, body: { success: true } });
      }
    });

    cy.visit('/profissionais/novo');
    cy.fillForm({ name: 'Dr. João' });
    cy.get('button:contains("Enviar")').click();

    cy.contains('Erro').should('be.visible');

    // Tentar novamente
    cy.get('button:contains("Tentar Novamente")').click();

    cy.contains('Sucesso').should('be.visible');
  });

  it('mostra erro de validação do backend', () => {
    cy.intercept('POST', '/api/profissionais', {
      statusCode: 400,
      body: {
        errors: {
          cpf: 'CPF já cadastrado',
          email: 'Email já utilizado'
        }
      }
    });

    cy.visit('/profissionais/novo');
    cy.fillForm({
      name: 'Dr. João',
      cpf: '12345678901',
      email: 'existente@example.com'
    });

    cy.get('button:contains("Enviar")').click();

    cy.contains('CPF já cadastrado').should('be.visible');
    cy.contains('Email já utilizado').should('be.visible');
  });
});
```

---

## 7️⃣ Performance

### Testes de Velocidade

```javascript
describe('Performance', () => {
  it('carrega página em tempo razoável', () => {
    const start = Date.now();

    cy.visit('/profissionais');

    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    cy.window().then(() => {
      const loadTime = Date.now() - start;
      expect(loadTime).to.be.lessThan(3000); // Menos de 3s
    });
  });

  it('filtra lista rapidamente', () => {
    cy.visit('/profissionais');

    const start = Date.now();

    cy.get('input[placeholder="Pesquisar"]').type('João');
    cy.get('table tbody tr').should('have.length.lessThan', 5);

    cy.window().then(() => {
      const filterTime = Date.now() - start;
      expect(filterTime).to.be.lessThan(1000); // Menos de 1s
    });
  });

  it('formata input sem delay significativo', () => {
    cy.visit('/cadastro');

    const start = Date.now();

    cy.get('input[name="cpf"]').type('12345678901');

    cy.window().then(() => {
      const formatTime = Date.now() - start;
      expect(formatTime).to.be.lessThan(100); // Muito rápido
    });
  });
});
```

---

## 8️⃣ Debugging

### Técnicas de Debugging

```javascript
describe('Debugging', () => {
  it('tira screenshot ao falhar', () => {
    cy.visit('/pagina');

    // Cypress automaticamente tira screenshot em falhas
    cy.get('element-inexistente').should('exist');
  });

  it('usa debug mode', () => {
    cy.visit('/pagina');

    cy.get('button').debug(); // Pausa execução no debugger

    // Ou
    cy.pause(); // Pausa em qualquer ponto
  });

  it('printa DOM', () => {
    cy.visit('/pagina');

    cy.document().then(doc => {
      console.log(doc.body.innerHTML); // Ver HTML completo
    });

    // Ou use cy.debug para elementos
    cy.get('form').debug();
  });

  it('verifica múltiplas assertions', () => {
    cy.visit('/profissional/123');

    cy.get('[data-testid="name"]')
      .should('contain.text', 'Dr. João')
      .should('have.class', 'text-bold')
      .should('be.visible');
  });

  it('aguarda múltiplas condições', () => {
    cy.visit('/dados');

    // Aguardar dados carreguem
    cy.get('table tbody tr').should('have.length.greaterThan', 0);

    // Aguardar loading sair
    cy.get('[data-testid="loading"]').should('not.exist');

    // Tudo junto
    cy.get('table tbody tr')
      .should('have.length.greaterThan', 0)
      .parent()
      .parent()
      .should('not.have.class', 'opacity-50');
  });
});
```

---

## 🎯 Comandos Cypress Customizados

Adicione ao `cypress/support/e2e.js`:

```javascript
// Login padrão
Cypress.Commands.add('loginAdmin', () => {
  cy.visit('/login');
  cy.get('input[name="email"]').type('admin@example.com');
  cy.get('input[name="password"]').type('senha123');
  cy.get('button[type="submit"]').click();
  cy.url().should('include', '/clinica');
});

// Preencher formulário
Cypress.Commands.add('fillForm', (data) => {
  Object.entries(data).forEach(([key, value]) => {
    cy.get(`[name="${key}"]`).type(value);
  });
});

// Submeter formulário
Cypress.Commands.add('submitForm', () => {
  cy.get('button[type="submit"]').click();
});

// Usar em testes:
describe('Teste', () => {
  it('usa comandos customizados', () => {
    cy.loginAdmin();
    cy.visit('/profissionais/novo');
    cy.fillForm({ name: 'Dr. João', email: 'joao@example.com' });
    cy.submitForm();
  });
});
```

---

**Status:** ✅ Exemplos E2E Completos
**Pronto para:** Implementação em testes reais
