# 🔧 INSTRUÇÕES - FIX INDICADORES (Passo a Passo)

## ⚡ Resumo Rápido
Os indicadores não carregam porque as funções SQL não foram criadas. 

**Arquivo com SQL correto:** `FIX_INDICADORES_LIMPO.sql`

---

## 📋 Passo a Passo

### 1️⃣ Abra o Supabase
- URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/editor
- Você ja deve ter a aba aberta no navegador

### 2️⃣ Limpe o editor SQL
Clique na aba "SQL Editor" e **delete tudo** que está lá.

### 3️⃣ Copie o SQL novo
- Abra o arquivo: `FIX_INDICADORES_LIMPO.sql` nesta pasta
- **Selecione todo o conteúdo** (Ctrl+A)
- **Copie** (Ctrl+C)

### 4️⃣ Cole no Supabase
No editor SQL do Supabase:
- Clique no editor
- **Cole** (Ctrl+V)

### 5️⃣ Execute
Clique no botão **"Run"** (verde, no canto superior direito).

### 6️⃣ Verifique se funcionou
- Abra o navegador em: `http://localhost:3000/clinica/agenda`
- **F5** (refresh)
- Os indicadores devem aparecer agora ✅

---

## ❓ Se der erro

### Erro: "relation... already exists"
✅ **OK!** Significa que a view já existe. Isso é normal com `CREATE OR REPLACE VIEW`.

Apenas continue com os próximos comandos.

### Erro: "function... already exists"
✅ **OK!** Significa que a função já existe. Isso é normal.

Apenas continue com os próximos comandos.

### Erro: "table... does not exist"
❌ **Problema!** Significa que `appointments` ou outra tabela não existe.

Verifique se as migrations de agenda foram aplicadas antes.

### Erro no navegador: "RPC error" ou "No data"
Pode ser que a query retorne vazio (nenhum agendamento para hoje).

**Solução:**
1. Crie alguns agendamentos para hoje na agenda
2. Refresh a página

---

## 📊 O que será criado

**3 Views:**
- `v_agenda_indicators_daily` - Indicadores operacionais por dia
- `v_agenda_time_indicators` - Indicadores de tempo entre eventos
- `v_agenda_financial_indicators` - Indicadores de receita estimada

**2 Funções RPC (chamadas pelo frontend):**
- `get_agenda_indicators()` - Retorna todos os KPIs
- `get_professional_indicators()` - Retorna KPIs por profissional

---

## ✅ Próximo passo

Depois de executar o SQL:

1. Volte para o navegador
2. **F5** para refresh
3. Verifique se a seção "Indicadores da Agenda" agora carrega

Se ainda tiver problema, abra **DevTools (F12)** → **Console** para ver o erro exato.

