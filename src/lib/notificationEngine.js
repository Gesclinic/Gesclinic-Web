import Mustache from 'mustache';

export function renderPreview(template, data) {
  return Mustache.render(template, data);
}

export function sampleVariables() {
  return {
    paciente: {
      nome: 'Maria Clara',
      email: 'teste@teste.com',
      phone: '44999999999',
    },
    clinica: { nome: 'Clínica Exemplo' },
    agenda: {
      data: '2025-01-01',
      hora: '14:00',
      profissional: 'Dr. João Silva',
    },
    orcamento: {
      valor_final: '250,00',
    },
  };
}
