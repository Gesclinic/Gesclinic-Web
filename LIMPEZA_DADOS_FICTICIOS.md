# 🧹 Guia de Limpeza de Dados Fictícios

Data: 2026-03-19

## ✅ Completado

### 1. ✓ Arquivos React Limpos
Os dados mock fictícios foram removidos dos seguintes arquivos:
- **src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx**
  - Removido: mockLucroPorMedico (4 profissionais fictícios)
  - Removido: mockRankingMedicos (4 profissionais fictícios)
  - Removido: mockMargemProcedimento (5 procedimentos fictícios)

- **src/pages/financeiro/RepasseAutomacaoPage.jsx**
  - Removido: logs com histórico fictício de automações/PIX

## 🚀 Próximos Passos: Limpar Banco de Dados Supabase

### Opção 1: Via Console Supabase (Recomendado)

1. Acesse o Supabase Dashboard: https://app.supabase.com
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Copie e execute o script de limpeza:

**Arquivo:** `supabase/migrations/20260319_CLEANUP_FICTIONAL_DATA.sql`

Ações que serão executadas:
```sql
-- Remove registros dos profissionais fictícios:
- Dr. João Silva (ID: desconhecido)
- Dra. Maria Santos (ID: desconhecido)
- Dr. Pedro Costa (ID: desconhecido)
- Dra. Ana Lima (ID: desconhecido)

-- E seus dados associados:
- Repasses (repasse_medico)
- Ajustes de repasse (repasse_ajuste)
- Configurações de repasse (repasse_config)
- Serviços profissionais (professional_services)
- Pagadores do profissional (professional_payers)
- Agendas do profissional (professional_schedules)
- Agendamentos criados por eles (appointments)
```

### Opção 2: Via PowerShell (Se tiver acesso API)

```powershell
# Ativar ambiente virtual
& ".\.venv\Scripts\Activate.ps1"

# Executar migração
powershell -ExecutionPolicy Bypass -File "scripts/apply_cleanup_migration.ps1"
```

### Opção 3: Verificar IDs Corretos Primeiro

Se não tiver certeza, execute esta query primeiro para verificar os IDs:

```sql
SELECT id, name, email, phone
FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);
```

## ⚠️ Cuidado

- Este script REMOVE dados permanentemente
- Faça backup antes de executar em produção
- Revise os dados encontrados antes de deletar
- Não há desfazer automático

## 📋 Checklist

- [ ] Verificar IDs dos profissionais via SQL (Opção 3)
- [ ] Confirmar que são realmente dados fictícios
- [ ] Executar script de limpeza
- [ ] Verificar que os dados foram removidos
- [ ] Testar aplicação com dados reais

## 🔍 Verificação Pós-Limpeza

Após executar a limpeza, verifique:

```sql
-- Verificar profissionais removidos
SELECT COUNT(*) FROM professionals 
WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima');

-- Deve retornar: 0

-- Verificar repasses removidos
SELECT COUNT(*) FROM repasse_medico 
WHERE professional_id NOT IN (SELECT id FROM professionals WHERE clinic_id = 'seu-clinic-id');
```

## 📝 Notas

- Os arquivos React já estão limpos de dados mock
- Quando integrados com dados reais da API, as análises funcionarão corretamente
- Não há dados de teste permanentes no código agora
