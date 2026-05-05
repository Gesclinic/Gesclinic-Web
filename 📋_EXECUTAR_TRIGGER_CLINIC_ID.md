╔════════════════════════════════════════════════════════════════════╗
║     🔥 EXECUTAR PROTEÇÃO RLS: Force clinic_id NO SUPABASE         ║
╚════════════════════════════════════════════════════════════════════╝

ARQUIVO: supabase/migrations/2026-04-27_force_clinic_id_trigger.sql

OBJETIVO:
- Força clinic_id automaticamente no INSERT (baseado no usuário autenticado)
- Proteção de 2º nível contra RLS violations
- Mesmo que frontend envie clinic_id errado, banco força o correto

════════════════════════════════════════════════════════════════════

COMO EXECUTAR:

OPÇÃO 1️⃣ — Supabase Dashboard (RECOMENDADO PARA TESTE)
═══════════════════════════════════════════════════════

1. Abra: https://app.supabase.com/
2. Selecione seu projeto Gesclinic
3. Vá em: SQL Editor
4. Clique em: "New Query"
5. Copie TODO o conteúdo de: 2026-04-27_force_clinic_id_trigger.sql
6. Cole na query
7. Clique em: "RUN" (play button)
8. Aguarde a confirmação: "Success"

═════════════════════════════════════════════════════════════════════

OPÇÃO 2️⃣ — Supabase CLI (SE TIVER INSTALADO)
═══════════════════════════════════════════════════════════

```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Executar migração
supabase db push

# Ou executar SQL diretamente
supabase db execute < supabase/migrations/2026-04-27_force_clinic_id_trigger.sql
```

═════════════════════════════════════════════════════════════════════

O QUE SERÁ CRIADO:

1️⃣ FUNÇÃO: public.set_appointments_clinic_id()
   └─ Força clinic_id baseado no auth.uid()
   └─ Gera erro se usuário sem clínica associada

2️⃣ TRIGGER: set_clinic_id_on_insert
   └─ BEFORE INSERT em appointments
   └─ Executa função para cada novo agendamento

3️⃣ TRIGGER: prevent_clinic_id_change
   └─ BEFORE UPDATE em appointments
   └─ Reforça clinic_id se alguém tentar alterar

4️⃣ ÍNDICE: idx_appointments_clinic_id
   └─ Melhora performance de queries por clinic_id

════════════════════════════════════════════════════════════════════

RESULTADO ESPERADO:

✅ Qualquer INSERT em appointments:
   - Lê clinic_id do usuário autenticado
   - Força NEW.clinic_id para esse valor
   - Ignora qualquer clinic_id enviado pelo frontend

✅ Proteção contra:
   - RLS violations por clinic_id incorreto
   - Usuário criando agendamento em clínica errada
   - Frontend enviando clinic_id manipulado

════════════════════════════════════════════════════════════════════

COMO TESTAR:

1. Faça login no Gesclinic (vai autenticar com seus dados)
2. Crie um novo agendamento (use a interface)
3. Verifique no Supabase SQL Editor:

```sql
SELECT * FROM public.appointments 
WHERE created_at > NOW() - INTERVAL '1 minute'
LIMIT 1;
```

4. Verifique que:
   - clinic_id != NULL
   - clinic_id == clinic_id do seu usuário

════════════════════════════════════════════════════════════════════

SEGURANÇA:

🔒 SECURITY DEFINER
   - Função roda com privilégios de schema owner
   - Usuário não pode contornar com permissões

🔒 BEFORE INSERT
   - Força valor ANTES das RLS policies
   - RLS não consegue bloquear se clinic_id correto

🔒 Erro explícito
   - Se usuário sem clínica associada: erro claro
   - Não cria agendamento órfão

════════════════════════════════════════════════════════════════════

PRÓXIMO PASSO:

Depois de executar:
1. Testar criar agendamento via UI (deve funcionar normalmente)
2. Verificar que clinic_id foi forçado corretamente
3. Testar login com usuários de diferentes clínicas
4. Confirmar que cada um só vê seus agendamentos (RLS OK)

════════════════════════════════════════════════════════════════════
