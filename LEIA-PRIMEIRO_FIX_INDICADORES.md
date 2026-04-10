# 🔧 FIX INDICADORES - INSTRUÇÕES

## Problema
Os indicadores da agenda não estão carregando porque as funções RPC (`get_agenda_indicators` e `get_professional_indicators`) não foram criadas no banco de dados.

## Solução

### Passo 1: Abra o Supabase
1. Acesse: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/editor
2. Clique em "SQL Editor" (já está aberto na aba)

### Passo 2: Cole o SQL
Abra o arquivo `FIX_INDICADORES.sql` nesta pasta e copie TODO o conteúdo.

Cole no editor SQL do Supabase (você vai limpar o que estava lá antes).

### Passo 3: Execute
Clique no botão **"Run"** (verde) para executar o SQL.

### Passo 4: Verifique
Abra o navegador em `http://localhost:3000/clinica/agenda` e verifique se os indicadores agora carregam.

## O que foi feito

- ✅ Recriou as 3 views necessárias:
  - `v_agenda_indicators_daily` - Indicadores operacionais
  - `v_agenda_time_indicators` - Indicadores de tempo
  - `v_agenda_financial_indicators` - Indicadores financeiros

- ✅ Recriou as 2 funções RPC:
  - `get_agenda_indicators()` - Retorna indicadores consolidados
  - `get_professional_indicators()` - Retorna indicadores por profissional

## Se der erro

Se aparecer erro sobre índice ou relação duplicada, é OK! As views são **CREATE OR REPLACE**, então vão atualizar automaticamente.

## Próximos passos

1. Refresh a página do navegador (F5)
2. Os indicadores devem aparecer agora
3. Se ainda tiver problema, verifique o console (F12) para ver o erro exato
