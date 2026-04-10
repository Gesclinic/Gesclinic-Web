import { supabase } from "@/lib/customSupabaseClient";

export async function getServicePrice({ clinicId, serviceId, professionalId, payerId, planId }) {
  if (!serviceId) {
    console.log('💰 [getServicePrice] ❌ Sem serviceId, retornando null');
    return null;
  }

  console.log('💰 [getServicePrice] ========== INICIANDO BUSCA ==========');
  console.log('   clinicId:', clinicId);
  console.log('   serviceId:', serviceId);
  console.log('   professionalId:', professionalId);
  console.log('   payerId:', payerId);
  console.log('   planId:', planId);

  try {
    // PASSO 1: Buscar valor específico do profissional para esse serviço
    if (professionalId) {
      console.log('💰 [getServicePrice] PASSO 1: Buscando em professional_services...');
      const { data, error } = await supabase
        .from("professional_services")
        .select("price")
        .eq("clinic_id", clinicId)
        .eq("professional_id", professionalId)
        .eq("service_id", serviceId)
        .eq("active", true);
      
      console.log('   Resultado:', { data, error });
      
      if (data && data.length > 0 && data[0].price != null) {
        console.log('   ✅ PASSO 1 OK! Preço encontrado:', data[0].price);
        return data[0].price;
      }
      console.log('   ❌ PASSO 1 falhou (vazio ou erro)');
    } else {
      console.log('💰 [getServicePrice] PASSO 1: Pulado (sem professionalId)');
    }

    // PASSO 2: Buscar valor na tabela de preços com filtro por convênio específico
    if (payerId) {
      console.log('💰 [getServicePrice] PASSO 2: Buscando em service_prices com payerId...');
      let query = supabase
        .from("service_prices")
        .select("price")
        .eq("clinic_id", clinicId)
        .eq("service_id", serviceId)
        .eq("payer_id", payerId);
      
      if (planId) {
        query = query.eq("plan_id", planId);
        console.log('   + Filtro de planId:', planId);
      }

      const { data, error } = await query;
      
      console.log('   Resultado:', { data, error });
      
      if (data && data.length > 0 && data[0].price != null) {
        console.log('   ✅ PASSO 2 OK! Preço encontrado:', data[0].price);
        return data[0].price;
      }
      console.log('   ❌ PASSO 2 falhou (vazio ou erro)');
    } else {
      console.log('💰 [getServicePrice] PASSO 2: Pulado (sem payerId)');
    }

    // PASSO 3: Buscar valor na tabela de preços SEM filtro de convênio (valor geral do serviço)
    console.log('💰 [getServicePrice] PASSO 3: Buscando em service_prices SEM payerId (valor base)...');
    const { data: baseData, error: baseError } = await supabase
      .from("service_prices")
      .select("price")
      .eq("clinic_id", clinicId)
      .eq("service_id", serviceId)
      .is("payer_id", null);
    
    console.log('   Resultado:', { data: baseData, error: baseError });
    
    if (baseData && baseData.length > 0 && baseData[0].price != null) {
      console.log('   ✅ PASSO 3 OK! Preço base encontrado:', baseData[0].price);
      return baseData[0].price;
    }
    console.log('   ❌ PASSO 3 falhou (vazio ou erro)');

    console.log('💰 [getServicePrice] ❌ NENHUM PREÇO ENCONTRADO EM NENHUMA TABELA!');
    return null;
  } catch (err) {
    console.error('💰 [getServicePrice] ❌ ERRO NA BUSCA:', err);
    return null;
  }
}
