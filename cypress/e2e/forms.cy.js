/**
 * Testes E2E: Fluxo de Cadastro de Profissional
 * Arquivo: cypress/e2e/cadastro-profissional.cy.js
 */

describe('E2E: Cadastro de Profissional - Fluxo Completo', () => {
  beforeEach(() => {
    // Login como administrador
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();

    // Aguardar redirecionamento
    cy.url().should('include', '/clinica');

    // Navegar para cadastro de profissional
    cy.get('a[href*="profissionais"]').click();
    cy.get('button:contains("Novo Profissional")').click();
  });

  it('completa cadastro com validação em todas as abas', () => {
    // ===== ABA 1: PESSOAL =====
    cy.contains('Pessoal').should('be.visible');
    
    // Preencher nome
    cy.get('input[name="name"]').type('Dr. João da Silva');
    cy.get('input[name="name"]').should('have.value', 'Dr. João da Silva');

    // Preencher CPF com máscara
    cy.get('input[name="cpf"]').type('12345678901');
    cy.get('input[name="cpf"]').should('have.value', '123.456.789-01');

    // Preencher data de nascimento
    cy.get('input[name="birthDate"]').type('15011990');
    cy.get('input[name="birthDate"]').should('have.value', '15/01/1990');

    // Avançar
    cy.get('button:contains("Próximo")').click();

    // ===== ABA 2: CONTATO =====
    cy.contains('Contato').should('be.visible');

    // Preencher email
    cy.get('input[name="email"]').type('joao@example.com');
    cy.get('input[name="email"]').should('have.value', 'joao@example.com');

    // Preencher telefone
    cy.get('input[name="phone"]').type('11987654321');
    cy.get('input[name="phone"]').should('have.value', '(11) 98765-4321');

    // Avançar
    cy.get('button:contains("Próximo")').click();

    // ===== ABA 3: PROFISSIONAL =====
    cy.contains('Profissional').should('be.visible');

    // Preencher CRM
    cy.get('input[name="crm"]').type('123456/SP');
    cy.get('input[name="crm"]').should('have.value', '123456/SP');

    // Selecionar especialidade
    cy.get('select[name="specialty"]').select('Cardiologia');
    cy.get('select[name="specialty"]').should('have.value', 'Cardiologia');

    // Avançar
    cy.get('button:contains("Próximo")').click();

    // ===== ABA 4: REVISÃO =====
    cy.contains('Revisão').should('be.visible');

    // Verificar que dados foram carregados corretamente
    cy.contains('Dr. João da Silva').should('be.visible');
    cy.contains('123.456.789-01').should('be.visible');
    cy.contains('joao@example.com').should('be.visible');

    // Submeter
    cy.get('button:contains("Confirmar")').click();

    // Verificar sucesso
    cy.contains('Profissional cadastrado com sucesso').should('be.visible');
    cy.url().should('include', '/clinica/configuracoes/profissionais');
  });

  it('valida campos obrigatórios', () => {
    // Tentar avançar sem preencher nada
    cy.get('button:contains("Próximo")').click();

    // Verificar mensagens de erro
    cy.contains('Nome é obrigatório').should('be.visible');
    cy.contains('CPF é obrigatório').should('be.visible');
    cy.contains('Data de nascimento é obrigatória').should('be.visible');

    // Ainda deve estar na ABA 1
    cy.contains('Pessoal').should('be.visible');
  });

  it('volta para aba anterior preservando dados', () => {
    // ABA 1: Preencher dados
    cy.get('input[name="name"]').type('Dr. João');
    cy.get('input[name="cpf"]').type('12345678901');
    cy.get('input[name="birthDate"]').type('15011990');

    // Avançar
    cy.get('button:contains("Próximo")').click();

    // ABA 2: Preencher dados
    cy.get('input[name="email"]').type('joao@example.com');
    cy.get('input[name="phone"]').type('11987654321');

    // Voltar
    cy.get('button:contains("Anterior")').click();

    // Verificar que dados foram preservados
    cy.get('input[name="name"]').should('have.value', 'Dr. João');
    cy.get('input[name="cpf"]').should('have.value', '123.456.789-01');
  });

  it('mostra indicador de progresso', () => {
    // Deve mostrar "1 de 4"
    cy.contains('1 de 4').should('be.visible');

    // Avançar
    cy.get('button:contains("Próximo")').click();
    cy.contains('2 de 4').should('be.visible');

    cy.get('button:contains("Próximo")').click();
    cy.contains('3 de 4').should('be.visible');

    cy.get('button:contains("Próximo")').click();
    cy.contains('4 de 4').should('be.visible');
  });

  it('mostra ícone de sucesso em abas completadas', () => {
    // ABA 1: Completar
    cy.get('input[name="name"]').type('Dr. João');
    cy.get('input[name="cpf"]').type('12345678901');
    cy.get('input[name="birthDate"]').type('15011990');
    cy.get('button:contains("Próximo")').click();

    // Voltar e verificar ícone de sucesso na ABA 1
    cy.get('button:contains("Anterior")').click();
    cy.get('[data-tab="0"]').find('svg').should('have.class', 'text-green-500');
  });
});

/**
 * Testes E2E: Validações de Máscaras
 */
describe('E2E: Validações de Máscaras de Input', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.visit('/clinica/configuracoes/profissionais/novo');
  });

  it('formata CPF automaticamente', () => {
    cy.get('input[name="cpf"]').type('12345678901');
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

  it('limita entrada a caracteres permitidos', () => {
    cy.get('input[name="cpf"]').type('ABC12345678901DEF');
    
    // Deve conter apenas números formatados
    cy.get('input[name="cpf"]').invoke('val').then(val => {
      const cleanValue = val.replace(/\D/g, '');
      expect(cleanValue.length).to.equal(11);
    });
  });
});

/**
 * Testes E2E: Seleção em Cascata
 */
describe('E2E: Selects Dependentes', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.visit('/clinica/agenda/nova-consulta');
  });

  it('carrega serviços ao selecionar profissional', () => {
    // Abrir formulário
    cy.get('button:contains("Nova Consulta")').click();

    // Selecionar profissional
    cy.get('select[name="professional"]').select('Dr. João');

    // Aguardar carregamento de serviços
    cy.get('select[name="service"]')
      .find('option')
      .should('have.length.greaterThan', 1);

    // Verificar que serviços foram carregados
    cy.get('select[name="service"] option').contains('Consulta').should('exist');
  });

  it('carrega planos ao selecionar convênio', () => {
    // Selecionar convênio
    cy.get('select[name="insurance"]').select('Convênio A');

    // Aguardar carregamento de planos
    cy.get('select[name="plan"]')
      .find('option')
      .should('have.length.greaterThan', 1);
  });

  it('limpa campos dependentes ao mudar seleção', () => {
    // Selecionar profissional A
    cy.get('select[name="professional"]').select('Dr. João');
    cy.get('select[name="service"]').select('Consulta Geral');

    // Mudar para profissional B
    cy.get('select[name="professional"]').select('Dra. Maria');

    // Serviço deve ser resetado
    cy.get('select[name="service"]').should('have.value', '');
  });
});

/**
 * Testes E2E: Validação em Tempo Real
 */
describe('E2E: Validação em Tempo Real', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.visit('/clinica/configuracoes/profissionais/novo');
  });

  it('mostra erro de email inválido em tempo real', () => {
    const emailInput = cy.get('input[name="email"]');

    // Digitar email inválido
    emailInput.type('email_invalido');
    emailInput.blur();

    // Mostrar erro
    cy.contains('Email inválido').should('be.visible');
    cy.get('input[name="email"]').should('have.class', 'border-red-500');
  });

  it('mostra erro de CPF inválido em tempo real', () => {
    const cpfInput = cy.get('input[name="cpf"]');

    // Digitar CPF com validação falsa
    cpfInput.type('00000000000');
    cpfInput.blur();

    // Mostrar erro
    cy.contains('CPF inválido').should('be.visible');
  });

  it('mostra sucesso ao digitar dados válidos', () => {
    // Digitar nome válido
    cy.get('input[name="name"]').type('Dr. João da Silva');
    cy.get('input[name="name"]').blur();

    // Mostrar check de sucesso
    cy.get('input[name="name"]').closest('div').find('svg.text-green-500').should('exist');
  });

  it('limpa erro ao corrigir valor', () => {
    // Digitar email inválido
    cy.get('input[name="email"]').type('invalido');
    cy.get('input[name="email"]').blur();

    cy.contains('Email inválido').should('be.visible');

    // Corrigir
    cy.get('input[name="email"]').clear().type('correto@email.com');
    cy.get('input[name="email"]').blur();

    // Erro deve desaparecer
    cy.contains('Email inválido').should('not.exist');
  });
});

/**
 * Testes E2E: Dicas Contextuais
 */
describe('E2E: Dicas Contextuais (SmartTips)', () => {
  beforeEach(() => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();
    cy.visit('/clinica/agenda/nova-consulta');
  });

  it('mostra dica ao focar em campo de profissional', () => {
    cy.get('select[name="professional"]').focus();

    // Aguardar aparição de dica
    cy.contains('Selecione um profissional para ver serviços disponíveis').should('be.visible');
  });

  it('mostra dica específica para campo de data', () => {
    cy.get('input[name="date"]').focus();

    // Deve mostrar dica sobre formato de data
    cy.contains(/data|date|formato/i).should('be.visible');
  });

  it('mostra checklist de pre-requisitos', () => {
    // Deve mostrar checklist
    cy.contains('Checklist da Consulta').should('be.visible');

    // Verificar itens
    cy.contains('✓ Profissional selecionado').should('be.visible');
    cy.contains('Serviço selecionado').should('be.visible');
  });
});

/**
 * Testes E2E: Fluxos de Erro
 */
describe('E2E: Tratamento de Erros', () => {
  it('mostra erro ao falhar submissão', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('admin@example.com');
    cy.get('input[name="password"]').type('senha123');
    cy.get('button[type="submit"]').click();

    // Simular falha de submissão (mock API)
    cy.intercept('POST', '/api/profissionais', {
      statusCode: 500,
      body: { error: 'Erro ao salvar profissional' }
    });

    cy.visit('/clinica/configuracoes/profissionais/novo');

    // Preencher e submeter
    cy.get('input[name="name"]').type('Dr. João');
    cy.get('input[name="cpf"]').type('12345678901');
    cy.get('input[name="birthDate"]').type('15011990');
    cy.get('input[name="email"]').type('joao@example.com');
    cy.get('input[name="phone"]').type('11987654321');

    // Avançar até confirmação
    cy.get('button:contains("Próximo")').click();
    cy.get('button:contains("Próximo")').click();
    cy.get('button:contains("Próximo")').click();

    // Submeter
    cy.get('button:contains("Confirmar")').click();

    // Deve mostrar erro
    cy.contains('Erro ao salvar profissional').should('be.visible');
  });

  it('permite tentar novamente após erro', () => {
    // Após erro, botão deve permitir nova tentativa
    cy.get('button:contains("Tentar Novamente")').should('be.visible');
    cy.get('button:contains("Tentar Novamente")').click();

    // Formulário deve estar pronto para resubmissão
    cy.get('button:contains("Confirmar")').should('be.visible');
  });
});
