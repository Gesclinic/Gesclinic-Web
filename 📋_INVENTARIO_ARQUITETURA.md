# 📊 INVENTÁRIO - ARQUITETURA DE DADOS & IMPACTO NO ESTOQUE

## 1. ONDE SERÁ REGISTRADO?

### **Tabelas no Supabase:**

```
┌─────────────────────────────────────────────────────────┐
│         STOCK_INVENTORIES (CABEÇALHO)                   │
├─────────────────────────────────────────────────────────┤
│ • id (UUID)                                             │
│ • clinic_id (referência clínica)                       │
│ • location_id (LOCAL onde o inventário foi feito)      │
│ • inventory_date (data do inventário)                  │
│ • conducted_by (quem fez - ex: "Fernando Cooper")      │
│ • reason (motivo - auditoria, reconciliação, etc)     │
│ • scope (completo/parcial/spot_check)                 │
│ • status (em_progresso → concluído → finalizado)      │
│ • notes (observações)                                  │
│ • created_at, updated_at                              │
└─────────────────────────────────────────────────────────┘
            │
            ├──→ REGISTRA O INVENTÁRIO
            │    (quando você clica "Iniciar Inventário")
            │
            └──→ Cada linha = 1 Inventário
```

### **Fluxo de Registri:**

```
1. CRIAR (stock_inventories)
   └─→ Status: "em_progresso"
   └─→ Salva: data, local, responsável, motivo, escopo
   └─→ NÃO AFETA ESTOQUE AINDA

2. ADICIONAR ITENS (stock_inventory_items)
   └─→ Para cada item contado:
   └─→ Salva: item_id, quantidade_contada, observações
   └─→ NÃO AFETA ESTOQUE AINDA

3. FINALIZAR (Quando clica "Finalizar Inventário")
   └─→ Status: "finalizado"
   └─→ AQUI SIM: Compara contagem com saldo do sistema
   └─→ SE DIFERENÇA:
       ├─→ Aumento: Cria movimento do tipo "entry" (entrada ajuste)
       ├─→ Redução: Cria movimento do tipo "exit" (saída ajuste)
       └─→ AFETA O SALDO DE ESTOQUE
```

---

## 2. QUAL IMPACTO NO ESTOQUE? 💥

### **Antes de Finalizar:**
- ✅ Inventário está "em_progresso"
- ✅ ZERO impacto no estoque
- ✅ Você pode editar, remover itens, cancelar

### **Ao Finalizar:**
- ❌ Inventário muda para "finalizado"
- ❌ **IMPACTO CRÍTICO**: Sistema recalcula balances

**Exemplo:**

```
SISTEMA DIZ: Curativo X disponível = 100 unidades
VOCÊ CONTOU: Existem apenas 87 unidades

DIFERENÇA: -13 unidades (faltam 13!)

O QUÊ ACONTECE:
├─→ Sistema CRIA automaticamente:
│   ├─→ 1 movimento de SAÍDA (adjustment)
│   ├─→ Quantidade: -13 unidades
│   ├─→ Referência: Inventário #XYZ
│   └─→ Motivo: "Reconciliação por contagem física"
│
└─→ Novo balanço:
    100 - 13 = 87 unidades   ✅ Conciliado!
```

---

## 3. BANCO DE DADOS SCHEMA (A SER CRIADO)

```sql
-- Cabeçalho do inventário
CREATE TABLE stock_inventories (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  location_id UUID NOT NULL,
  
  inventory_date DATE,
  conducted_by TEXT,
  reason VARCHAR(50), -- auditoria, reconciliacao, etc
  scope VARCHAR(50),  -- completo, parcial, spot_check
  
  status VARCHAR(50) DEFAULT 'em_progresso',
  -- em_progresso → concluído → finalizado
  
  notes TEXT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  finalized_at TIMESTAMP -- Quando foi finalizado
);

-- Itens do inventário (o que foi contado)
CREATE TABLE stock_inventory_items (
  id UUID PRIMARY KEY,
  inventory_id UUID NOT NULL,
  stock_item_id UUID NOT NULL,
  
  qty_counted DECIMAL,    -- Quantidade contada fisicamente
  qty_system DECIMAL,     -- Quantidade que o sistema tinha
  qty_variance DECIMAL,   -- Diferença (contada - sistema)
  
  observations TEXT,
  
  created_at TIMESTAMP
);
```

---

## 4. TABELAS AFETADAS

### **stock_inventories**
- ✅ CRIADA: Novo registro quando "Iniciar Inventário"
- ✅ ALTERADA: Status muda para "finalizado" depois
- ✅ AUDITADA: Todas as mudanças registradas

### **stock_inventory_items**
- ✅ CRIADA: Cada item contado
- ✅ CONSULTADA: Ao finalizar, para calcular diferenças

### **stock_movements**
- ✅ CRIADA: Movimentos de ajuste (quando finaliza)
- 📝 REFERÊNCIA: Aponta para o inventário que originou o ajuste

### **stock_items** (Saldo)
- ⚠️ **AFETADA AQUI**: Saldo é recalculado!
- Fórmula: `saldo_anterior + movimentos_de_ajuste`

---

## 5. PERMISSÕES & AUDITORIA

### **Quem pode fazer inventário?**
- ✅ Admin da clínica
- ✅ Gestor de estoque
- ❌ Não: Assistentes com apenas visualização

### **Auditoria**
```
Cada inventário registra:
├─ Quem fez (conducted_by)
├─ Quando fez (inventory_date)
├─ Onde (location_id)
├─ Por quê (reason)
├─ O quê foi contado (stock_inventory_items)
└─ Quando foi finalizado (finalized_at)
```

---

## 6. WORKFLOW VISUAL

```
┌─────────────────────────────────────────────────────────┐
│ USUÁRIO CLICA "NOVO INVENTÁRIO"                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ InventoryDialog Abre                                    │
│ • Se lecciona LOCAL                                     │
│ • Selecciona MOTIVO (auditoria, reconciliação, etc)    │
│ • Selecciona ESCOPO (completo/parcial)                 │
│ • Adiciona NOTAS                                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ CRIAR em stock_inventories                              │
│ status = "em_progresso"                                 │
│ → ZERO impacto no estoque                              │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ PÁGINA DE CONTAGEM (próxima implementar)                │
│ • Lista todos os itens da clínica                       │
│ • Campo: Quantidade contada                             │
│ • Campo: Observações                                    │
│ • Salva em stock_inventory_items                        │
│ → AINDA ZERO impacto no estoque                        │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ USUÁRIO CLICA "FINALIZAR INVENTÁRIO"                   │
│ ⚠️ PONTO DE NÃO RETORNO                                │
│                                                         │
│ Sistema:                                                │
│ 1. Compara qty_counted vs qty_system                   │
│ 2. Para cada diferença:                                 │
│    ├─ Cria movimento de ajuste em stock_movements      │
│    └─ Atualiza saldo em stock_items                    │
│ 3. Status → "finalizado"                               │
│                                                         │
│ → ⚡️ AQUI SIM: ESTOQUE É AFETADO                      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ RESULTADO: ESTOQUE CONCILIADO ✅                        │
│                                                         │
│ Novo saldo = Saldo anterior + Movimentos de ajuste     │
└─────────────────────────────────────────────────────────┘
```

---

## 7. RESUMO

| Aspecto | Detalhes |
|---------|----------|
| **Onde registra?** | Tabela `stock_inventories` + `stock_inventory_items` |
| **Quando afeta estoque?** | APENAS ao clicar "Finalizar" |
| **Qual tabela afeta?** | `stock_items` (saldo) e `stock_movements` (histórico) |
| **Tipo de registro?** | Movimento do tipo "adjustment" com referência ao inventário |
| **Reversível?** | Não (finalizado é permanente, mas pode criar novo inventário depois) |
| **Auditagem?** | Completa - rastreia quem, quando, onde, por que, o quê |
| **Permissão necessária?** | `estoque.inventario` |

---

## ✨ PRÓXIMAS AÇÕES

1. **Criar migration** para `stock_inventories` e `stock_inventory_items`
2. **Criar API** (`stockInventoriesApi.js`)
3. **Criar página de contagem** (para adicionar itens)
4. **Implementar lógica de finalização** (que cria ajustes)
5. **Integrar no Inventario.jsx**
