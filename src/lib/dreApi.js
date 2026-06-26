import { supabase } from '@/lib/customSupabaseClient.js';
import { listReceivables } from '@/lib/receivablesApi.js';
import { listAPQuery } from '@/lib/financeApi.js';
import { getCashFlowByCategory } from '@/lib/cashflowApi.js';
import { getFinancialConsolidation } from '@/lib/financialConsolidationApi.js';

// Tax calculation constants per regime
// Hospital equivalence reduces the presumed tax base significantly
// ISS (3%) is separated: can be retained at source or included as expense
const TAX_RATES = {
  simples_nacional: {
    // Simples Nacional: taxa única de ~9% para serviços de saúde
    total: 0.09,
    normal: { PIS: 0, COFINS: 0, CSLL: 0, IRPJ: 0 },
    hospital: { PIS: 0, COFINS: 0, CSLL: 0, IRPJ: 0 }, // Sem benefício no Simples
    iss: 0.03, // ISS municipal separado (3%)
  },
  lucro_presumido: {
    // Lucro Presumido: bases normais vs hospital equivalence
    // ISS (3%) é separado - às vezes retido, às vezes não
    normal: {
      IRPJ: 0.048, // 15% × 32% = 4.8%
      CSLL: 0.0288, // 9% × 32% = 2.88%
      PIS: 0.0065, // 0.65%
      COFINS: 0.03, // 3%
      totalFederal: 0.048 + 0.0288 + 0.0065 + 0.03, // 11.33%
    },
    hospital: {
      // Hospital equivalence: IRPJ base 8%, CSLL base 12% (vs 32% normal)
      IRPJ: 0.012, // 15% × 8% = 1.2%
      CSLL: 0.0108, // 9% × 12% = 1.08%
      PIS: 0.0065, // 0.65% (sem redução)
      COFINS: 0.03, // 3% (sem redução)
      totalFederal: 0.012 + 0.0108 + 0.0065 + 0.03, // 5.93%
    },
    iss: 0.03, // ISS municipal separado (3%)
  },
  lucro_real: {
    // Lucro Real: bases normais vs hospital equivalence
    // ISS (3%) é separado - às vezes retido, às vezes não
    normal: {
      IRPJ: 0.03, // 15% × 20% = 3%
      CSLL: 0.018, // 9% × 20% = 1.8%
      PIS: 0.0065, // 0.65%
      COFINS: 0.03, // 3%
      totalFederal: 0.03 + 0.018 + 0.0065 + 0.03, // 8.98%
    },
    hospital: {
      // Hospital equivalence: 5% profit base (vs 20% normal)
      IRPJ: 0.0075, // 15% × 5% = 0.75%
      CSLL: 0.0045, // 9% × 5% = 0.45%
      PIS: 0.0065, // 0.65% (sem redução)
      COFINS: 0.03, // 3% (sem redução)
      totalFederal: 0.0075 + 0.0045 + 0.0065 + 0.03, // 5.54%
    },
    iss: 0.03, // ISS municipal separado (3%)
  },
};

/**
 * Get clinic tax regime and ISS rate
 */
async function getClinicTaxInfo(clinicId) {
  try {
    const { data, error } = await supabase
      .from('clinics')
      .select('tax_regime, iss_rate')
      .eq('id', clinicId)
      .single();

    if (error) throw error;
    
    const regime = data?.tax_regime || 'simples_nacional';
    // Normalize ISS rate: if it's > 1, assume it's percentage (3 = 3%), convert to decimal
    // 0 = ISS retido na fonte, 3 ou 0.03 = ISS não retido
    let issRate = data?.iss_rate || 3; // Default 3% if not set
    if (issRate > 1) {
      issRate = issRate / 100; // Convert 3 → 0.03
    }
    
    return { regime, issRate };
  } catch (err) {
    console.warn('⚠️ Could not fetch clinic tax info, using defaults:', err.message);
    return { regime: 'simples_nacional', issRate: 0.03 }; // ISS 3% default
  }
}

/**
 * Calculate total tax rate for a given regime and hospital equivalence
 * issRate: 0.03 (3%) normal, 0 se retido na fonte
 */
function calculateTotalTaxRate(regime, isHospital = false, issRate = 0.03) {
  const rates = TAX_RATES[regime] || TAX_RATES.simples_nacional;
  
  if (regime === 'simples_nacional') {
    return rates.total; // Simples não tem benefício de equiparação
  }
  
  const taxType = isHospital ? 'hospital' : 'normal';
  const taxRateSet = rates[taxType];
  // Federais + ISS (se não retido)
  return taxRateSet.totalFederal + (issRate || 0);
}

/**
 * Calculate tax details for a given revenue amount with hospital equivalence
 * issRate: 0.03 (3%) normal, 0 se retido na fonte
 */
function calculateTaxDetails(amount, regime, isHospital = false, issRate = 0.03) {
  const rates = TAX_RATES[regime] || TAX_RATES.simples_nacional;
  
  if (regime === 'simples_nacional') {
    return {
      total: amount * rates.total,
      PIS: 0,
      COFINS: 0,
      CSLL: 0,
      IRPJ: 0,
      ISSQN: 0,
    };
  }
  
  const taxType = isHospital ? 'hospital' : 'normal';
  const taxRateSet = rates[taxType];
  
  const issAmount = amount * (issRate || 0);
  
  return {
    total: amount * taxRateSet.totalFederal + issAmount,
    PIS: amount * taxRateSet.PIS,
    COFINS: amount * taxRateSet.COFINS,
    CSLL: amount * taxRateSet.CSLL,
    IRPJ: amount * taxRateSet.IRPJ,
    ISSQN: issAmount, // ISS separado
  };
}

/**
 * Fetch invoice items with hospital equivalence info to calculate taxes accurately
 */
async function fetchInvoiceItemsWithHospitalInfo(clinicId) {
  try {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*, invoices(invoice_date, service_category)')
      .eq('invoices.clinic_id', clinicId)
      .limit(1000);
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn('⚠️ Could not fetch invoice items, using receivables fallback:', err.message);
    return [];
  }
}

/**
 * 📈 Dados completos da DRE
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início (YYYY-MM-DD)
 * @param {string} endDate - Data fim (YYYY-MM-DD)
 * @returns {Promise<Object>} DRE estruturada com receitas, custos, despesas, impostos, lucros, margens
 */
export async function getDREData(clinicId, startDate, endDate) {
  try {
    const consolidated = await getFinancialConsolidation(clinicId, startDate, endDate);
    if (consolidated) {
      const receitasTotal = consolidated.revenue.grossRevenue;
      const valorLiquido = consolidated.revenue.netRevenue;
      const deducoes = consolidated.revenue.discounts + consolidated.revenue.taxes;
      const taxaCartao = consolidated.revenue.cardFees;
      const custosOperacionais = consolidated.expenses.operational;
      const despesasAdministrativas = consolidated.expenses.administrative;
      const despesasFinanceiras = consolidated.expenses.financial;
      const despesasTotal = consolidated.expenses.totalOperating + consolidated.expenses.financial;
      const ebitda = consolidated.result.ebitda;
      const lucroOperacional = consolidated.result.operatingIncome;
      const lucroLiquido = consolidated.result.netIncome;

      return {
        receitas: {
          total: Number(receitasTotal.toFixed(2)),
          valor_liquido: Number(valorLiquido.toFixed(2)),
          deducoes: Number(deducoes.toFixed(2)),
          descontos: Number(consolidated.revenue.discounts.toFixed(2)),
          taxa_cartao: Number(taxaCartao.toFixed(2)),
          quantidade: consolidated.revenue.receivableCount,
          valor_medio: consolidated.revenue.receivableCount > 0
            ? Number((receitasTotal / consolidated.revenue.receivableCount).toFixed(2))
            : 0,
        },
        custos_operacionais: {
          total: Number(custosOperacionais.toFixed(2)),
          quantidade: consolidated.payables.filter((row) => row && row.id).length,
        },
        despesas_administrativas: {
          total: Number(despesasAdministrativas.toFixed(2)),
          financeiras: Number(despesasFinanceiras.toFixed(2)),
          total_com_financeiras: Number((despesasAdministrativas + despesasFinanceiras).toFixed(2)),
          quantidade: consolidated.expenses.payableCount,
        },
        impostos: {
          regime: 'consolidado',
          total: Number(consolidated.revenue.taxes.toFixed(2)),
          percentual_sobre_receita: receitasTotal > 0 ? Number(((consolidated.revenue.taxes / receitasTotal) * 100).toFixed(2)) : 0,
          aliquotas: { pis: 0, cofins: 0, csll: 0, ir: 0, issqn: 0 },
          detalhes: { pis: 0, cofins: 0, csll: 0, ir: 0, issqn: Number(consolidated.revenue.taxes.toFixed(2)) },
        },
        lucros: {
          ebitda: Number(ebitda.toFixed(2)),
          operacional: Number(lucroOperacional.toFixed(2)),
          liquido: Number(lucroLiquido.toFixed(2)),
        },
        margens: {
          bruta: Number(consolidated.result.grossMarginPct.toFixed(2)),
          operacional: Number(consolidated.result.ebitdaMarginPct.toFixed(2)),
          liquida: Number(consolidated.result.netMarginPct.toFixed(2)),
        },
        periodo: {
          inicio: startDate,
          fim: endDate,
          dias: getDaysDiff(startDate, endDate),
        },
        layout: {
          receita_total: receitasTotal,
          menos_deducoes: deducoes,
          menos_taxas_cartao: taxaCartao,
          menos_custos: custosOperacionais,
          ebitda_valor: ebitda,
          menos_despesas: despesasTotal,
          lucro_operacional: lucroOperacional,
          menos_impostos: consolidated.revenue.taxes,
          lucro_liquido: lucroLiquido,
        },
      };
    }

    const { data: dynamicDre, error: dynamicError } = await supabase.rpc('calculate_dre_for_period', {
      p_clinic_id: clinicId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_competence_type: 'accrual',
    });

    if (!dynamicError && dynamicDre) {
      const receitasTotal = Number(dynamicDre.revenue?.gross_revenue || 0);
      const valorLiquido = Number(dynamicDre.revenue?.net_revenue || 0);
      const custosOperacionais = Number(dynamicDre.costs_and_profit?.cogs || 0);
      const despesasAdministrativas = Number(dynamicDre.expenses?.total_operating_expense || 0);
      const totalImpostos = Number(dynamicDre.result?.tax_expense || 0);
      const ebitda = Number(dynamicDre.result?.ebitda || 0);
      const lucroLiquido = Number(dynamicDre.result?.net_income || 0);
      const lucroOperacional = ebitda;

      return {
        receitas: {
          total: Number(receitasTotal.toFixed(2)),
          valor_liquido: Number(valorLiquido.toFixed(2)),
          quantidade: receitasTotal > 0 ? 1 : 0,
          valor_medio: Number(receitasTotal.toFixed(2)),
        },
        custos_operacionais: {
          total: Number(custosOperacionais.toFixed(2)),
          quantidade: custosOperacionais > 0 ? 1 : 0,
        },
        despesas_administrativas: {
          total: Number(despesasAdministrativas.toFixed(2)),
          quantidade: despesasAdministrativas > 0 ? 1 : 0,
        },
        impostos: {
          regime: 'dinamico',
          total: Number(totalImpostos.toFixed(2)),
          percentual_sobre_receita: receitasTotal > 0 ? Number(((totalImpostos / receitasTotal) * 100).toFixed(2)) : 0,
          aliquotas: { pis: 0, cofins: 0, csll: 0, ir: 0, issqn: 0 },
          detalhes: { pis: 0, cofins: 0, csll: 0, ir: 0, issqn: Number(totalImpostos.toFixed(2)) },
        },
        lucros: {
          ebitda: Number(ebitda.toFixed(2)),
          operacional: Number(lucroOperacional.toFixed(2)),
          liquido: Number(lucroLiquido.toFixed(2)),
        },
        margens: {
          bruta: Number(dynamicDre.costs_and_profit?.gross_profit_margin || 0),
          operacional: Number(dynamicDre.result?.ebitda_margin || 0),
          liquida: Number(dynamicDre.result?.net_margin || 0),
        },
        periodo: {
          inicio: startDate,
          fim: endDate,
          dias: getDaysDiff(startDate, endDate),
        },
        layout: {
          receita_total: receitasTotal,
          menos_custos: custosOperacionais,
          ebitda_valor: ebitda,
          menos_despesas: despesasAdministrativas,
          lucro_operacional: lucroOperacional,
          menos_impostos: totalImpostos,
          lucro_liquido: lucroLiquido,
        },
      };
    }

    // Get clinic tax regime info
    const { regime, issRate } = await getClinicTaxInfo(clinicId);
    const taxRates = TAX_RATES[regime] || TAX_RATES.simples_nacional;
    
    // Buscar recebíveis (RECEITAS)
    const receivables = await listReceivables({
      clinicId,
      emissionStart: startDate,
      emissionEnd: endDate,
      limit: 1000,
    });

    // Try to fetch invoice items with hospital equivalence info
    const invoiceItems = await fetchInvoiceItemsWithHospitalInfo(clinicId);
    
    // Buscar contas a pagar pagas (CUSTOS E DESPESAS)
    const payables = await listAPQuery({
      clinicId,
      statusList: ['paid'],
      start: startDate,
      end: endDate,
      limit: 1000,
    });

    // Calcular totais de receita
    const totalReceitas = receivables.reduce((sum, r) => sum + Number(r.amount || 0), 0);

    // Calcular impostos considerando equiparação hospitalar por item
    let totalImpostos = 0;
    let impostosDetalhes = {
      pis: 0,
      cofins: 0,
      csll: 0,
      ir: 0,
      issqn: 0,
    };
    
    if (invoiceItems.length > 0) {
      // Use invoice items para cálculo preciso com equiparação hospitalar
      invoiceItems.forEach((item) => {
        // Consultas NUNCA têm equiparação hospitalar
        const serviceCategory = item.invoices?.service_category || 'other';
        const isConsultation = serviceCategory.toLowerCase() === 'consultation' || serviceCategory.toLowerCase() === 'consulta';
        
        // Determinar se aplica equiparação hospitalar
        // Consultas: nunca
        // Outros: usar is_hospital_service se disponível
        const isHospitalService = !isConsultation && (item.is_hospital_service === true);
        
        const amount = Number(item.amount || item.unit_price || 0) * Number(item.quantity || 1);
        const taxCalc = calculateTaxDetails(amount, regime, isHospitalService, issRate);
        
        totalImpostos += taxCalc.total;
        impostosDetalhes.pis += taxCalc.PIS;
        impostosDetalhes.cofins += taxCalc.COFINS;
        impostosDetalhes.csll += taxCalc.CSLL;
        impostosDetalhes.ir += taxCalc.IRPJ;
        impostosDetalhes.issqn += taxCalc.ISSQN;
      });
    } else {
      // Fallback: calcular impostos sobre total de receitas (sem equiparação detalhada)
      const taxCalc = calculateTaxDetails(totalReceitas, regime, false, issRate);
      totalImpostos = taxCalc.total;
      impostosDetalhes = {
        pis: taxCalc.PIS,
        cofins: taxCalc.COFINS,
        csll: taxCalc.CSLL,
        ir: taxCalc.IRPJ,
        issqn: taxCalc.ISSQN,
      };
    }

    // Separar custos (category.type='cost') vs despesas (category.type='expense')
    const custosOperacionais = payables
      .filter((p) => isExpenseType(p, 'cost'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const despesasAdministrativas = payables
      .filter((p) => isExpenseType(p, 'expense'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // Lucros
    const ebitda = totalReceitas - custosOperacionais;
    const lucroOperacional = ebitda - despesasAdministrativas;
    const lucroLiquido = lucroOperacional - totalImpostos;

    // Margens
    const margemBruta = totalReceitas > 0 ? (ebitda / totalReceitas) * 100 : 0;
    const margemOperacional = totalReceitas > 0 ? (lucroOperacional / totalReceitas) * 100 : 0;
    const margemLiquida = totalReceitas > 0 ? (lucroLiquido / totalReceitas) * 100 : 0;

    // Valor líquido dos recebíveis
    const valorLiquido = receivables.reduce((sum, r) => sum + Number(r.net_value || 0), 0);

    return {
      // RECEITAS
      receitas: {
        total: Number(totalReceitas.toFixed(2)),
        valor_liquido: Number(valorLiquido.toFixed(2)),
        quantidade: receivables.length,
        valor_medio: receivables.length > 0 ? Number((totalReceitas / receivables.length).toFixed(2)) : 0,
      },

      // CUSTOS OPERACIONAIS
      custos_operacionais: {
        total: Number(custosOperacionais.toFixed(2)),
        quantidade: payables.filter((p) => isExpenseType(p, 'cost')).length,
      },

      // DESPESAS ADMINISTRATIVAS
      despesas_administrativas: {
        total: Number(despesasAdministrativas.toFixed(2)),
        quantidade: payables.filter((p) => isExpenseType(p, 'expense')).length,
      },

      // IMPOSTOS (conforme regime tributário da clínica)
      impostos: {
        regime: regime,
        total: Number(totalImpostos.toFixed(2)),
        percentual_sobre_receita: totalReceitas > 0 ? Number(((totalImpostos / totalReceitas) * 100).toFixed(2)) : 0,
        aliquotas: {
          pis: totalReceitas > 0 ? Number(((impostosDetalhes.pis / totalReceitas) * 100).toFixed(2)) : 0,
          cofins: totalReceitas > 0 ? Number(((impostosDetalhes.cofins / totalReceitas) * 100).toFixed(2)) : 0,
          csll: totalReceitas > 0 ? Number(((impostosDetalhes.csll / totalReceitas) * 100).toFixed(2)) : 0,
          ir: totalReceitas > 0 ? Number(((impostosDetalhes.ir / totalReceitas) * 100).toFixed(2)) : 0,
          issqn: totalReceitas > 0 ? Number(((impostosDetalhes.issqn / totalReceitas) * 100).toFixed(2)) : 0,
        },
        detalhes: {
          pis: Number(impostosDetalhes.pis.toFixed(2)),
          cofins: Number(impostosDetalhes.cofins.toFixed(2)),
          csll: Number(impostosDetalhes.csll.toFixed(2)),
          ir: Number(impostosDetalhes.ir.toFixed(2)),
          issqn: Number(impostosDetalhes.issqn.toFixed(2)),
        },
      },

      // LUCROS
      lucros: {
        ebitda: Number(ebitda.toFixed(2)),
        operacional: Number(lucroOperacional.toFixed(2)),
        liquido: Number(lucroLiquido.toFixed(2)),
      },

      // MARGENS (%)
      margens: {
        bruta: Number(margemBruta.toFixed(2)),
        operacional: Number(margemOperacional.toFixed(2)),
        liquida: Number(margemLiquida.toFixed(2)),
      },

      // METADATA
      periodo: {
        inicio: startDate,
        fim: endDate,
        dias: getDaysDiff(startDate, endDate),
      },

      // Para visualização
      layout: {
        receita_total: totalReceitas,
        menos_custos: custosOperacionais,
        ebitda_valor: ebitda,
        menos_despesas: despesasAdministrativas,
        lucro_operacional: lucroOperacional,
        menos_impostos: totalImpostos,
        lucro_liquido: lucroLiquido,
      },
    };
  } catch (err) {
    console.error('getDREData error:', err);
    throw err;
  }
}

/**
 * 💰 Receitas por serviço
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início
 * @param {string} endDate - Data fim
 * @returns {Promise<Array>} Array com {servico, quantidade, valor_medio, total, percentual}
 */
export async function getRevenueByService(clinicId, startDate, endDate) {
  const consolidated = await getFinancialConsolidation(clinicId, startDate, endDate);
  const receivables = consolidated.receivables || [];
  const manualRevenues = (consolidated.transactions || []).filter((item) => {
    const type = String(item.type || '').toLowerCase();
    const transactionType = String(item.transaction_type || '').toUpperCase();
    return type === 'revenue' || type === 'income' || transactionType === 'INCOME';
  });

  const byService = {};
  receivables.forEach((r) => {
    const service = r.service_name || r.service_description || r.description || 'Não especificado';
    if (!byService[service]) {
      byService[service] = { total: 0, count: 0, items: [] };
    }
    byService[service].total += Number(r.gross_amount ?? r.amount ?? r.service_value ?? 0);
    byService[service].count += 1;
    byService[service].items.push(r);
  });

  manualRevenues.forEach((item) => {
    const service = item.description || item.category || 'Receita manual';
    if (!byService[service]) {
      byService[service] = { total: 0, count: 0, items: [] };
    }
    byService[service].total += Number(item.amount || 0);
    byService[service].count += 1;
    byService[service].items.push(item);
  });

  const totalReceita = Object.values(byService).reduce((sum, item) => sum + Number(item.total || 0), 0);

  return Object.entries(byService)
    .map(([servico, data]) => ({
      servico,
      quantidade: data.count,
      valor_medio: data.count > 0 ? Number((data.total / data.count).toFixed(2)) : 0,
      total: Number(data.total.toFixed(2)),
      percentual: totalReceita > 0 ? Number(((data.total / totalReceita) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 💸 Despesas por categoria
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início
 * @param {string} endDate - Data fim
 * @returns {Promise<Array>} Array com {categoria, tipo, quantidade, total, percentual}
 */
export async function getExpenseByCategory(clinicId, startDate, endDate) {
  const consolidated = await getFinancialConsolidation(clinicId, startDate, endDate);
  const payables = consolidated.payables || [];
  const manualExpenses = (consolidated.transactions || []).filter((item) => {
    const type = String(item.type || '').toLowerCase();
    const transactionType = String(item.transaction_type || '').toUpperCase();
    return ['expense', 'cost', 'deduction'].includes(type) || ['EXPENSE', 'ADJUSTMENT'].includes(transactionType);
  });

  const byCategory = {};
  payables.forEach((p) => {
    const category = p.category_name || 'Outros';
    const type = getExpenseTypeLabel(p);

    const key = `${category}|${type}`;
    if (!byCategory[key]) {
      byCategory[key] = { category, type, total: 0, count: 0 };
    }
    byCategory[key].total += Number(p.amount || 0);
    byCategory[key].count += 1;
  });

  manualExpenses.forEach((transaction) => {
    const category = transaction.category || 'Outros';
    const type = transaction.type === 'cost' ? 'Custo' : 'Despesa';
    const key = `${category}|${type}`;
    if (!byCategory[key]) {
      byCategory[key] = { category, type, total: 0, count: 0 };
    }
    byCategory[key].total += Number(transaction.amount || 0);
    byCategory[key].count += 1;
  });

  const totalDespesa = Object.values(byCategory).reduce((sum, item) => sum + Number(item.total || 0), 0);

  return Object.values(byCategory)
    .map((item) => ({
      ...item,
      total: Number(item.total.toFixed(2)),
      percentual: totalDespesa > 0 ? Number(((item.total / totalDespesa) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 📊 Análise de margens
 * 
 * @param {string} clinicId - ID da clínica
 * @param {string} startDate - Data início
 * @param {string} endDate - Data fim
 * @returns {Promise<Object>} Margens bruta, operacional e líquida com análise
 */
export async function getMarginAnalysis(clinicId, startDate, endDate) {
  const dre = await getDREData(clinicId, startDate, endDate);

  const { receitas, custos_operacionais, despesas_administrativas, impostos, lucros, margens } = dre;

  // Referências/benchmarks para clínicas (Simples Nacional)
  const benchmarks = {
    margem_bruta: { target: 75, warning: 65 }, // 75% ideal
    margem_operacional: { target: 40, warning: 30 }, // 40% ideal
    margem_liquida: { target: 30, warning: 20 }, // 30% ideal
  };

  return {
    margens: margens,
    benchmarks: benchmarks,
    analise: {
      bruta: {
        valor: margens.bruta,
        target: benchmarks.margem_bruta.target,
        status: getMarginStatus(margens.bruta, benchmarks.margem_bruta),
        diferenca: Number((margens.bruta - benchmarks.margem_bruta.target).toFixed(2)),
        insight:
          margens.bruta >= benchmarks.margem_bruta.target
            ? 'Margem bruta excelente! Custos bem controlados.'
            : margens.bruta >= benchmarks.margem_bruta.warning
              ? 'Atenção: Margem bruta abaixo do ideal. Revise custos operacionais.'
              : 'Crítico: Margem bruta muito baixa. Revisão urgente de custos.',
      },
      operacional: {
        valor: margens.operacional,
        target: benchmarks.margem_operacional.target,
        status: getMarginStatus(margens.operacional, benchmarks.margem_operacional),
        diferenca: Number((margens.operacional - benchmarks.margem_operacional.target).toFixed(2)),
        insight:
          margens.operacional >= benchmarks.margem_operacional.target
            ? 'Operações eficientes! Despesas bem gerenciadas.'
            : margens.operacional >= benchmarks.margem_operacional.warning
              ? 'Atenção: Despesas administrativas crescendo. Monitore gastos.'
              : 'Crítico: Despesas muito altas em relação à receita.',
      },
      liquida: {
        valor: margens.liquida,
        target: benchmarks.margem_liquida.target,
        status: getMarginStatus(margens.liquida, benchmarks.margem_liquida),
        diferenca: Number((margens.liquida - benchmarks.margem_liquida.target).toFixed(2)),
        insight:
          margens.liquida >= benchmarks.margem_liquida.target
            ? 'Excelente lucratividade! Negócio saudável.'
            : margens.liquida >= benchmarks.margem_liquida.warning
              ? 'Atenção: Lucratividade abaixo do esperado.'
              : 'Crítico: Margem líquida muito baixa. Ação necessária.',
      },
    },
    detalhes: {
      receita_unitaria: receitas.valor_medio,
      custo_unitario: receitas.quantidade > 0 ? custos_operacionais.total / receitas.quantidade : 0,
      taxa_impostos_sobre_receita: receitas.total > 0
        ? Number(((impostos.total / receitas.total) * 100).toFixed(2))
        : 0,
    },
  };
}

/**
 * 📉 Comparação com período anterior
 * 
 * @param {string} clinicId - ID da clínica
 * @param {{start: string, end: string}} period1 - Período novo
 * @param {{start: string, end: string}} period2 - Período anterior (para comparação)
 * @returns {Promise<Object>} Comparação com variações em % e valor
 */
export async function comparePeriods(clinicId, period1, period2) {
  const dre1 = await getDREData(clinicId, period1.start, period1.end);
  const dre2 = await getDREData(clinicId, period2.start, period2.end);

  const SMALL_BASE_THRESHOLD = 1;

  const calcVariation = (novo, anterior, { absoluteDenominator = false } = {}) => {
    const current = Number(novo || 0);
    const previous = Number(anterior || 0);
    const denominator = absoluteDenominator ? Math.abs(previous) : previous;

    if (Math.abs(denominator) < SMALL_BASE_THRESHOLD) {
      return null;
    }

    return Number((((current - previous) / denominator) * 100).toFixed(2));
  };

  return {
    periodos: {
      novo: `${period1.start} a ${period1.end}`,
      anterior: `${period2.start} a ${period2.end}`,
    },

    comparacao: {
      receitas: {
        novo: dre1.receitas.total,
        anterior: dre2.receitas.total,
        variacao_valor: Number((dre1.receitas.total - dre2.receitas.total).toFixed(2)),
        variacao_percentual: calcVariation(dre1.receitas.total, dre2.receitas.total),
        tendencia: dre1.receitas.total > dre2.receitas.total ? 'crescente' : 'decrescente',
      },

      custos: {
        novo: dre1.custos_operacionais.total,
        anterior: dre2.custos_operacionais.total,
        variacao_valor: Number((dre1.custos_operacionais.total - dre2.custos_operacionais.total).toFixed(2)),
        variacao_percentual: calcVariation(dre1.custos_operacionais.total, dre2.custos_operacionais.total),
        tendencia: dre1.custos_operacionais.total > dre2.custos_operacionais.total ? 'crescente' : 'decrescente',
      },

      despesas: {
        novo: dre1.despesas_administrativas.total,
        anterior: dre2.despesas_administrativas.total,
        variacao_valor: Number((dre1.despesas_administrativas.total - dre2.despesas_administrativas.total).toFixed(2)),
        variacao_percentual: calcVariation(dre1.despesas_administrativas.total, dre2.despesas_administrativas.total),
        tendencia: dre1.despesas_administrativas.total > dre2.despesas_administrativas.total ? 'crescente' : 'decrescente',
      },

      lucro_liquido: {
        novo: dre1.lucros.liquido,
        anterior: dre2.lucros.liquido,
        variacao_valor: Number((dre1.lucros.liquido - dre2.lucros.liquido).toFixed(2)),
        variacao_percentual: calcVariation(dre1.lucros.liquido, dre2.lucros.liquido, { absoluteDenominator: true }),
        tendencia: dre1.lucros.liquido > dre2.lucros.liquido ? 'crescente' : 'decrescente',
      },

      margem_liquida: {
        novo: dre1.margens.liquida,
        anterior: dre2.margens.liquida,
        variacao_valor: Number((dre1.margens.liquida - dre2.margens.liquida).toFixed(2)),
        variacao_percentual: calcVariation(dre1.margens.liquida, dre2.margens.liquida),
        tendencia: dre1.margens.liquida > dre2.margens.liquida ? 'crescente' : 'decrescente',
      },
    },

    insights: generateComparisonInsights(dre1, dre2),
  };
}

/* ========================
   FUNÇÕES AUXILIARES
   ======================== */

/**
 * Detectar tipo de despesa (cost vs expense)
 * Fallback: usar nome da categoria ou fornecedor
 */
function isExpenseType(payable, type) {
  // Se houver categoria com type definido, usar
  if (payable.category_type) {
    return payable.category_type === type;
  }

  // Fallback: heurística baseada em nome
  const name = (payable.category_name || payable.vendor_name || '').toLowerCase();

  if (type === 'cost') {
    return (
      name.includes('material') ||
      name.includes('medicamento') ||
      name.includes('serviço médico') ||
      name.includes('fornecedor') ||
      name.includes('produto')
    );
  }

  if (type === 'expense') {
    return (
      name.includes('aluguel') ||
      name.includes('salário') ||
      name.includes('utilities') ||
      name.includes('água') ||
      name.includes('luz') ||
      name.includes('internet') ||
      name.includes('telefone') ||
      name.includes('seguro') ||
      name.includes('marketing') ||
      name.includes('admin') ||
      name.includes('pessoal')
    );
  }

  return false;
}

/**
 * Obter label de tipo de despesa
 */
function getExpenseTypeLabel(payable) {
  if (isExpenseType(payable, 'cost')) return 'Custo Operacional';
  if (isExpenseType(payable, 'expense')) return 'Despesa Administrativa';
  return 'Outro';
}

/**
 * Status da margem vs target
 */
function getMarginStatus(value, benchmark) {
  if (value >= benchmark.target) return 'excelente';
  if (value >= benchmark.warning) return 'atencao';
  return 'critico';
}

/**
 * Gerar insights da comparação
 */
function generateComparisonInsights(dre1, dre2) {
  const insights = [];

  // Receita cresceu?
  if (dre1.receitas.total > dre2.receitas.total * 1.1) {
    insights.push('✅ Receita em crescimento! Excelente desempenho.');
  } else if (dre1.receitas.total < dre2.receitas.total * 0.9) {
    insights.push('⚠️ Receita em queda. Investigue causas.');
  }

  // Custos controlados?
  if (dre1.custos_operacionais.total < dre2.custos_operacionais.total) {
    insights.push('✅ Custos operacionais diminuíram. Bom controle!');
  } else if (dre1.custos_operacionais.total > dre2.custos_operacionais.total * 1.2) {
    insights.push('⚠️ Custos operacionais crescendo acima da receita.');
  }

  // Despesas administrativas?
  if (dre1.despesas_administrativas.total < dre2.despesas_administrativas.total) {
    insights.push('✅ Despesas administrativas em redução.');
  }

  // Lucratividade geral
  if (dre1.lucros.liquido > dre2.lucros.liquido * 1.2) {
    insights.push('🎉 Lucratividade excelente neste período!');
  } else if (dre1.lucros.liquido < dre2.lucros.liquido * 0.8) {
    insights.push('⚠️ Lucratividade em queda significativa.');
  }

  // Margem líquida
  if (dre1.margens.liquida > dre2.margens.liquida + 5) {
    insights.push('📈 Margem líquida melhorou significativamente.');
  } else if (dre1.margens.liquida < dre2.margens.liquida - 5) {
    insights.push('📉 Atenção: Margem líquida piorou.');
  }

  return insights;
}

/**
 * Calcular dias entre datas
 */
function getDaysDiff(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  return Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}
