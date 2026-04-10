// src/lib/baseSystemApi.js
// ============================================================
// ORQUESTRADOR - Base do Sistema
// ============================================================
// Módulo central que coordena validações e operações
// entre todos os componentes do sistema base

import { supabase } from "@/lib/customSupabaseClient";
import * as servicesApi from "@/lib/servicesApi";
import * as professionalsApi from "@/lib/professionalsApi";
import * as professionalServicesApi from "@/lib/professionalServicesApi";
import * as healthInsurancesApi from "@/lib/healthInsurancesApi";
import * as agendaRulesApi from "@/lib/agendaRulesApi";
import * as revenueRulesApi from "@/lib/revenueRulesApi";
import * as roomsApi from "@/lib/roomsApi";
import * as resourcesApi from "@/lib/resourcesApi";

// ============================================================
// HEALTH CHECK - Validação de Integridade
// ============================================================

/**
 * Valida a integridade da configuração base do sistema
 * @param {string} clinicId
 * @returns {Promise<{issues: Array, warnings: Array, ok: boolean}>}
 */
export async function validateBaseSystemSetup(clinicId) {
  const issues = [];
  const warnings = [];

  try {
    // Check 1: Profissionais cadastrados
    const professionalCount = await supabase
      .from("professionals")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    if (!professionalCount.count || professionalCount.count === 0) {
      issues.push({
        level: "error",
        id: "no_professionals",
        module: "Profissionais",
        message: "Nenhum profissional cadastrado",
        action: "Cadastre pelo menos um profissional em Base > Cadastros Estruturais > Profissionais",
      });
    }

    // Check 2: Serviços cadastrados
    const serviceCount = await supabase
      .from("services")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    if (!serviceCount.count || serviceCount.count === 0) {
      issues.push({
        level: "error",
        id: "no_services",
        module: "Serviços",
        message: "Nenhum serviço cadastrado",
        action: "Cadastre pelo menos um serviço em Base > Cadastros Estruturais > Serviços",
      });
    }

    // Check 3: Profissionais vinculados a serviços
    const psCount = await supabase
      .from("professional_services")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    if (serviceCount.count > 0 && professionalCount.count > 0 && (!psCount.count || psCount.count === 0)) {
      issues.push({
        level: "error",
        id: "no_professional_services",
        module: "Vínculo Profissional-Serviço",
        message: "Nenhum profissional vinculado a serviços",
        action: "Vincule profissionais aos serviços em Base > Cadastros Estruturais > Profissionais-Serviços",
      });
    }

    // Check 4: Convênios cadastrados
    const insuranceCount = await supabase
      .from("health_insurances")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    if (!insuranceCount.count || insuranceCount.count === 0) {
      warnings.push({
        level: "warning",
        id: "no_insurances",
        module: "Convênios",
        message: "Nenhum convênio/segurador cadastrado",
        action: "Configure convênios em Base > Cadastros Estruturais > Convênios",
      });
    }

    // Check 5: Regras de agenda definidas
    if (serviceCount.count > 0) {
      const agendaRulesCount = await supabase
        .from("agenda_rules")
        .select("id", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("active", true);

      if (!agendaRulesCount.count || agendaRulesCount.count < serviceCount.count) {
        warnings.push({
          level: "warning",
          id: "incomplete_agenda_rules",
          module: "Regras de Agenda",
          message: `${serviceCount.count - (agendaRulesCount.count || 0)} serviço(s) sem regras de agenda`,
          action: "Configure regras de agenda em Base > Regras Operacionais > Agenda",
        });
      }
    }

    // Check 6: Regras de repasse definidas
    if (serviceCount.count > 0 && professionalCount.count > 0) {
      const revenueRulesCount = await supabase
        .from("revenue_rules")
        .select("id", { count: "exact" })
        .eq("clinic_id", clinicId)
        .eq("active", true);

      if (!revenueRulesCount.count || revenueRulesCount.count === 0) {
        warnings.push({
          level: "warning",
          id: "no_revenue_rules",
          module: "Regras de Repasse",
          message: "Nenhuma regra de repasse configurada",
          action: "Configure repasses em Base > Parâmetros Financeiros > Regras de Repasse",
        });
      }
    }

    return {
      ok: issues.length === 0,
      issues,
      warnings,
      summary: {
        professionals: professionalCount.count || 0,
        services: serviceCount.count || 0,
        professionalServices: psCount.count || 0,
        insurances: insuranceCount.count || 0,
      },
    };
  } catch (error) {
    console.error("Erro ao validar Base do Sistema:", error);
    throw error;
  }
}

// ============================================================
// STATUS DE SETUP WIZARD
// ============================================================

/**
 * Retorna o status de cada etapa do wizard
 * @param {string} clinicId
 * @returns {Promise<Array<{step, completed, required}>}
 */
export async function getSetupWizardStatus(clinicId) {
  const steps = [];

  try {
    // Step 1: Profissionais
    const professionals = await supabase
      .from("professionals")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "professionals",
      title: "Cadastre Profissionais",
      description: "Médicos, terapeutas e outros profissionais da clínica",
      required: true,
      completed: (professionals.count || 0) > 0,
      count: professionals.count || 0,
    });

    // Step 2: Serviços
    const services = await supabase
      .from("services")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "services",
      title: "Configure Serviços",
      description: "Procedimentos, consultas e serviços oferecidos",
      required: true,
      dependsOn: ["professionals"],
      completed: (services.count || 0) > 0,
      count: services.count || 0,
    });

    // Step 3: Profissional-Serviço
    const professionalServices = await supabase
      .from("professional_services")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "professional_services",
      title: "Vincule Profissionais aos Serviços",
      description: "Defina qual profissional pode atender qual serviço",
      required: true,
      dependsOn: ["professionals", "services"],
      completed: (professionalServices.count || 0) > 0,
      count: professionalServices.count || 0,
    });

    // Step 4: Agenda Rules
    const agendaRules = await supabase
      .from("agenda_rules")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "agenda_rules",
      title: "Configure Regras de Agenda",
      description: "Duração, intervalo e restrições de agendamento",
      required: true,
      dependsOn: ["services"],
      completed: (agendaRules.count || 0) > 0,
      count: agendaRules.count || 0,
    });

    // Step 5: Convênios
    const insurances = await supabase
      .from("health_insurances")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "insurances",
      title: "Configure Convênios",
      description: "Operadoras de saúde e convênios aceitos",
      required: false,
      completed: (insurances.count || 0) > 0,
      count: insurances.count || 0,
    });

    // Step 6: Preços
    const servicePrices = await supabase
      .from("service_prices")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "service_prices",
      title: "Configure Tabelas de Preço",
      description: "Valor dos serviços por convênio ou pagamento direto",
      required: false,
      dependsOn: ["services", "insurances"],
      completed: (servicePrices.count || 0) > 0,
      count: servicePrices.count || 0,
    });

    // Step 7: Revenue Rules
    const revenueRules = await supabase
      .from("revenue_rules")
      .select("id", { count: "exact" })
      .eq("clinic_id", clinicId)
      .eq("active", true);

    steps.push({
      step: "revenue_rules",
      title: "Configure Regras de Repasse",
      description: "Como calcular repasse para profissionais",
      required: false,
      dependsOn: ["professionals", "services"],
      completed: (revenueRules.count || 0) > 0,
      count: revenueRules.count || 0,
    });

    return steps;
  } catch (error) {
    console.error("Erro ao obter status do wizard:", error);
    throw error;
  }
}

// ============================================================
// EXPORTAR TODOS OS MÓDULOS
// ============================================================

export {
  servicesApi,
  professionalsApi,
  professionalServicesApi,
  healthInsurancesApi,
  agendaRulesApi,
  revenueRulesApi,
  roomsApi,
  resourcesApi,
};

// ============================================================
// UTILITÁRIOS
// ============================================================

// ============================================================
// CÁLCULO DE PROGRESSO (%)
// ============================================================

/**
 * Calcula progresso automático da clínica em 4 fases:
 * 0–30%: Cadastros (Serviços, Profissionais)
 * 31–60%: Vínculos (Prof-Serviço, Agenda Rules)
 * 61–85%: Financeiro (Convênios, Preços, Repasses)
 * 100%: Sistema Liberado (Tudo OK)
 * 
 * @param {string} clinicId
 * @returns {Promise<{percentage: number, phase: string, breakdown: {}}}>}
 */
export async function calculateProgressPercentage(clinicId) {
  try {
    // Coletar dados
    const [profCount, servCount, psCount, agendaRulesCount, insCount, pricesCount, revenueRulesCount] = 
      await Promise.all([
        supabase
          .from("professionals")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("services")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("professional_services")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("agenda_rules")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("health_insurances")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("service_prices")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
        supabase
          .from("revenue_rules")
          .select("id", { count: "exact" })
          .eq("clinic_id", clinicId)
          .eq("active", true),
      ]);

    const profs = profCount.count || 0;
    const servs = servCount.count || 0;
    const ps = psCount.count || 0;
    const agendas = agendaRulesCount.count || 0;
    const inss = insCount.count || 0;
    const prices = pricesCount.count || 0;
    const revenues = revenueRulesCount.count || 0;

    // ========================================
    // FASE 1: CADASTROS (0–30%)
    // ========================================
    // Cadastra Profissionais: 0–10%
    // Cadastra Serviços: 10–20%
    let cadastrosPercent = 0;

    if (profs > 0) cadastrosPercent = Math.min(10, Math.round((profs / 5) * 10)); // 1 prof = 2%, 5 = 10%
    if (servs > 0) cadastrosPercent = Math.min(20, cadastrosPercent + Math.round((servs / 5) * 10)); // 1 serviço = 2%, 5 = 10%

    // ========================================
    // FASE 2: VÍNCULOS (31–60%)
    // ========================================
    // Prof-Serviço: 30–45%
    // Agenda Rules: 45–60%
    let vinculosPercent = cadastrosPercent;

    if (ps > 0 && servs > 0) {
      const psRatio = (ps / servs); // Quantos vínculos por serviço
      vinculosPercent = Math.min(45, cadastrosPercent + Math.round(Math.min(psRatio, 1) * 15));
    }

    if (agendas > 0 && servs > 0) {
      const agendaRatio = (agendas / servs); // Quantas regras por serviço
      vinculosPercent = Math.min(60, vinculosPercent + Math.round(Math.min(agendaRatio, 1) * 15));
    }

    // ========================================
    // FASE 3: FINANCEIRO (61–85%)
    // ========================================
    // Convênios: 60–70%
    // Tabelas de Preço: 70–80%
    // Repasses: 80–85%
    let financePercent = vinculosPercent;

    if (inss > 0) financePercent = Math.min(70, vinculosPercent + Math.round((inss / 3) * 10)); // 3 convênios = 10%
    if (prices > 0) financePercent = Math.min(80, financePercent + Math.round((prices / 5) * 10)); // 5 preços = 10%
    if (revenues > 0) financePercent = Math.min(85, financePercent + 5); // 5% por ter repasses

    // ========================================
    // FASE 4: LIBERADO (100%)
    // ========================================
    let finalPercent = financePercent;
    let phase = "Cadastros";

    // Critérios para 100%: Tudo OK
    const allOk =
      profs > 0 &&
      servs > 0 &&
      ps > 0 &&
      agendas > 0 &&
      inss > 0 &&
      prices > 0 &&
      revenues > 0;

    if (allOk) {
      finalPercent = 100;
      phase = "Sistema Liberado";
    } else if (financePercent >= 85) {
      phase = "Financeiro";
    } else if (vinculosPercent >= 60) {
      phase = "Vínculos";
    } else if (cadastrosPercent >= 30) {
      phase = "Cadastros";
    }

    return {
      percentage: finalPercent,
      phase,
      breakdown: {
        cadastros: cadastrosPercent,
        vinculos: vinculosPercent,
        financeiro: financePercent,
        liberado: allOk ? 100 : finalPercent,
      },
      counts: {
        professionals: profs,
        services: servs,
        professionalServices: ps,
        agendaRules: agendas,
        insurances: inss,
        servicePrices: prices,
        revenueRules: revenues,
      },
    };
  } catch (error) {
    console.error("Erro ao calcular progresso:", error);
    return {
      percentage: 0,
      phase: "Erro ao calcular",
      breakdown: {},
      counts: {},
    };
  }
}

/**
 * Obtém status crítico de um elemento
 * Ex: Se um serviço pode ser agendado
 */
export async function getElementStatus(elementType, elementId, clinicId) {
  const status = {
    canBeScheduled: false,
    canBeEdited: true,
    canBeDeleted: false, // Nunca deletar, apenas inativar
    warnings: [],
    errors: [],
  };

  try {
    if (elementType === "service") {
      // Validar se serviço pode ser agendado
      const hasRules = await supabase
        .from("agenda_rules")
        .select("id")
        .eq("service_id", elementId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (!hasRules.data) {
        status.warnings.push("Serviço sem regras de agenda definidas");
      }

      const hasProfessionals = await supabase
        .from("professional_services")
        .select("id")
        .eq("service_id", elementId)
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (!hasProfessionals.data) {
        status.errors.push("Serviço sem profissionais vinculados");
      }

      status.canBeScheduled = status.errors.length === 0;
    }

    if (elementType === "professional") {
      const services = await supabase
        .from("professional_services")
        .select("id", { count: "exact" })
        .eq("professional_id", elementId)
        .eq("clinic_id", clinicId);

      if (!services.count || services.count === 0) {
        status.warnings.push("Profissional sem serviços vinculados");
      }

      status.canBeScheduled = services.count > 0;
    }

    return status;
  } catch (error) {
    console.error("Erro ao obter status do elemento:", error);
    throw error;
  }
}
