# 🚀 PRÓXIMO PASSO - Teste de Adição Completa

## 🎯 OBJETIVO
Testar a adição COMPLETA de um item de serviço: selecionar → confirmar → renderizar → salvar

## ⚠️ PROBLEMA ENCONTRADO
Ao buscar "Consulta", obtive: **"Nenhum procedimento encontrado"**

### Causas Possíveis:
1. Serviço "Consulta" não existe na tabela `services`
2. Nome do serviço é diferente (ex: "Consulta Clínica", "Consulta Geral")
3. Sem serviços cadastrados na clínica

## ✅ SOLUÇÃO
Verificar quais serviços existem no banco de dados da clínica.

### OPÇÃO 1: Verificar via Supabase UI
```
1. Abrir: https://supabase.com
2. Conectar ao projeto
3. Navegar para tabela "services"
4. Procurar serviços com clinic_id do usuário logado
5. Anotar nomes exatos dos serviços
```

### OPÇÃO 2: Query via SQL (Recomendado)
Executar no Supabase SQL Editor:
```sql
SELECT id, name, code, tuss_code, clinic_id 
FROM services 
WHERE clinic_id = 'ID_DA_CLINICA' 
  AND deleted_at IS NULL
LIMIT 10;
```

### OPÇÃO 3: Inserir serviço de teste
Se não houver serviços, criar um:
```sql
INSERT INTO services (clinic_id, name, code, tuss_code, description)
VALUES (
  'ID_DA_CLINICA',
  'Consulta Clínica',
  '0101',
  '7.01.03.00-2',
  'Consulta Clínica'
)
RETURNING *;
```

## 🔍 PRÓXIMOS TESTES APÓS IDENTIFICAR SERVIÇO

### TESTE 1: Selecionar Serviço
```
1. Clicar "+ Adicionar Procedimento"
2. Digitar nome do serviço (ex: "Consulta Clínica")
3. Verificar que aparece na lista de autocompletar
4. Clicar para selecionar
```

### TESTE 2: Preenchimento de Campos
Após selecionar serviço, verificar:
```
[ ] Campo "Quantidade" = 1 (padrão)
[ ] Campo "Valor Unit." = carregado da service
[ ] Campo "Desconto" = 0 (padrão)
[ ] Total é calculado: Quantidade * Valor - Desconto
```

### TESTE 3: Adicionar Item
```
1. Clicar botão "Adicionar"
2. Esperar processamento (API call)
3. Modal fecha automaticamente
4. Grid mostra nova linha com serviço adicionado
5. Footer mostra totais atualizados
```

### TESTE 4: Salvar Agendamento
```
1. Clicar "Salvar Dados"
2. Verificar no Supabase se row foi criada em "appointment_items"
3. Recarregar página
4. Verificar se item persiste (data consistency)
```

## 📊 VERIFICAÇÕES NECESSÁRIAS

### Console do Browser (F12)
Procurar por:
- ❌ Erros de JavaScript (red messages)
- ⚠️ Warnings de RLS (permission denied)
- ✅ Logs de API calls (getAppointmentItems, createAppointmentItem)

### Supabase Admin
Tabelas a verificar:
1. `services` - Há serviços cadastrados?
2. `appointment_items` - Novas rows após adicionar?
3. `appointments` - appointment_id correto?

## 🎯 ORDEM RECOMENDADA

1. **IMEDIATO**: Verificar quais serviços existem
2. **5 min**: Se não existem, inserir serviço de teste
3. **10 min**: Testar busca/seleção novamente
4. **15 min**: Se funcionar, testar adição completa
5. **20 min**: Verificar persistência no Supabase

## 💡 COMANDO RÁPIDO PARA VERIFICAR

No Supabase SQL Editor:
```sql
-- Ver serviços da clínica
SELECT COUNT(*) as total_services FROM services 
WHERE clinic_id = '6e8f0edd-2f1f-40c6-8c56-95c8c9d9c9a1'  -- Substituir por clinic_id correto
  AND deleted_at IS NULL;

-- Ver detalhes dos serviços
SELECT id, name, code, tuss_code, unit_price 
FROM services 
WHERE clinic_id = '6e8f0edd-2f1f-40c6-8c56-95c8c9d9c9a1'
  AND deleted_at IS NULL
ORDER BY name
LIMIT 5;
```

---

**Próximo comando**: Verificar serviços disponíveis no banco!
