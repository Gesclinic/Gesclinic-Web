import { describe, expect, it } from 'vitest';
import { mapGuiaFromDatabase, mapGuiaToDatabase } from '../../src/lib/mappers.js';
import { validateGuiaPayload } from '../../src/lib/validators.js';
import { buildReceivablePayloadFromGuide } from '../../src/lib/faturamentoOperationalApi.js';
import { getUnlinkedBillingGuides } from '../../src/lib/faturamentoReportsApi.js';

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
});