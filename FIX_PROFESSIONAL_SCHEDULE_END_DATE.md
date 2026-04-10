# 🔧 Correção: Professional Schedule Schema Error

## Problema Encontrado
**Erro**: "Could not find the 'end_date' column of 'professional_schedules' in the schema cache"

### Causa do Erro
- O código estava tentando salvar campos `start_date` e `end_date` na tabela `professional_schedules`
- Esses campos foram definidos em uma migração (`2026-02-14_add_date_range_to_professional_schedules.sql`)
- Porém, a migração **não havia sido aplicada no banco de dados**
- Isso causava erro ao tentar editar um profissional

## Solução Implementada

### ✅ Correções Aplicadas (Temporárias)
1. **professionalScheduleApi.js** - Removidos os campos `start_date` e `end_date` de:
   - `createProfessionalSchedule()`
   - `upsertSchedule()`  
   - `updateProfessionalSchedule()`

2. **ProfessionalScheduleTab.jsx** - Removidas as linhas que enviavam `start_date` e `end_date`:
   ```javascript
   // Removido:
   start_date: newSchedule.start_date || null,
   end_date: newSchedule.end_date || null,
   ```

### 🎯 O que fazer agora
#### Opção 1: Aplicar a Migração (Recomendado)
Para habilitar os campos de período, aplique a migração SQL no Supabase:

1. Abra o **Supabase Dashboard**: https://app.supabase.com
2. Selecione o projeto **Gesclinic**
3. Vá para **SQL Editor**
4. Clique em **+ New Query**
5. Cole o SQL abaixo e execute:

```sql
-- Adiciona campos de período (data inicial e final) aos horários dos profissionais
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE;

-- Criar índices para melhor performance nas buscas por data
CREATE INDEX IF NOT EXISTS idx_professional_schedules_start_date 
  ON professional_schedules(start_date);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_end_date 
  ON professional_schedules(end_date);

-- Criar índice composto para buscas por período
CREATE INDEX IF NOT EXISTS idx_professional_schedules_date_range 
  ON professional_schedules(start_date, end_date);
```

6. Após executar com sucesso, **recarregue o navegador**

#### Opção 2: Usar Temporariamente sem os Campos de Data
- Os horários dos profissionais funcionarão normalmente
- Apenas os campos de "data inicial/final" não estarão disponíveis por enquanto
- Após aplicar a migração (Opção 1), basta descomentar o código no `professionalScheduleApi.js`

## Próximas Etapas

### Quando a migração for aplicada:
Descomente os campos `start_date` e `end_date` nos seguintes arquivos:
- `src/lib/professionalScheduleApi.js` (3 funções)
- `src/components/base-sistema/ProfessionalScheduleTab.jsx` (1 lugar)

### Script para Reativar (após aplicar migração):
Você pode executar o script abaixo para reverter as mudanças:
```powershell
# No arquivo src/lib/professionalScheduleApi.js
# Adicione novamente: start_date e end_date
```

## Status
- ✅ Erro imediato: **CORRIGIDO** (app pode editar profissionais)
- ⏳ Funcionalidade de período: **Aguardando migração** (aplicar em Supabase)
- 📋 Teste em desenvolvimento: Recarregue o navegador após aplicar a migração

---
**Última atualização**: 2026-02-17
