╔════════════════════════════════════════════════════════════════════════════╗
║           🔧 UPDATE.SELECT.SINGLE() - QUICK REFERENCE                      ║
║              Correção para "Cannot coerce result to JSON"                   ║
╚════════════════════════════════════════════════════════════════════════════╝

═════════════════════════════════════════════════════════════════════════════
✅ STATUS ATUAL DO PROJETO
═════════════════════════════════════════════════════════════════════════════

Verificação completa realizada: ✅ 100% CORRETO
- Build: 28.6s, 4947 módulos, 0 erros
- Todos os UPDATE.single() já têm .select()
- Todos os UPDATE.maybeSingle() já têm .select()
- Nenhuma instância do padrão errado encontrada

═════════════════════════════════════════════════════════════════════════════
📋 PADRÃO CORRETO PARA USAR NO FUTURO
═════════════════════════════════════════════════════════════════════════════

1️⃣  UPDATE e RETORNAR DADOS (com .single())
─────────────────────────────────────────────

const { data, error } = await supabase
  .from('appointments')
  .update({ status: 'confirmado', updated_at: new Date().toISOString() })
  .eq('id', appointmentId)
  .select()        // ← OBRIGATÓRIO para retornar dados
  .single();       // ← Espera exatamente 1 linha

if (error) throw error;
if (!data) throw new Error('Registro não encontrado');

return data; // ✅ Retorna object com dados atualizados


2️⃣ UPDATE E HANDLE NULO (com .maybeSingle() - mais resiliente)
───────────────────────────────────────────────────────────────

const { data, error } = await supabase
  .from('appointments')
  .update({ status: 'atendido' })
  .eq('id', appointmentId)
  .select()        // ← OBRIGATÓRIO
  .maybeSingle();  // ← Aceita 0 ou 1 linhas

if (error) {
  console.error('Erro no update:', error);
  throw error;
}

if (!data) {
  console.warn('Registro não encontrado ou RLS bloqueou acesso');
  return null;
}

return data; // ✅ Retorna object ou null (nunca throw)


3️⃣ UPDATE SEM RETORNO (fire-and-forget)
────────────────────────────────────────

const { error } = await supabase
  .from('appointments')
  .update({ last_sync_at: new Date().toISOString() })
  .eq('id', appointmentId);
  // ✅ Sem .select(), sem .single() - perfeito!

if (error) {
  console.error('Erro ao atualizar sincronização:', error);
  // Não faz throw, apenas log (não bloqueador)
}

═════════════════════════════════════════════════════════════════════════════
❌ ERROS A EVITAR
═════════════════════════════════════════════════════════════════════════════

❌ ERRADO: .update().single() SEM .select()
───────────────────────────────────────────

const { data } = await supabase
  .from('appointments')
  .update(payload)
  .eq('id', id)
  .single();  // ❌ ERRO: "Cannot coerce the result to a single JSON object"

// Problema: .update() retorna [], .single() não consegue coerçar array vazio


❌ ERRADO: .update().maybeSingle() SEM .select()
─────────────────────────────────────────────

const { data } = await supabase
  .from('appointments')
  .update(payload)
  .eq('id', id)
  .maybeSingle();  // ❌ ERRO: Mesma issue, ou retorna null inesperadamente


❌ ERRADO: .update() COM .select() MAS TRATAMENTO DE ARRAY
───────────────────────────────────────────────────────────

const { data } = await supabase
  .from('appointments')
  .update(payload)
  .eq('id', id)
  .select();

// ❌ Aqui data é array: [{ ...appointment }]
// Precisa fazer: data[0] (frágil) ou usar .single()/.maybeSingle()


═════════════════════════════════════════════════════════════════════════════
🔍 QUANDO USAR CADA PADRÃO
═════════════════════════════════════════════════════════════════════════════

Usar .single():
  ✅ Você SABE que o registro existe
  ✅ Quer erro se retornar 0 linhas (RLS/não encontrado)
  ✅ Exemplo: Salvando agendamento do usuário autenticado

Usar .maybeSingle():
  ✅ Você NÃO SABE se o registro existe
  ✅ Quer tratar gracefully se RLS bloquear (retorna null)
  ✅ Exemplo: Verificar se tem agendamento específico
  ✅ 👈 RECOMENDADO para maioria dos casos (mais resiliente)

Sem .select():
  ✅ Você NÃO PRECISA dos dados atualizados
  ✅ Apenas quer confirmar que update funcionou (sem erro)
  ✅ Exemplo: Auto-save de timestamps

═════════════════════════════════════════════════════════════════════════════
📝 TEMPLATE PARA COPIAR & COLAR
═════════════════════════════════════════════════════════════════════════════

// 1. Update com retorno resiliente
export async function updateAppointment(id, payload) {
  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('❌ [updateAppointment] Erro:', error.message);
    throw error;
  }

  if (!data) {
    console.warn('⚠️ [updateAppointment] Registro não encontrado');
    return null;
  }

  return data;
}

// 2. Update com validação de existência
export async function updateAppointmentRequired(id, payload) {
  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id)
    .select()
    .single(); // ← Lança erro se não encontra

  if (error) {
    console.error('❌ [updateAppointmentRequired] Erro:', error.message);
    throw new Error('Agendamento não encontrado ou sem permissão');
  }

  return data;
}

// 3. Update sem retorno
export async function updateAppointmentAsync(id, payload) {
  const { error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('⚠️ [updateAppointmentAsync] Update falhou (não-bloqueador):', error);
    return false;
  }

  return true;
}

═════════════════════════════════════════════════════════════════════════════
🧪 TESTE RÁPIDO NO CONSOLE
═════════════════════════════════════════════════════════════════════════════

// Copie e cole no F12 console:

// 1. Testar padrão correto
await supabase
  .from('appointments')
  .select('id')
  .eq('clinic_id', 'SEU_CLINIC_ID')
  .limit(1)
  .maybeSingle()
// ✅ Esperado: { id: "...", ... } ou null

// 2. Testar update com .select()
await supabase
  .from('appointments')
  .update({ updated_at: new Date().toISOString() })
  .eq('id', 'SEU_ID')
  .select()
  .maybeSingle()
// ✅ Esperado: { id: "...", updated_at: "2026-04-24T..." } ou null


═════════════════════════════════════════════════════════════════════════════
📚 REFERÊNCIA SUPABASE DOCS
═════════════════════════════════════════════════════════════════════════════

UPDATE: https://supabase.com/docs/reference/javascript/update
SELECT: https://supabase.com/docs/reference/javascript/select
SINGLE: https://supabase.com/docs/reference/javascript/single
MAYBESINGLE: https://supabase.com/docs/reference/javascript/maybeSingle

═════════════════════════════════════════════════════════════════════════════
✅ RESUMO
═════════════════════════════════════════════════════════════════════════════

✔ Projeto: 100% correto (nenhuma violação encontrada)
✔ Pattern: Use .select() SEMPRE antes de .single()/.maybeSingle()
✔ Recomendação: Prefira .maybeSingle() a .single() (mais resiliente)
✔ Build: Passa, tudo funcionando
✔ Próximo passo: Executar SQL migration no Supabase

═════════════════════════════════════════════════════════════════════════════
