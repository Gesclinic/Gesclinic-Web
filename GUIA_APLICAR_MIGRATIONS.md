# 📦 GUIA: Aplicar Migrations do Supabase

**Status:** 31 migrations encontradas e prontas para aplicar  
**Data:** 2025-01-15  
**Ambiente:** Producao

---

## ✅ Migrations Encontradas

Total: **31 arquivos SQL** na pasta `supabase/migrations`

### Lista Completa

1. 2026-01-11_create_appointment_audit_logs.sql
2. 20260112_add_slug_to_plans.sql
3. 2026-01-12_create_rooms_table.sql
4. 20260112_fix_plans_table.sql
5. 20260112_plans_and_subscriptions.sql
6. 20260112_update_pricing_plans.sql
7. 20260113_add_clinic_fields.sql
8. 2026-01-13_add_missing_appointments_columns.sql
9. 2026-01-13_add_user_fields.sql
10. 20260113_add_users_fields.sql
11. 20260113_COMPREHENSIVE_INIT.sql
12. 2026-01-13_create_rbac_tables.sql
13. 20260114_add_patient_fields.sql
14. 20260114_add_prontuario_field.sql
15. 2026-01-14_create_agenda_indicators.sql
16. 2026-01-14_create_appointment_audit_logs.sql
17. 2026-01-14_create_appointment_financial_audit_logs.sql
18. 20260114_CREATE_CODE_INDEXES.sql
19. 20260114_create_suggestion_audit_logs.sql
20. 20260114_INSERT_PROFESSIONAL_USER.sql
21. 20260115_add_missing_appointments_columns.sql
22. 20260115_base_sistema_schema.sql
23. 20260115_CLEAN_AND_REINIT.sql
24. 20260115_create_agenda_indicators.sql
25. 20260115_fix_agenda_indicators.sql
26. 20260116_INSERT_DEMO_USER.sql
27. 20260117_subscription_plans.sql
28. 20260118_rls_policies.sql
29. 20260119_add_stripe_fields.sql
30. 20260120_add_missing_columns.sql
31. 20260120_cashflow_summary_function.sql

---

## 🚀 Como Aplicar as Migrations

### Opção 1: Via Supabase Dashboard (Recomendado)

**Passo 1:** Abrir Supabase SQL Editor
```
https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new
```

**Passo 2:** Para cada migration na ordem:
1. Abra o arquivo SQL em `supabase/migrations/`
2. Copie todo o conteúdo
3. Cole no editor SQL do Supabase
4. Clique em "Run" (ou Ctrl+Enter)
5. Aguarde a mensagem "Success"
6. Continue com o próximo arquivo

**Passo 3:** Validar execução
- Após aplicar todas, verifique que não houve erros
- Procure no "Query Results" por mensagens de sucesso

### Opção 2: Via Script PowerShell

```powershell
# Executar o script que lista as migrations
.\scripts\list_migrations.ps1
```

O script:
- Carrega variáveis do `.env`
- Lista todas as migrations
- Mostra as instruções

### Opção 3: Via psql (Avançado)

Se tiver PostgreSQL instalado localmente:

```bash
# Conectar ao Supabase
psql -h db.gvdkdjyupktlflwurike.supabase.co -U postgres -d postgres

# Executar cada migration
\i supabase/migrations/2026-01-11_create_appointment_audit_logs.sql
\i supabase/migrations/20260112_add_slug_to_plans.sql
# ... e assim por diante
```

---

## ⚠️ Ordem Importante

**RESPEITE A ORDEM** das migrations! Algumas dependem de outras:

1. **Fase 1 (Base):** Tabelas core
   - appointment_audit_logs
   - rooms
   - plans

2. **Fase 2 (Extensoes):** Campos adicionais
   - clinic_fields
   - appointments_columns
   - user_fields

3. **Fase 3 (Auditoria):** Audit logs adicionais
   - appointment_audit_logs
   - appointment_financial_audit_logs
   - suggestion_audit_logs

4. **Fase 4 (Agenda/Indicadores):** Funcionalidades novas
   - agenda_indicators
   - base_sistema_schema

5. **Fase 5 (Seguranca):** Policies
   - RLS_policies

6. **Fase 6 (Monetizacao):** Subscriptions e pagamento
   - subscription_plans
   - stripe_fields

7. **Fase 7 (Final):** Limpeza e otimização
   - missing_columns
   - cashflow_summary_function

---

## ✨ O que cada grupo faz

### 1. Audit & Logging
- `appointment_audit_logs.sql` - Rastreia mudanças em agendamentos
- `appointment_financial_audit_logs.sql` - Rastreia impacto financeiro
- `suggestion_audit_logs.sql` - Rastreia sugestões/alterações

**Impacto:** Conformidade, auditoria, rastreabilidade

### 2. Salas & Agendamentos
- `create_rooms_table.sql` - Tabela de salas de atendimento
- `add_missing_appointments_columns.sql` - Campos faltantes em agendamentos

**Impacto:** Melhor controle de agenda por sala

### 3. Usuarios & RBAC
- `add_user_fields.sql` - Campos adicionais de usuário
- `create_rbac_tables.sql` - Controle de acesso baseado em papéis

**Impacto:** Segurança, controle de permissões

### 4. Pacientes & Prontuario
- `add_patient_fields.sql` - Campos adicionais de paciente
- `add_prontuario_field.sql` - Campo de prontuário

**Impacto:** Melhor gestão de pacientes

### 5. Clinica & Configuracoes
- `add_clinic_fields.sql` - Campos adicionais de clínica
- `base_sistema_schema.sql` - Schema completo do sistema

**Impacto:** Configurações avançadas por clínica

### 6. Agenda & Indicadores
- `create_agenda_indicators.sql` - KPIs e indicadores de agenda
- `fix_agenda_indicators.sql` - Correcoes e otimizacoes

**Impacto:** Dashboard com indicadores

### 7. Planos & Subscricoes
- `subscription_plans.sql` - Planos de subscrição
- `add_stripe_fields.sql` - Integração Stripe

**Impacto:** Monetização

### 8. Financeiro
- `cashflow_summary_function.sql` - RPC para resumo de fluxo de caixa

**Impacto:** Dashboard financeiro

### 9. Dados Demo
- `INSERT_DEMO_USER.sql` - Usuário de teste
- `INSERT_PROFESSIONAL_USER.sql` - Profissional de teste

**Impacto:** Dados para testes

---

## 🔍 Verificar Status

Após aplicar todas as migrations, verifique:

```sql
-- 1. Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Verificar se audit logs existem
SELECT * FROM appointment_audit_logs LIMIT 1;

-- 3. Verificar se salas foram criadas
SELECT * FROM rooms LIMIT 1;

-- 4. Verificar indicadores
SELECT * FROM appointment_indicators LIMIT 1;

-- 5. Verificar RLS policies
SELECT * FROM pg_policies;
```

---

## 🚨 Possíveis Erros

### Erro: "relation already exists"
**Causa:** Migration já foi aplicada anteriormente  
**Solucao:** Pule essa migration e continue com a próxima

### Erro: "permission denied"
**Causa:** Usuário não tem permissão  
**Solucao:** Use conta com permissões de admin (verificar em Supabase)

### Erro: "syntax error"
**Causa:** Arquivo SQL corrompido  
**Solucao:** Verifique encoding do arquivo (UTF-8)

### Erro: "constraint violation"
**Causa:** Dados conflitam com schema novo  
**Solucao:** Aplicar em ordem correta ou limpar dados de teste

---

## 💡 Dicas

1. **Aplicar aos poucos:** Não aplique todas de uma vez. Faça por grupo (5-10 de cada vez)
2. **Aguardar sucesso:** Sempre aguarde a mensagem de sucesso antes de continuar
3. **Verificar console:** Monitore o console para avisos ou erros
4. **Backup:** Faça backup antes de aplicar (Supabase > Backups)
5. **Teste:** Após aplicar, teste os recursos no app

---

## ✅ Checklist Final

- [ ] Todas as 31 migrations aplicadas com sucesso
- [ ] Nenhuma mensagem de erro ou aviso
- [ ] Tabelas criadas e acessíveis
- [ ] Audit logs funcionando
- [ ] Dashboard mostrando indicadores
- [ ] Usuarios podem fazer login
- [ ] Profissionais e pacientes visíveis
- [ ] Financeiro processando corretamente
- [ ] RLS policies protegendo dados

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique se aplicou as migrations em ordem
2. Verifique se não há duplicatas (mesma migration 2x)
3. Verifique charset/encoding do arquivo
4. Tente aplicar uma migration de cada vez
5. Consulte logs do Supabase

---

**Pronto para aplicar migrations!** 🚀
