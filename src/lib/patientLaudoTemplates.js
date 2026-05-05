export const LAUDO_TYPE_OPTIONS = [
  {
    value: 'avaliacao_clinica',
    label: 'Avaliação clínica',
    description: 'Laudo com contexto, exame físico e conclusão clínica.',
  },
  {
    value: 'resultado_exame',
    label: 'Resultado de exame',
    description: 'Modelo para interpretação e conclusão de exame complementar.',
  },
  {
    value: 'evolucao_clinica',
    label: 'Evolução clínica',
    description: 'Resumo da resposta terapêutica e evolução do quadro.',
  },
  {
    value: 'alta_medica',
    label: 'Alta médica',
    description: 'Documento de encerramento com orientações finais ao paciente.',
  },
  {
    value: 'parecer_medico',
    label: 'Parecer médico',
    description: 'Modelo para opinião técnica ou segunda avaliação.',
  },
  {
    value: 'personalizado',
    label: 'Personalizado',
    description: 'Estrutura livre para casos especiais.',
  },
];

export const LAUDO_STATUS_OPTIONS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'assinado', label: 'Assinado' },
  { value: 'publicado', label: 'Publicado no portal' },
  { value: 'cancelado', label: 'Cancelado' },
];

const TEMPLATE_MAP = {
  avaliacao_clinica: {
    title: 'Laudo de avaliação clínica',
    sections: [
      '1. Identificação e contexto clínico',
      '2. Principais achados do exame físico',
      '3. Hipótese diagnóstica / impressão clínica',
      '4. Conduta e orientações',
    ],
  },
  resultado_exame: {
    title: 'Laudo de resultado de exame',
    sections: [
      '1. Exame realizado',
      '2. Técnica / metodologia',
      '3. Achados relevantes',
      '4. Conclusão',
    ],
  },
  evolucao_clinica: {
    title: 'Laudo de evolução clínica',
    sections: [
      '1. Motivo da reavaliação',
      '2. Evolução do quadro',
      '3. Resposta terapêutica',
      '4. Próximos passos',
    ],
  },
  alta_medica: {
    title: 'Laudo de alta médica',
    sections: [
      '1. Resumo da internação / acompanhamento',
      '2. Condição clínica no momento da alta',
      '3. Medicações e orientações',
      '4. Retorno / sinais de alerta',
    ],
  },
  parecer_medico: {
    title: 'Parecer médico',
    sections: [
      '1. Solicitação / pergunta clínica',
      '2. Análise técnica',
      '3. Parecer conclusivo',
      '4. Recomendações',
    ],
  },
  personalizado: {
    title: 'Laudo clínico',
    sections: ['1. Contexto', '2. Descrição', '3. Conclusão'],
  },
};

export function getLaudoTypeConfig(type) {
  return TEMPLATE_MAP[type] || TEMPLATE_MAP.personalizado;
}

export function buildLaudoTemplate(type, patientName = '') {
  const config = getLaudoTypeConfig(type);
  const patientLine = patientName ? `Paciente: ${patientName}\n` : '';
  const content = [patientLine, ...config.sections.map((section) => `${section}\n`)]
    .join('\n')
    .trim();

  return {
    title: config.title,
    content,
    metadata: {
      template_type: type,
      template_sections: config.sections,
    },
  };
}

export function summarizeLaudoContent(content = '') {
  return content.replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function getLaudoTypeLabel(type) {
  return LAUDO_TYPE_OPTIONS.find((option) => option.value === type)?.label || 'Laudo';
}

export function normalizeLetterhead(letterhead = {}) {
  return {
    clinic_display_name: letterhead.clinic_display_name || '',
    clinic_logo_url: letterhead.clinic_logo_url || '',
    clinic_address_line: letterhead.clinic_address_line || '',
    clinic_contact_line: letterhead.clinic_contact_line || '',
    professional_display_name: letterhead.professional_display_name || '',
    professional_title_line: letterhead.professional_title_line || '',
    professional_address_line: letterhead.professional_address_line || '',
    professional_contact_line: letterhead.professional_contact_line || '',
  };
}

export function buildLetterheadText(letterhead = {}) {
  const normalized = normalizeLetterhead(letterhead);
  const lines = [
    normalized.clinic_display_name,
    normalized.clinic_address_line,
    normalized.clinic_contact_line,
    normalized.professional_display_name,
    normalized.professional_title_line,
    normalized.professional_address_line,
    normalized.professional_contact_line,
  ].filter(Boolean);

  return lines.join('\n');
}

export function applyTemplateWithLetterhead({ template, patientName = '', letterhead = null }) {
  const resolvedTemplate = template || buildLaudoTemplate('personalizado', patientName);
  const resolvedLetterhead = normalizeLetterhead(letterhead || resolvedTemplate.letterhead || {});
  const body = resolvedTemplate.content_template || resolvedTemplate.content || '';
  const patientLine = patientName ? `Paciente: ${patientName}` : '';
  const contentParts = [patientLine, body].filter(Boolean);

  return {
    title: resolvedTemplate.title_template || resolvedTemplate.title || 'Laudo clínico',
    content: contentParts.join('\n\n').trim(),
    letterhead: resolvedLetterhead,
  };
}
