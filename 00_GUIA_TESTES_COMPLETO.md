# 🧪 Guia Completo de Testes - ETAPA 7-9

## 📋 Índice Rápido

1. **Tipos de Testes**
2. **Como Executar**
3. **Estrutura de Testes**
4. **Exemplos Práticos**
5. **Boas Práticas**
6. **Troubleshooting**

---

## 1️⃣ Tipos de Testes Implementados

### ✅ Testes Unitários (Vitest)
**Arquivo:** `tests/unit/forms.test.js`

Testa funções isoladas:
- **useFormValidation** - Hook com validação
- **Validadores** - required, email, minLength, phone, cpf, etc
- **Máscaras** - maskCPF, maskPhone, maskDate, maskCurrency, etc

**Cobrir:**
- Inicialização com valores padrão
- Atualização de valores
- Marcação de campos tocados
- Reset do formulário
- Validação de cada tipo de dado

### 🔗 Testes de Integração (Vitest + React Testing Library)
**Arquivo:** `tests/integration/forms.integration.test.js`

Testa componentes e hooks juntos:
- **TabbedForm** - Múltiplas abas, navegação, validação
- **MaskedInput** - Mascaramento + validação
- **Fluxos Completos** - Cadastro de profissional do início ao fim

**Cobrir:**
- Renderização correta
- Interação entre componentes
- Fluxos de usuário realistas
- Tratamento de erros

### 🌐 Testes E2E (Cypress)
**Arquivo:** `cypress/e2e/forms.cy.js`

Testa aplicação inteira:
- Navegação de abas
- Preenchimento de formulários
- Submissão de dados
- Validações em tempo real
- Tratamento de erros

**Cobrir:**
- Fluxos reais do usuário
- Integração com backend
- UI/UX
- Performance

---

## 2️⃣ Como Executar Testes

### 🏃 Rodar Todos os Testes

```bash
# Testes unitários + integração
npm run test

# Testes unitários + integração (watch mode - reexecuta ao salvar)
npm run test:watch

# Testes E2E
npm run test:e2e

# Todos os testes
npm run test:all
```

### 🎯 Rodar Testes Específicos

```bash
# Apenas testes unitários
npm run test -- tests/unit

# Apenas testes de integração
npm run test -- tests/integration

# Apenas um arquivo
npm run test -- tests/unit/forms.test.js

# Testes que contêm "validation"
npm run test -- --grep "validation"

# Cypress com interface gráfica
npm run test:e2e:ui
```

### 📊 Cobertura de Código

```bash
# Gerar relatório de cobertura
npm run test:coverage

# Abrir relatório em navegador
open coverage/index.html
```

---

## 3️⃣ Estrutura de Testes

### 📁 Diretório de Testes

```
tests/
├── unit/
│   ├── forms.test.js          # Testes de funções isoladas
│   └── validators.test.js     # Testes de validadores
├── integration/
│   ├── forms.integration.test.js
│   └── components.integration.test.js
└── setup.js                   # Setup global do Vitest

cypress/
├── e2e/
│   └── forms.cy.js            # Testes E2E
├── support/
│   ├── e2e.js                 # Helpers e comandos
│   └── commands.js            # Comandos customizados
└── fixtures/                  # Dados de teste
```

### 📝 Anatomia de um Teste Unitário

```javascript
import { describe, it, expect } from 'vitest';

describe('Meu Teste', () => {
  it('deve fazer algo específico', () => {
    // Arrange (preparação)
    const input = 'teste';

    // Act (ação)
    const result = minhaFuncao(input);

    // Assert (verificação)
    expect(result).toBe('esperado');
  });
});
```

### 🧩 Anatomia de um Teste de Integração

```javascript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('Meu Componente', () => {
  it('interage com o usuário', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<MeuComponente />);

    // Act
    const button = screen.getByRole('button', { name: /clique/i });
    await user.click(button);

    // Assert
    expect(screen.getByText('Resultado')).toBeInTheDocument();
  });
});
```

### 🌐 Anatomia de um Teste E2E

```javascript
describe('Meu Fluxo', () => {
  it('navega e completa fluxo', () => {
    // Arrange & Act
    cy.visit('/pagina');
    cy.get('input[name="email"]').type('teste@email.com');
    cy.get('button').click();

    // Assert
    cy.url().should('include', '/sucesso');
    cy.contains('Salvo com sucesso').should('be.visible');
  });
});
```

---

## 4️⃣ Exemplos Práticos

### ✨ Exemplo 1: Testar Validação de Email

**Unitário:**
```javascript
it('rejeita email inválido', () => {
  const result = validators.email('email@invalido');
  expect(result.error).toBe('Email inválido');
});
```

**Integração:**
```javascript
it('mostra erro de email em tempo real', async () => {
  const user = userEvent.setup();
  render(<ValidatedFormField name="email" label="Email" />);
  
  await user.type(screen.getByLabelText('Email'), 'invalido@');
  await user.tab(); // blur
  
  expect(screen.getByText('Email inválido')).toBeInTheDocument();
});
```

**E2E:**
```javascript
it('valida email no formulário', () => {
  cy.visit('/formulario');
  cy.get('input[name="email"]').type('invalido@');
  cy.get('input[name="email"]').blur();
  cy.contains('Email inválido').should('be.visible');
});
```

### 🎬 Exemplo 2: Testar Fluxo de Formulário Tabbed

**Integração (Completo):**
```javascript
it('navega entre abas completando dados', async () => {
  const user = userEvent.setup();
  const handleSubmit = vi.fn();

  render(
    <TabbedForm
      tabs={[
        {
          label: 'Básico',
          fields: [{ name: 'name', required: true }]
        },
        {
          label: 'Contato',
          fields: [{ name: 'email', type: 'email', required: true }]
        }
      ]}
      onSubmit={handleSubmit}
    />
  );

  // Aba 1
  await user.type(screen.getByLabelText('Nome'), 'João');
  await user.click(screen.getByText('Próximo'));

  // Aba 2
  await user.type(screen.getByLabelText('Email'), 'joao@email.com');
  await user.click(screen.getByText('Confirmar'));

  expect(handleSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'João', email: 'joao@email.com' })
  );
});
```

### 🖊️ Exemplo 3: Testar Máscara de CPF

**Unitário:**
```javascript
it('formata CPF corretamente', () => {
  expect(maskCPF('12345678901')).toBe('123.456.789-01');
});
```

**Integração:**
```javascript
it('aplica máscara ao digitar', async () => {
  const user = userEvent.setup();
  render(<MaskedInput maskType="cpf" />);
  
  const input = screen.getByDisplayValue('');
  await user.type(input, '12345678901');
  
  expect(input.value).toBe('123.456.789-01');
});
```

**E2E:**
```javascript
it('formata CPF no navegador', () => {
  cy.visit('/formulario');
  cy.get('input[name="cpf"]').type('12345678901');
  cy.get('input[name="cpf"]').should('have.value', '123.456.789-01');
});
```

---

## 5️⃣ Boas Práticas

### ✅ DO's

**✓ Teste comportamento, não implementação:**
```javascript
// ✓ Bom
expect(screen.getByLabelText('Email')).toBeInTheDocument();

// ✗ Ruim
expect(component.state.email).toBe('teste@email.com');
```

**✓ Use queries semanticamente corretas:**
```javascript
// ✓ Bom
screen.getByRole('button', { name: /enviar/i });
screen.getByLabelText('Email');

// ✗ Ruim
screen.getByTestId('submit-btn-123');
screen.getByClassName('input-email');
```

**✓ Teste fluxos reais do usuário:**
```javascript
// ✓ Bom
await user.click(button); // userEvent simula interação realista
cy.get('button').click();  // Cypress faz click como usuário

// ✗ Ruim
fireEvent.click(button);   // Não simula bem eventos reais
```

**✓ Agrupe testes relacionados:**
```javascript
describe('TabbedForm', () => {
  describe('navegação', () => {
    it('avança para próxima aba', () => { ... });
    it('volta para aba anterior', () => { ... });
  });

  describe('validação', () => {
    it('impede avanço sem dados obrigatórios', () => { ... });
  });
});
```

### ❌ DON'Ts

**✗ Não dependa de timing aleatório:**
```javascript
// ✗ Ruim
setTimeout(() => {
  expect(result).toBe(expected);
}, 1000);

// ✓ Bom
await waitFor(() => {
  expect(result).toBe(expected);
});
```

**✗ Não teste detalhes de implementação:**
```javascript
// ✗ Ruim
expect(component.state.errors).toEqual({ email: 'Email inválido' });

// ✓ Bom
expect(screen.getByText('Email inválido')).toBeInTheDocument();
```

**✗ Não misture diferentes níveis de teste:**
```javascript
// ✗ Ruim (Integração que faz chamada real de API)
it('submete para backend', async () => {
  // Deveria ser E2E com Cypress
});

// ✓ Bom (Mock da API em integração)
it('submete dados corretos', async () => {
  vi.mock('@/api', () => ({ submitForm: vi.fn() }));
  // teste aqui
});
```

---

## 6️⃣ Troubleshooting

### ❓ Problema: Teste não encontra elemento

**Solução:**
```javascript
// Debugar
screen.debug(); // Printa DOM completo

// Usar role (mais robusto)
screen.getByRole('button', { name: /texto/i });

// Usar label (para inputs)
screen.getByLabelText('Email');

// Como último recurso, testid
screen.getByTestId('custom-id');
```

### ❓ Problema: Async não aguarda

**Solução:**
```javascript
// ✗ Errado
it('faz requisição', async () => {
  // Faltou await
  const promise = api.fetchData();
});

// ✓ Correto
it('faz requisição', async () => {
  const result = await api.fetchData();
  expect(result).toBeDefined();
});
```

### ❓ Problema: Modal não aparece

**Solução (Cypress):**
```javascript
// Aumentar timeout se necessário
cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible');

// Ou aguardar animação
cy.get('[role="dialog"]').should('be.visible');
cy.wait(500); // Esperar animação CSS
```

### ❓ Problema: Cobertura baixa

**Solução:**
```bash
# Ver quais linhas não estão cobertas
npm run test:coverage

# Abrir relatório HTML
open coverage/index.html

# Focar em adicionar testes para funções críticas
# 1. Utilitários/validadores
# 2. Fluxos principais
# 3. Casos de erro
```

---

## 📚 Arquivos de Teste

| Arquivo | Tipo | Propósito |
|---------|------|----------|
| `tests/unit/forms.test.js` | Unitário | Funções isoladas |
| `tests/integration/forms.integration.test.js` | Integração | Componentes + Hooks |
| `cypress/e2e/forms.cy.js` | E2E | Fluxos completos |
| `tests/setup.js` | Setup | Mocks globais |
| `cypress/support/e2e.js` | Support | Comandos Cypress |
| `vitest.config.js` | Config | Configuração Vitest |
| `cypress.config.js` | Config | Configuração Cypress |

---

## 🚀 Pipeline de Testes

```
1. Salvar arquivo
   ↓
2. Rodar testes unitários (rápido, <5s)
   ↓
3. Rodar testes integração (médio, <15s)
   ↓
4. Rodar testes E2E (lento, <60s)
   ↓
5. Gerar cobertura
   ↓
6. Commit/Push
```

**Executar tudo:** `npm run test:all`

---

## 📞 Suporte

- **Documentação Vitest:** https://vitest.dev
- **Documentação React Testing Library:** https://testing-library.com
- **Documentação Cypress:** https://docs.cypress.io
- **Community:** Procure por "vitest" ou "cypress" em comunidades

---

**Status:** ✅ Testes Implementados
**Cobertura Alvo:** 80%+
**Próximo:** Executar testes e validar cobertura
