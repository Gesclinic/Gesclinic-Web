# 🎯 PASSO A PASSO: Limpar Dados Fictícios

**Tempo estimado:** 5 minutos

---

## ✅ PARTE 1: Limpeza do Código (JÁ FEITA)

```
✅ /src/pages/financeiro/RepasseDashboardAnalyticsPage.jsx - Limpo
✅ /src/pages/financeiro/RepasseAutomacaoPage.jsx - Limpo
✅ Mock data removido dos componentes
```

**Você pode fazer:**
```bash
npm run dev
# A aplicação agora não mostra mais dados fictícios
```

---

## 🗄️ PARTE 2: Limpar Banco de Dados Supabase (3 PASSOS)

### Passo 1️⃣ - Abra o Supabase Console

1. Acesse: https://app.supabase.com
2. Clique em seu projeto
3. No menu esquerdo, clique em **"SQL Editor"**
4. Clique em **"New Query"**

### Passo 2️⃣ - Verificar Dados

Copie e execute ESTA query primeiro:

```sql
SELECT id, name, email
FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);
```

**Você deve ver algo assim:**
```
id                   | name                | email
---------------------+--------------------+-------------------
uuid-123456          | Dr. João Silva      | joao@clinic.com
uuid-789012          | Dra. Maria Santos   | maria@clinic.com
uuid-345678          | Dr. Pedro Costa     | pedro@clinic.com
uuid-901234          | Dra. Ana Lima       | ana@clinic.com
```

✅ **Se aparecer 4 registros, pode prosseguir**

### Passo 3️⃣ - EXECUTAR LIMPEZA

Copie o script completo abaixo e execute no Supabase:

```sql
-- REMOVER DADOS FICTÍCIOS

DELETE FROM repasse_ajuste 
WHERE repasse_id IN (
  SELECT id FROM repasse_medico 
  WHERE professional_id IN (
    SELECT id FROM professionals 
    WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
  )
);

DELETE FROM repasse_medico 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM repasse_config 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM professional_services 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM professional_payers 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM professional_schedules 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM appointments 
WHERE professional_id IN (
  SELECT id FROM professionals 
  WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima')
);

DELETE FROM professionals 
WHERE name IN (
  'Dr. João Silva',
  'Dra. Maria Santos',
  'Dr. Pedro Costa',
  'Dra. Ana Lima'
);
```

✅ **Clique em "Run"** (ou Ctrl+Enter)

### Passo 4️⃣ - Verificar se foi Removido

Execute esta query para confirmar:

```sql
SELECT COUNT(*) as "Profissionais Restantes"
FROM professionals 
WHERE name IN ('Dr. João Silva', 'Dra. Maria Santos', 'Dr. Pedro Costa', 'Dra. Ana Lima');
```

**Resultado esperado:**
```
Profissionais Restantes
-----------------------
0
```

✅ **Se aparecer 0, você acabou!**

---

## 🎉 FIM!

### Resumo do que foi feito:

| Item | Status | Detalhes |
|------|--------|----------|
| Código React | ✅ Limpo | Mock data removida |
| Profissionais | ✅ Removidos | 4 profissionais fictícios deletados |
| Repasses | ✅ Removidos | Dados de pagamento fictício deletados |
| Agendamentos | ✅ Removidos | Appointments fictícios deletados |

---

## ❓ Se something errar

**Erro:** "Violates foreign key constraint"
**Solução:** Execute os DELETEs na ordem exata acima (começa com repasse_ajuste)

**Erro:** "0 rows deleted"
**Solução:** Os dados podem já ter sido removidos, ou estão com nome diferente

**Dúvidas?** Verifique os arquivos:
- `CONCLUSAO_LIMPEZA_DADOS.md`
- `LIMPEZA_DADOS_FICTICIOS.md`
