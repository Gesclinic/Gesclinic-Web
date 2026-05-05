/**
 * 📚 EXEMPLOS DE USO - Invoice Service
 *
 * Demonstra como usar o invoiceService.js em casos reais
 */

// ============================================================
// IMPORT
// ============================================================

import invoiceService, { INVOICE_STATUS, validateInvoiceData } from '@/lib/invoiceService';

// ============================================================
// EXEMPLO 1: Criar Invoice com Múltiplos Itens
// ============================================================

/**
 * Cenário: Paciente foi atendido com 2 serviços
 * - Consulta (sem equiparação): R$ 200
 * - Cirurgia (com equiparação): R$ 800
 */
export async function example1_createMultiItemInvoice() {
  try {
    const invoiceData = {
      clinicId: 'clinic-uuid-here',
      appointmentId: 'appt-uuid-here',
      patientId: 'patient-uuid-here',
      payerId: 'payer-uuid-here',
      payerType: 'insurance',
      items: [
        {
          serviceId: 'service-consulta-uuid',
          description: 'Consulta Médica',
          amount: 200,
          quantity: 1,
          unitPrice: 200,
          isHospitalService: false, // SEM equiparação
        },
        {
          serviceId: 'service-cirurgia-uuid',
          description: 'Cirurgia Videoscópica',
          amount: 800,
          quantity: 1,
          unitPrice: 800,
          isHospitalService: true, // COM equiparação
        },
      ],
      discountAmount: 0,
      notes: 'Atendimento realizado em 02/05/2026',
    };

    // Validar dados antes
    const errors = validateInvoiceData(invoiceData);
    if (errors.length > 0) {
      console.error('❌ Erros na validação:', errors);
      return;
    }

    // Criar invoice
    const result = await invoiceService.createInvoiceWithItems(invoiceData);

    console.log('✅ Invoice criada:', {
      id: result.invoice.id,
      number: result.invoice.invoice_number,
      status: result.invoice.status,
    });

    console.log('📊 Totais:', {
      gross: `R$ ${result.totals.gross}`,
      discount: `R$ ${result.totals.discount}`,
      taxes: `R$ ${result.totals.taxes}`,
      net: `R$ ${result.totals.net}`,
    });

    console.log(
      '📋 Itens com Tributação:',
      result.items.map((item) => ({
        description: item.description,
        amount: item.amount,
        isHospitalService: item.isHospitalService,
        totalTaxes: `R$ ${item.totalTaxes}`,
        effectiveRate: `${((item.totalTaxes / item.amount) * 100).toFixed(2)}%`,
      })),
    );

    return result;
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

// ============================================================
// EXEMPLO 2: Emitir Invoice e Criar AR
// ============================================================

/**
 * Cenário: Após criar invoice em draft, emitir e gerar Conta a Receber
 */
export async function example2_issueAndCreateAR() {
  try {
    const invoiceId = 'invoice-uuid-from-example1';

    // Emitir invoice + criar AR (fluxo integrado)
    const result = await invoiceService.issueInvoiceAndCreateReceivable(invoiceId);

    console.log('✅ Invoice emitida:', {
      number: result.invoice.invoice_number,
      status: result.invoice.status,
      issueDate: result.invoice.issue_date,
    });

    console.log('✅ AR criada:', {
      id: result.receivable.id,
      amount: `R$ ${result.receivable.amount}`,
      status: result.receivable.status,
      dueDate: result.receivable.data_vencimento,
    });

    return result;
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

// ============================================================
// EXEMPLO 3: Registrar Pagamento
// ============================================================

/**
 * Cenário: Paciente pagou a invoice
 * Pode ser parcelado em múltiplas chamadas
 */
export async function example3_recordPayment() {
  try {
    const invoiceId = 'invoice-uuid-here';

    // Pagamento: R$ 500 dinheiro + R$ 500 PIX

    // Pagamento 1: Dinheiro
    const payment1 = await invoiceService.recordInvoicePayment(
      invoiceId,
      500, // R$ 500
      'dinheiro', // método de pagamento
      new Date(), // data (opcional, default: agora)
    );

    console.log('✅ Pagamento 1 registrado:', {
      method: 'dinheiro',
      amount: 'R$ 500,00',
    });

    // Pagamento 2: PIX
    const payment2 = await invoiceService.recordInvoicePayment(
      invoiceId,
      500, // R$ 500
      'pix',
    );

    console.log('✅ Pagamento 2 registrado:', {
      method: 'pix',
      amount: 'R$ 500,00',
    });

    console.log('✅ Invoice totalmente paga:', {
      total: 'R$ 1.000,00',
      status: INVOICE_STATUS.PAID,
    });

    return { payment1, payment2 };
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

// ============================================================
// EXEMPLO 4: Consultar Invoice com Detalhes
// ============================================================

/**
 * Cenário: Buscar dados completos de uma invoice
 */
export async function example4_getInvoiceDetails() {
  try {
    const invoiceId = 'invoice-uuid-here';

    const invoice = await invoiceService.getInvoiceWithDetails(invoiceId);

    console.log('📄 Invoice:', {
      number: invoice.invoice_number,
      status: invoice.status,
      createdAt: invoice.created_at,
    });

    console.log('💰 Valores:', {
      gross: `R$ ${invoice.gross_amount}`,
      taxes: `R$ ${invoice.total_taxes}`,
      net: `R$ ${invoice.net_amount}`,
    });

    console.log(
      '📋 Itens:',
      invoice.items.map((item, idx) => ({
        [`item_${idx + 1}`]: {
          description: item.description,
          amount: `R$ ${item.amount}`,
          isHospitalService: item.is_hospital_service ? 'Sim (COM equiparação)' : 'Não',
          taxes: {
            irpj: `R$ ${item.irpj_value} (${item.irpj_rate}%)`,
            csll: `R$ ${item.csll_value} (${item.csll_rate}%)`,
            pis: `R$ ${item.pis_value} (${item.pis_rate}%)`,
            cofins: `R$ ${item.cofins_value} (${item.cofins_rate}%)`,
            iss: `R$ ${item.iss_value} (${item.iss_rate}%)`,
          },
          total_taxes: `R$ ${item.total_taxes}`,
        },
      })),
    );

    return invoice;
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

// ============================================================
// EXEMPLO 5: Listar Invoices da Clínica
// ============================================================

/**
 * Cenário: Ver todas as invoices de uma clínica em um período
 */
export async function example5_listInvoices() {
  try {
    const clinicId = 'clinic-uuid-here';

    // Sem filtros (todas)
    const allInvoices = await invoiceService.listInvoices(clinicId);
    console.log(`📊 Total de invoices: ${allInvoices.length}`);

    // Com filtro de status
    const issuedInvoices = await invoiceService.listInvoices(clinicId, {
      status: 'issued',
    });
    console.log(`📊 Emitidas: ${issuedInvoices.length}`);

    // Com filtro de período
    const startDate = '2026-05-01';
    const endDate = '2026-05-31';
    const monthInvoices = await invoiceService.listInvoices(clinicId, {
      startDate,
      endDate,
    });
    console.log(`📊 No período ${startDate} a ${endDate}: ${monthInvoices.length}`);

    // Com filtro de agendamento
    const appointmentId = 'appt-uuid-here';
    const appointmentInvoices = await invoiceService.listInvoices(clinicId, {
      appointmentId,
    });
    console.log(`📊 Do agendamento ${appointmentId}: ${appointmentInvoices.length}`);

    // Mostrar resumo
    monthInvoices.forEach((inv) => {
      console.log(`
        Invoice: ${inv.invoice_number}
        Status: ${inv.status}
        Valor: R$ ${inv.net_amount}
        Data: ${inv.created_at}
      `);
    });

    return { allInvoices, issuedInvoices, monthInvoices };
  } catch (err) {
    console.error('❌ Erro:', err.message);
  }
}

// ============================================================
// EXEMPLO 6: Fluxo Completo (E2E)
// ============================================================

/**
 * Cenário: Workflow completo do atendimento até pagamento
 * Agenda → Faturamento → Emissão → Pagamento
 */
export async function example6_completeWorkflow() {
  try {
    console.log('🚀 INICIANDO FLUXO COMPLETO...\n');

    // PASSO 1: Criar invoice com 2 itens
    console.log('📝 PASSO 1: Criar Invoice...');
    const created = await invoiceService.createInvoiceWithItems({
      clinicId: 'clinic-uuid',
      appointmentId: 'appt-uuid',
      patientId: 'patient-uuid',
      payerId: 'payer-uuid',
      payerType: 'insurance',
      items: [
        {
          serviceId: 'service-1',
          description: 'Consulta',
          amount: 200,
          isHospitalService: false,
        },
        {
          serviceId: 'service-2',
          description: 'Cirurgia',
          amount: 800,
          isHospitalService: true,
        },
      ],
    });

    console.log(`✅ Invoice ${created.invoice.invoice_number} criada (Draft)`);
    console.log(`   Bruto: R$ ${created.totals.gross}`);
    console.log(`   Impostos: R$ ${created.totals.taxes}`);
    console.log(`   Líquido: R$ ${created.totals.net}\n`);

    // PASSO 2: Emitir + Criar AR
    console.log('📄 PASSO 2: Emitir Invoice + Criar AR...');
    const issued = await invoiceService.issueInvoiceAndCreateReceivable(created.invoice.id);

    console.log('✅ Invoice emitida');
    console.log(`✅ AR criada: R$ ${issued.receivable.amount}\n`);

    // PASSO 3: Registrar pagamento
    console.log('💳 PASSO 3: Registrar Pagamento...');
    await invoiceService.recordInvoicePayment(created.invoice.id, 500, 'dinheiro');
    console.log('✅ R$ 500 em dinheiro registrado');

    await invoiceService.recordInvoicePayment(created.invoice.id, 500, 'pix');
    console.log('✅ R$ 500 em PIX registrado\n');

    // PASSO 4: Consultar final
    console.log('🔍 PASSO 4: Consultar Estado Final...');
    const final = await invoiceService.getInvoiceWithDetails(created.invoice.id);

    console.log(`✅ Invoice: ${final.invoice_number}`);
    console.log(`   Status: ${final.status}`);
    console.log(`   Valor: R$ ${final.net_amount}`);
    console.log(`   Itens: ${final.items.length}`);
    console.log('\n🎉 FLUXO COMPLETO FINALIZADO!');

    return {
      created,
      issued,
      final,
    };
  } catch (err) {
    console.error('❌ Erro no fluxo:', err.message);
  }
}

// ============================================================
// USO EM COMPONENTES REACT
// ============================================================

/**
 * Exemplo de uso em componente React
 */

export function InvoiceEmissionComponent({ appointmentId }) {
  const [loading, setLoading] = React.useState(false);
  const [invoice, setInvoice] = React.useState(null);
  const [error, setError] = React.useState(null);

  const handleCreateInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Aqui você buscaria os dados do agendamento
      const appointmentData = await fetchAppointmentData(appointmentId);

      // Criar invoice
      const result = await invoiceService.createInvoiceWithItems({
        clinicId: appointmentData.clinic_id,
        appointmentId,
        patientId: appointmentData.patient_id,
        payerId: appointmentData.payer_id,
        payerType: 'insurance',
        items: appointmentData.services.map((svc) => ({
          serviceId: svc.id,
          description: svc.name,
          amount: svc.price,
          isHospitalService: svc.is_hospital_service,
        })),
      });

      setInvoice(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleIssueInvoice = async () => {
    try {
      setLoading(true);
      const result = await invoiceService.issueInvoiceAndCreateReceivable(invoice.invoice.id);
      setInvoice({
        ...invoice,
        invoice: result.invoice,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Emissão de Invoice</h2>

      {invoice && (
        <div className="border rounded-lg p-4 space-y-2">
          <p className="font-semibold">Invoice {invoice.invoice.invoice_number}</p>
          <p>Status: {invoice.invoice.status}</p>
          <p>Valor: R$ {invoice.totals.net}</p>
        </div>
      )}

      <button
        onClick={handleCreateInvoice}
        disabled={loading || invoice}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Criando...' : 'Criar Invoice'}
      </button>

      {invoice && invoice.invoice.status === 'draft' && (
        <button
          onClick={handleIssueInvoice}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          {loading ? 'Emitindo...' : 'Emitir e Criar AR'}
        </button>
      )}

      {error && <div className="text-red-600 p-4 bg-red-50 rounded">{error}</div>}
    </div>
  );
}

// ============================================================
// TESTES UNITÁRIOS
// ============================================================

/**
 * Testes básicos do invoiceService
 */

export const tests = {
  // Teste 1: Validação de dados
  testValidation: async () => {
    console.log('\n🧪 Teste 1: Validação de Dados');

    // Dados inválidos (faltam itens)
    const invalidData = {
      clinicId: 'clinic-1',
      appointmentId: 'appt-1',
      patientId: 'patient-1',
      payerId: 'payer-1',
      items: [], // Vazio!
    };

    const errors = validateInvoiceData(invalidData);
    console.log(`Erros encontrados: ${errors.length}`);
    console.log(`✅ Teste passou: ${errors.length > 0 ? 'Sim' : 'Não'}`);
  },

  // Teste 2: Criar invoice
  testCreateInvoice: example1_createMultiItemInvoice,

  // Teste 3: Fluxo completo
  testCompleteFlow: example6_completeWorkflow,
};

export default {
  example1_createMultiItemInvoice,
  example2_issueAndCreateAR,
  example3_recordPayment,
  example4_getInvoiceDetails,
  example5_listInvoices,
  example6_completeWorkflow,
  InvoiceEmissionComponent,
  tests,
};
