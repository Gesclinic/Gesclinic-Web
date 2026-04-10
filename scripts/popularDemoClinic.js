import { supabase } from "@/lib/customSupabaseClient";

// Script para popular dados de exemplo para a clínica 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
export async function popularDemoClinic() {
  // Paciente
  await supabase.from("patients").upsert([
    {
      id: "6dec4ed4-1f26-4c7e-b1c8-41c0a4343238",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      full_name: "Fernando Cooper Medeiros",
      cpf: "01228327017",
      birth_date: "1987-05-11",
      email: "fernando.cooper@hotmail.com",
      record_number: "0001",
      gender: "Masculino",
      cell_phone: "+55 45998005753",
      phone: "45998005753",
      street: "Sadi Antônio Zortéa",
      education_level: "superior",
      status: "ativo"
    }
  ]);

  // Profissional
  await supabase.from("professionals").upsert([
    {
      id: "3c37f9d6-d911-4a94-ba7d-e00fb62e19af",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Bruno Rafael Kunz Bereza",
      active: true,
      specialty: "Endocrinologista",
      crm: "5456",
      email: "profissionalteste@teste.com.br",
      phone: "45998005753",
      color: "#226ddd"
    }
  ]);

  // Convênios
  await supabase.from("payers").upsert([
    {
      id: "844cd069-3124-44a2-be4c-c068256a5464",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Unimed",
      is_default: false
    },
    {
      id: "ac95feba-efe8-4962-a458-d63ba0e39641",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Particular",
      is_default: false
    }
  ]);

  // Planos
  await supabase.from("plans").upsert([
    {
      id: "b69a0879-fb86-4da3-8ed8-6f67d50f78ff",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      payer_id: "844cd069-3124-44a2-be4c-c068256a5464",
      name: "Local",
      code: "158"
    }
  ]);

  // Serviços (adicione pelo menos um)
  await supabase.from("services").upsert([
    {
      id: "c8640ee1-3ff0-4927-aa81-05f7083512f0",
      clinic_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
      name: "Consulta",
      duration: 30
    }
  ]);

  alert("Dados de exemplo populados para a clínica!");
}
