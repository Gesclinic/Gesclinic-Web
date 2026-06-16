# ⚡ QUICK REFERENCE - Testes Phase 1-3 Completa

## 🚀 30 SEGUNDOS - O que funciona agora

```
✅ Abra um agendamento
✅ Veja seção "ITENS DO ATENDIMENTO"
✅ Clique "+ Adicionar Procedimento"
✅ Digite nome de um serviço
✅ Veja autocomplete buscar
✅ Clique "Cancelar" para sair
```

---

## 🧪 PRÓXIMO TESTE - Adicionar Item (10 min)

### PASSO 1: Encontre um Serviço
**No Supabase SQL Editor, execute**:
```sql
SELECT name FROM services 
WHERE clinic_id = '6e8f0edd-2f1f-40c6-8c56-95c8c9d9c9a1'
  AND deleted_at IS NULL
LIMIT 5;
```
👉 Copie um nome (ex: "Consulta Clínica")

### PASSO 2: Teste a Busca
1. Abra agendamento
2. Clique "+ Adicionar Procedimento"
3. Cole o nome do serviço
4. Veja autocomplete encontrar ✅

### PASSO 3: Adicione o Item
1. Clique no item da lista
2. Veja preencher: Qtde=1, Valor, Desconto=0
3. Clique "Adicionar"
4. **Esperado**: Modal fecha, item aparece no grid

### PASSO 4: Verifique Grid
Procure por:
```
Código | Descrição | Qtde | Valor Unit | Desconto | Total | Ações
```

### PASSO 5: Salve & Valide
1. Clique "Salvar Dados"
2. No Supabase, execute:
```sql
SELECT * FROM appointment_items 
WHERE appointment_id = 'ID_DO_AGENDAMENTO';
```
3. Deve aparecer 1 row ✅

---

## 🔍 TROUBLESHOOTING RÁPIDO

| Problema | Solução |
|----------|---------|
| "Nenhum procedimento encontrado" | Executar SQL query acima, escolher nome real |
| Grid não aparece | Recarregar página (F5) |
| Botão não clica | Limpar cache (Ctrl+Shift+Delete) |
| Dados não salvam | Verificar console (F12) para erros |

---

## 📊 ARQUIVOS A MONITORAR

| Arquivo | O que monitora |
|---------|-------------------|
| Browser Console (F12) | Erros JavaScript, logs de API |
| Supabase Dashboard | appointment_items rows |
| VS Code Terminal | Vite HMR errors |

---

## 🎯 ORDEM DOS TESTES (Recomendado)

1. **Verificar serviços** (SQL query)
2. **Testar busca** (autocomplete)
3. **Testar adição** (add item)
4. **Verificar grid** (visual)
5. **Salvar agendamento** (persistence)
6. **Recarregar página** (data consistency)
7. **Testar edição** (update qty/price)
8. **Testar exclusão** (delete item)

---

## 💻 COMANDOS ÚTEIS

### Verificar clinic_id correto
```sql
SELECT id, name FROM clinics WHERE deleted_at IS NULL LIMIT 1;
```

### Listar todos os serviços
```sql
SELECT id, name, code, tuss_code, unit_price 
FROM services 
WHERE clinic_id = 'SUBSTITUIR_POR_CLINIC_ID'
  AND deleted_at IS NULL
ORDER BY name;
```

### Ver appointment_items adicionados
```sql
SELECT ai.*, a.appointment_date 
FROM appointment_items ai
JOIN appointments a ON ai.appointment_id = a.id
WHERE a.clinic_id = 'SUBSTITUIR_POR_CLINIC_ID'
ORDER BY ai.created_at DESC;
```

### Limpar dados de teste
```sql
DELETE FROM appointment_items 
WHERE appointment_id IN (
  SELECT id FROM appointments 
  WHERE clinic_id = 'SUBSTITUIR_POR_CLINIC_ID'
    AND appointment_date >= CURRENT_DATE
)
AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 hour';
```

---

## 📱 VERIFICAÇÕES VISUAIS

### Component Renderizado ✅
- [ ] "📋 ITENS DO ATENDIMENTO" visível
- [ ] "+ Adicionar Procedimento" azul e clicável
- [ ] Mensagem "Nenhum procedimento adicionado..."

### Modal Abre ✅
- [ ] Título: "Adicionar Procedimento"
- [ ] Input: "Buscar por nome ou código..."
- [ ] Botões: "Cancelar" e "Adicionar"

### Autocomplete Funciona ✅
- [ ] Digita → aparecem sugestões
- [ ] Clica → seleciona
- [ ] Campos preenchem (Qtde, Valor)

### Grid Mostra Itens ✅
- [ ] Cabeçalho: Código|Descrição|Qtde|...
- [ ] Linha com dados do serviço
- [ ] Footer com totais
- [ ] Ações (✏️ editar, ✕ deletar)

---

## ✅ CHECKLIST FINAL PHASE 1-3

- [x] Database schema criado
- [x] API layer implementado
- [x] React component criado
- [x] Component integrado na modal
- [x] Component renderiza corretamente
- [x] Botão funciona
- [x] Modal abre
- [ ] Próximo: Adicionar item completo
- [ ] Próximo: Validar persistência
- [ ] Próximo: Implementar ETAPA 4 (Financial)

---

## 🎁 BONUS - Monitorar em Real-Time

### No Browser Console (F12 → Console tab)
```javascript
// Ver logs de API calls
window.localStorage.setItem('debug', 'appointmentItemsApi:*');

// Monitorar state changes
console.log('agendamentoData.id:', agendamentoData?.id);
console.log('appointmentId:', appointmentId);
```

### No Supabase Dashboard
- Ir para: SQL Editor
- Executar query de verificação a cada teste
- Ver em tempo real os dados sendo inseridos

---

**Última Atualização**: 2026-06-01  
**Status**: Ready for Phase 1-3 Full Testing  
**Próximo**: Execute o primeiro teste de adição!
