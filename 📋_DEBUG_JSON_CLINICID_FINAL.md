╔════════════════════════════════════════════════════════════════════════════╗
║                    🔧 DEBUG FINAL - ERROS DE JSON E clinic_id              ║
║                           Gesclinic - April 24, 2026                       ║
╚════════════════════════════════════════════════════════════════════════════╝

═════════════════════════════════════════════════════════════════════════════
1️⃣ TESTE NO CONSOLE (F12)
═════════════════════════════════════════════════════════════════════════════

// Test 1: Validar Session
await supabase.auth.getSession()
// ✅ Esperado: { session: {...}, user: {...} }
// ❌ Erro: null ou error

// Test 2: Validar User
await supabase.auth.getUser()
// ✅ Esperado: { user: {id: "xxx", email: "yyy"} }
// ❌ Erro: null ou error

// Test 3: Validar Contexto
const { getClinicContext } = await import('./src/lib/getClinicContext.js')
await getClinicContext()
// ✅ Esperado: { userId: "xxx", clinicId: "yyy" }
// ❌ Erro: "Usuário sem clinic_id vinculado"

// Test 4: Verificar clinic_id no banco
await supabase
  .from('users')
  .select('id, email, clinic_id')
  .eq('id', 'SEU_USER_ID')
  .maybeSingle()
// ✅ Esperado: { id: "xxx", email: "yyy", clinic_id: "zzz" }
// ❌ Se clinic_id = null → problema é dado no banco

═════════════════════════════════════════════════════════════════════════════
2️⃣ VERIFICAR NO SUPABASE SQL EDITOR
═════════════════════════════════════════════════════════════════════════════

-- Test 1: Verificar duplicações de appointments
SELECT id, COUNT(*) as duplicados
FROM appointments
GROUP BY id
HAVING COUNT(*) > 1;
-- ✅ Esperado: 0 linhas (nenhuma duplicação)
-- ❌ Se retornar: precisa limpar duplicatas

-- Test 2: Verificar clinic_id do usuário
SELECT id, email, clinic_id
FROM users
WHERE id = 'SEU_USER_ID_AQUI';
-- ✅ Esperado: Uma linha com clinic_id preenchido
-- ❌ Se clinic_id = null → UPDATE necessário

-- Test 3: Verificar function get_current_clinic()
SELECT exists (
  SELECT 1 FROM pg_proc 
  WHERE proname = 'get_current_clinic'
);
-- ✅ Esperado: true
-- ❌ Se false → rodar migration

-- Test 4: Testar function
SELECT get_current_clinic();
-- ✅ Esperado: UUID válido (sua clínica)
-- ❌ Se null → user sem clinic_id

-- Test 5: Verificar RLS ativo
SELECT count(*)
FROM pg_policies
WHERE tablename = 'appointments';
-- ✅ Esperado: >= 1 (pelo menos 1 policy ativa)
-- ❌ Se 0 → RLS não está ativo

═════════════════════════════════════════════════════════════════════════════
3️⃣ VERIFICAR ERROS NO CONSOLE (F12 → Console)
═════════════════════════════════════════════════════════════════════════════

❌ ERROS QUE NÃO DEVEM APARECER:
  - "Cannot coerce the result to a single JSON object"
  - "Usuário sem clinic_id vinculado" (após login válido)
  - "PGRST116" (0 linhas retornadas)

✅ LOGS QUE DEVEM APARECER:
  - "✅ Contexto carregado: { userId: '...', clinicId: '...' }"
  - "🔄 Auth mudou: SIGNED_IN"
  - "✅ [getClinicContext] Usuário autenticado: ..."

═════════════════════════════════════════════════════════════════════════════
4️⃣ STEP BY STEP CORREÇÃO
═════════════════════════════════════════════════════════════════════════════

1. Fazer logout
   - Esperado: "🔄 Auth mudou: SIGNED_OUT" no console

2. Limpar dados
   - localStorage.clear()
   - Recarregar página: F5

3. Fazer login novamente
   - Esperado: Tela de login

4. Após login com sucesso:
   - Esperado: "✅ Contexto carregado: { userId, clinicId }"
   - Se erro: problema é clinic_id no banco

5. Tentar salvar um agendamento
   - Esperado: ✅ sucesso
   - Se erro: problema é RLS ou clinic_id

═════════════════════════════════════════════════════════════════════════════
5️⃣ SE AINDA HOUVER ERRO "Usuário sem clinic_id vinculado"
═════════════════════════════════════════════════════════════════════════════

Passo 1: Verificar no banco
  SELECT id, email, clinic_id
  FROM users
  WHERE email = 'seu_email@aqui.com';

Passo 2: Se clinic_id = NULL
  UPDATE users
  SET clinic_id = 'UUID_DA_CLINICA_AQUI'
  WHERE email = 'seu_email@aqui.com';

Passo 3: Se não souber a UUID da clínica
  SELECT id, name FROM clinics;
  -- Copiar ID da clínica certa

Passo 4: Repetir UPDATE com ID correto
  UPDATE users
  SET clinic_id = 'ID_COPIADO'
  WHERE email = 'seu_email@aqui.com';

Passo 5: Logout + Login novamente

═════════════════════════════════════════════════════════════════════════════
6️⃣ EXECUTAR SQL MIGRATION NO SUPABASE
═════════════════════════════════════════════════════════════════════════════

Arquivo: supabase/migrations/20260424_fix_get_current_clinic_function.sql

Passos:
1. Abra Supabase Dashboard
2. Vá em: SQL Editor
3. Clique: "New Query"
4. Cole conteúdo do arquivo
5. Clique: "Run"
6. Esperado: "success" na primeira operação

═════════════════════════════════════════════════════════════════════════════
7️⃣ CHECKLIST FINAL
═════════════════════════════════════════════════════════════════════════════

✅ getClinicContext.js usa .maybeSingle()
✅ App.jsx tem listener de auth state change
✅ SupabaseAuthContext.jsx usa .maybeSingle()
✅ ClinicContext.jsx usa .maybeSingle()
✅ usePermission.js usa .maybeSingle()
✅ useAgendaConfig.js usa .maybeSingle()
✅ agenda.api.mutations.js trata null corretamente
✅ get_current_clinic() function criada
✅ Build passa (npm run build)
✅ Dev server rodando (npm run dev)
✅ Hard refresh no navegador (Ctrl+Shift+R)
✅ Login/logout funciona
✅ Contexto de clínica carregado
✅ Salvar agendamento funciona

═════════════════════════════════════════════════════════════════════════════
8️⃣ RESULTADO ESPERADO
═════════════════════════════════════════════════════════════════════════════

✅ Nenhum erro de JSON
✅ Nenhum erro de clinic_id
✅ Salvamento funcionando
✅ RLS respeitado
✅ Código resiliente (produção ready)
✅ Sistema pronto para implantação

═════════════════════════════════════════════════════════════════════════════
