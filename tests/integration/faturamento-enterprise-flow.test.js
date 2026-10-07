import { describe, expect, it } from 'vitest';
import { mapGuiaFromDatabase, mapGuiaToDatabase } from '../../src/lib/mappers.js';
import { validateGuiaPayload } from '../../src/lib/validators.js';
import {
  buildBillingBatchKey,
  buildReceivablePayloadFromGuide,
  evaluateConventionRulesForGuide,
} from '../../src/lib/faturamentoOperationalApi.js';
import { getUnlinkedBillingGuides } from '../../src/lib/faturamentoReportsApi.js';
import { canTransitionBillingBatch, getBillingPayerIdentity } from '../../src/lib/billingOperationsApi.js';
import { classifyBillingWorkItem } from '../../src/lib/billingMasterApi.js';

const clinicId = '11111111-1111-4111-8111-111111111111';

function buildGuide(tipoGuia) {
  return {
    clinic_id: clinicId,
    tipo_guia: tipoGuia,
    numero_guia: `GUIA-${tipoGuia}-001`,
    paciente_nome: 'Paciente Homologacao',
    convenio: 'Operadora Real Configurada',
    plano: 'Plano TISS',
    numero_carteirinha: 'MAT-123456',
    profissional: 'Dr. Responsavel Tecnico',
    codigo_cbhpm: '10101012',
    valor: '180.50',
    observacoes: 'Fluxo de faturamento enterprise',
  };
}

describe('Faturamento enterprise TISS flow', () => {
  it('separa convenios pelo identificador mesmo quando possuem o mesmo nome', () => {
    const first = getBillingPayerIdentity({ payer_id: 'payer-001', convenio: 'Unimed' });
    const second = getBillingPayerIdentity({ payer_id: 'payer-002', convenio: 'Unimed' });

    expect(first.name).toBe(second.name);
    expect(first.key).not.toBe(second.key);
  });

  it('usa regras padrao quando a guia nao possui regra de convenio', () => {
    const result = evaluateConventionRulesForGuide(buildGuide('SADT'), []);

    expect(result).toMatchObject({ valid: true, rule: null, issues: [] });
  });

  it('bloqueia pre-faturamento quando autorizacao, TUSS e documentos obrigatorios faltam', () => {
    const result = classifyBillingWorkItem({
      appointment: { patient_id: 'patient-1', payer_id: 'payer-1' },
      service: { value: 180, services: { name: 'Consulta' } },
      payerSetting: { requires_eligibility: true, requires_authorization: true, requires_tuss: true },
      documentRequirements: [{ required: true, blocks_billing: true }],
    });

    expect(result.status).toBe('blocked');
    expect(result.blockerCodes).toEqual(
      expect.arrayContaining(['TUSS_AUSENTE', 'AUTORIZACAO_AUSENTE', 'DOCUMENTOS_PENDENTES']),
    );
    expect(result.eligibilityStatus).toBe('pending');
  });

  it('mantem servico apto para revisao quando regras e valor estao completos', () => {
    const result = classifyBillingWorkItem({
      appointment: { patient_id: 'patient-1', payer_id: 'payer-1' },
      service: { value: 180, services: { tuss_code: '10101012' } },
      payerSetting: { requires_eligibility: false, requires_authorization: false, requires_tuss: true },
      documentRequirements: [],
    });

    expect(result).toMatchObject({
      status: 'pending',
      blockerCodes: [],
      eligibilityStatus: 'waived',
      authorizationStatus: 'waived',
      documentStatus: 'waived',
      valueStatus: 'valid',
    });
  });

  it.each(['SP', 'SADT', 'Internação'])('valida e mapeia guia %s para billing_guides', (tipoGuia) => {
    const payload = buildGuide(tipoGuia);

    expect(() => validateGuiaPayload(payload)).not.toThrow();

    const dbPayload = mapGuiaToDatabase(payload);

    expect(dbPayload).toMatchObject({
      clinic_id: clinicId,
      tipo_guia: tipoGuia,
      numero_guia: payload.numero_guia,
      paciente_nome: payload.paciente_nome,
      numero_carteirinha: payload.numero_carteirinha,
      status: 'Aguardando XML',
      valor: 180.5,
    });
    expect(dbPayload.data_criacao).toBeTruthy();
    expect(dbPayload.data_atualizacao).toBeTruthy();
  });

  it('retorna o shape esperado pela tela de guias', () => {
    const guia = mapGuiaFromDatabase({
      id: 'guide-001',
      clinic_id: clinicId,
      numero_guia: 'GUIA-SADT-001',
      tipo_guia: 'SADT',
      status: 'XML Gerado',
      paciente_nome: 'Paciente Homologacao',
      numero_carteirinha: 'MAT-123456',
      convenio: 'Operadora Real Configurada',
      plano: 'Plano TISS',
      profissional: 'Dr. Responsavel Tecnico',
      codigo_cbhpm: '10101012',
      valor: 180.5,
      observacoes: null,
      xml_path: 'tiss/lotes/GUIA-SADT-001.xml',
      data_criacao: '2026-02-01T10:00:00.000Z',
      data_atualizacao: '2026-02-01T10:10:00.000Z',
    });

    expect(guia).toMatchObject({
      id: 'guide-001',
      clinicId,
      numero_guia: 'GUIA-SADT-001',
      tipo: 'SADT',
      tipo_guia: 'SADT',
      paciente_nome: 'Paciente Homologacao',
      valor: 180.5,
      xml_path: 'tiss/lotes/GUIA-SADT-001.xml',
    });
  });

  it('bloqueia tipos que nao pertencem ao fluxo TISS implementado', () => {
    expect(() => validateGuiaPayload(buildGuide('RPS'))).toThrow('Tipo de guia inválido');
  });

  it('preserva os vinculos da Agenda e a base de repasse no recebivel', () => {
    const payload = buildReceivablePayloadFromGuide({
      ...buildGuide('SADT'),
      id: 'guide-001',
      appointment_id: 'appointment-001',
      patient_id: 'patient-001',
      professional_id: 'professional-001',
      payer_id: 'payer-001',
      billing_batch_key: 'LOT-PAYER-001',
      service_id: 'service-001',
      repasse_expected: 54.15,
      repasse_model: 'appointment_services',
    });

    expect(payload).toMatchObject({
      appointment_id: 'appointment-001',
      patient_id: 'patient-001',
      professional_id: 'professional-001',
      payer_id: 'payer-001',
      convenio_id: 'payer-001',
      batch_number: 'LOT-PAYER-001',
      procedure_id: 'service-001',
      repasse_expected: 54.15,
      repasse_model: 'appointment_services',
    });
    expect(payload.metadata).toMatchObject({
      guide_id: 'guide-001',
      appointment_id: 'appointment-001',
      professional_id: 'professional-001',
    });
  });

  it('nao duplica no relatorio uma guia que ja possui recebivel', () => {
    const guides = [
      { id: 'guide-001', numero_guia: 'GUIA-SADT-001', valor: 180.5 },
      { id: 'guide-002', numero_guia: 'GUIA-SADT-002', valor: 90 },
    ];
    const invoices = [{ id: 'invoice-001', guide_number: 'guia-sadt-001', net_value: 180.5 }];

    expect(getUnlinkedBillingGuides(guides, invoices)).toEqual([guides[1]]);
  });

  it('mantem uma chave de lote estavel para todas as guias', () => {
    const guides = [
      { id: 'guide-001', convenio: 'Operadora Integrada' },
      { id: 'guide-002', convenio: 'Operadora Integrada' },
    ];

    expect(buildBillingBatchKey(guides, {
      date: '2026-10-06',
      suffix: '000123',
    })).toBe('20261006-OPERADORA-INTEGRADA-000123');

    expect(buildBillingBatchKey([
      { ...guides[0], billing_batch_key: 'LOTE-JA-FECHADO' },
      guides[1],
    ])).toBe('LOTE-JA-FECHADO');
  });

  it('bloqueia saltos de status que quebram a rastreabilidade do lote', () => {
    expect(canTransitionBillingBatch('draft', 'closed')).toBe(true);
    expect(canTransitionBillingBatch('closed', 'xml_generated')).toBe(true);
    expect(canTransitionBillingBatch('draft', 'paid')).toBe(false);
    expect(canTransitionBillingBatch('sent', 'reopened')).toBe(false);
  });
});