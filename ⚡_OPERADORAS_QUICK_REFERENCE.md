⚡ **REFERÊNCIA RÁPIDA - OPERADORAS DE CARTÃO**

## 🚀 3 PASSOS PARA ATIVAR

### 1. SQL CREATE TABELA
```sql
CREATE TABLE card_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  settlement_day INT NOT NULL CHECK (settlement_day >= 1 AND settlement_day <= 31),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, name)
);
ALTER TABLE card_processors ENABLE ROW LEVEL SECURITY;
CREATE POLICY card_processors_clinic_isolation ON card_processors FOR SELECT 
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY card_processors_insert ON card_processors FOR INSERT 
  WITH CHECK (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY card_processors_update ON card_processors FOR UPDATE 
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');
CREATE POLICY card_processors_delete ON card_processors FOR DELETE 
  USING (clinic_id = auth.jwt() ->> 'clinic_id' OR auth.jwt() ->> 'role' = 'admin');
```

### 2. SQL ADD COLUNA
```sql
ALTER TABLE clinic_payment_cards 
ADD COLUMN processor_id UUID REFERENCES card_processors(id) ON DELETE SET NULL;
```

### 3. SQL INSERT DADOS
```sql
INSERT INTO card_processors (clinic_id, name, settlement_day, notes) VALUES 
  ('{clinicId}', 'STONE', 1, 'D+1'),
  ('{clinicId}', 'PAGBANK', 1, 'D+1-D+2'),
  ('{clinicId}', 'PAGSEGURO', 15, '15º'),
  ('{clinicId}', 'MERCADO PAGO', 1, 'D+1-D+3');
```

---

## 📍 ONDE USAR NO APP

| Ação | Caminho |
|------|---------|
| **Gerenciar Operadoras** | Financeiro > Estrutura > Operadoras |
| **Editar Cartão + Operadora** | Financeiro > Estrutura > Cartões |
| **Rotas** | `/clinica/financeiro/cartoes-operadoras` |

---

## 📦 ARQUIVOS CRIADOS

| Arquivo | Linhas | Descrição |
|---------|--------|-----------|
| `cardProcessorsApi.js` | 100 | CRUD de operadoras |
| `CartasOperadorasPage.jsx` | 320 | Página CRUD operadoras |
| `2026-01-17_create_card_processors.sql` | 35 | CREATE TABLE |
| `2026-01-17_add_processor_to_cards.sql` | 5 | ADD COLUMN |

---

## 🔧 ARQUIVOS MODIFICADOS

- `CartasPage.jsx` - +30 linhas (integrou operadora)
- `AppRoutes.jsx` - +2 linhas (nova rota)
- `menu.js` - +8 linhas (novo menu item)

---

## 📊 MODELO DE DADOS

```javascript
// card_processors
{
  id: "uuid",
  clinic_id: "uuid",
  name: "STONE",           // Operadora
  settlement_day: 1,       // Crédita dia 1 do mês
  notes: "D+1 próximo útil",
  is_active: true,
  created_at: "2026-01-17",
  updated_at: "2026-01-17"
}

// clinic_payment_cards (atualizado)
{
  ...cartão,
  processor_id: "uuid"     // FK para card_processors
}
```

---

## ✅ TESTES

- [ ] SQL 1 execute sem erro
- [ ] SQL 2 execute sem erro  
- [ ] SQL 3 insira 4 operadoras
- [ ] Página operadoras carregue
- [ ] Crie operadora Stone
- [ ] Edite operadora (mude dia 1→15)
- [ ] Delete operadora
- [ ] Em Cartões, selecione operadora ao criar
- [ ] Operadora apareça vinculada no cartão

---

## 🎯 PRÓXIMA FASE

Integrar `settlement_day` da operadora ao calcular data de recebimento em ARs

---

**Documentação Completa:** `⚡_OPERADORAS_CARTAO_RESUMO_COMPLETO.md`
**Teste Rápido:** `⚡_OPERADORAS_TESTE_RAPIDO_5MIN.md`
**Diagrama:** `⚡_OPERADORAS_DIAGRAMA_ARQUITETURA.md`
