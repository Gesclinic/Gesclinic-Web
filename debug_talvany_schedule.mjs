import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Carregar .env
const envContent = readFileSync(resolve(".env"), "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    env[key.trim()] = value.trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

const clinicId = "dcee437c-fd14-463c-b25e-a318f5da60b7"; // Gesclinic Demo

(async () => {
  try {
    console.log("🔍 Buscando dados do Talvany...\n");

    // 1. Buscar ID do Talvany
    const { data: talvany, error: talvanyError } = await supabase
      .from("professionals")
      .select("id, name, clinic_id")
      .ilike("name", "%talvany%")
      .single();

    if (talvanyError) throw talvanyError;

    console.log("✅ Talvany encontrado:");
    console.log("  ID:", talvany.id);
    console.log("  Nome:", talvany.name);
    console.log("  Clinic ID:", talvany.clinic_id);
    console.log("");

    // 2. Buscar todos os professional_schedules do Talvany
    const { data: schedules, error: schedError } = await supabase
      .from("professional_schedules")
      .select("*")
      .eq("professional_id", talvany.id);

    if (schedError) throw schedError;

    console.log(`📅 Professional_schedules encontrados: ${schedules?.length || 0}`);
    if (schedules && schedules.length > 0) {
      schedules.forEach((s, i) => {
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        console.log(`  [${i}] ${days[s.day_of_week]} (day_of_week=${s.day_of_week}): ${s.start_time} - ${s.end_time}`);
        console.log(`      Pausa: ${s.break_start || 'nenhuma'} - ${s.break_end || ''}`);
        console.log(`      Ativo: ${s.active}, Deletado: ${s.deleted_at}`);
      });
    } else {
      console.log("  ⚠️  NENHUM SCHEDULE CADASTRADO!");
    }
    console.log("");

    // 3. Teste: Qual dia é 16/02/2026?
    let testDate = new Date("2026-02-16");
    console.log(`📆 16/02/2026 é: ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][testDate.getDay()]}`);
    console.log(`   getDay() retorna: ${testDate.getDay()}`);
    console.log("");

    // 4. Buscar agendamentos de Talvany em 16/02/2026
    const { data: appointments, error: aptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("professional_id", talvany.id)
      .eq("scheduled_date", "2026-02-16");

    if (aptError) throw aptError;

    console.log(`📊 Agendamentos de Talvany em 16/02/2026 (segunda): ${appointments?.length || 0}`);
    if (appointments && appointments.length > 0) {
      appointments.forEach((a) => {
        console.log(`  ${a.scheduled_time} - ${a.status}`);
      });
    }
    console.log("");

    // 5. TESTE: Query exata do modal
    console.log("🧪 TESTE: Query exata do modal...");
    console.log(`   professional_id: ${talvany.id}`);
    console.log(`   clinic_id: ${clinicId}`);
    console.log(`   day_of_week: ${testDate.getDay()} (${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][testDate.getDay()]})`);
    console.log(`   active: true`);
    console.log("");

    const { data: modalTest, error: modalTestError } = await supabase
      .from("professional_schedules")
      .select("*")
      .eq("professional_id", talvany.id)
      .eq("clinic_id", clinicId)
      .eq("day_of_week", testDate.getDay())
      .eq("active", true);

    if (modalTestError) throw modalTestError;

    console.log(`✅ Resultado: ${modalTest?.length || 0} schedules encontrados`);
    if (modalTest && modalTest.length > 0) {
      modalTest.forEach((s) => {
        console.log(`  ${s.start_time} - ${s.end_time}`);
      });
    } else {
      console.log("  ❌ NENHUM RESULTADO! Problema no filtro clinic_id?");
    }

  } catch (err) {
    console.error("❌ Erro:", err.message);
  }
})();
