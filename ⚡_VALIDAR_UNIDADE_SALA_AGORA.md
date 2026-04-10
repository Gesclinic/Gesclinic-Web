🚀 QUICK START: Validar Implementação Unidade/Sala Independentes

═══════════════════════════════════════════════════════════════

## ⚡ 3 Passos para Ativar Feature

### Passo 1: Aplicar Migração SQL (OBRIGATÓRIO)
```powershell
# Via Supabase Dashboard:
1. Abra o SQL Editor do seu projeto
2. Cole o conteúdo de: supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql
3. Execute e confirme com "✓ Success"

# OU via psql (se tiver instalado):
psql -h seu_host.supabase.co -U postgres -d seu_db -f "supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql"
```

### Passo 2: Verificar Estrutura no Código
✅ Feito e validado:
- [x] professionalScheduleApi.js - Todas as funções incluem unit_name
- [x] ProfessionalScheduleTab.jsx - Componente com dois campos
- [x] Validação duplicata - Verifica unit_name + room_id

### Passo 3: Testar no Browser
```
1. npm run dev
2. Navegue até: /clinica/base-sistema/profissionais
3. Abra modal de profissional existente
4. Clique em aba "Disponibilidades"
5. Adicione novo horário:
   - Unidade: "Matriz" (ou qualquer texto)
   - Sala: Selecione dropdown
   - Dia: Escolha
   - Horas: Configure
6. Clique "Salvar"
7. ✅ Deve aparecer na tabela com 2 colunas separadas
```

## 📋 Checklist Antes de Ir para Produção

- [ ] Migração SQL aplicada (confirme no Supabase)
- [ ] npm run dev funciona sem erros
- [ ] Modal de profissionais abre
- [ ] Aba "Disponibilidades" carrega
- [ ] Formulário mostra 2 campos distintos
- [ ] Salva com sucesso
- [ ] Tabela exibe Unidade e Sala em colunas separadas
- [ ] Edit de horário carrega unit_name corretamente
- [ ] Delete de horário funciona
- [ ] Validação de duplicata funciona (mesmo unit + room + day + time)

## 🔍 Verificações de Dados

### Ver dados gravados no banco:
```sql
-- No Supabase SQL Editor:
SELECT 
  id, 
  professional_id, 
  unit_name, 
  room_id, 
  day_of_week, 
  start_time, 
  end_time,
  active
FROM professional_schedules 
WHERE clinic_id = 'seu-clinic-id'
LIMIT 10;
```

### Limpar dados de teste (se necessário):
```sql
DELETE FROM professional_schedules 
WHERE unit_name IS NULL OR unit_name = '';
```

## ⚠️ Troubleshooting

### Erro: "unit_name column does not exist"
→ Migração não foi aplicada. Faça o Passo 1 acima.

### Erro: "null value in column room_id"
→ Validação no componente não está funcionando. Cheque console.

### Tabela mostra valores vazios
→ Dados antigos têm unit_name=NULL. Isso é normal, valores novos terão dados.

### Duplicata validation não funciona
→ Verificar se ambos validationDuplicate e form estão em sync.

## 📊 Impacto da Mudança

**Antes (Combinado):**
- Uma coluna "Sala/Unidade"
- Difícil rastrear múltiplas unidades por sala

**Depois (Independente):**
- Duas colunas: "Unidade" e "Sala"
- Permite: Mesma sala em diferentes unidades
- Facilita: Filtros e relatórios por unidade/sala

## 🎯 Feature Completa Agora Suporta

✅ Adicionar horário com Unidade + Sala específicas
✅ Editar e manter ambos os campos
✅ Deletar horários
✅ Validação de duplicata por unidade+sala+dia+hora
✅ Tabela com visualização clara de ambos os campos

═══════════════════════════════════════════════════════════════
Autor: Agent Updates
Status: ✅ PRONTO PARA VALIDAÇÃO
Data: 2026-02-14
