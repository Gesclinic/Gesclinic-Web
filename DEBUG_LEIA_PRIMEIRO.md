# 🔍 DEBUG - INDICADORES NÃO ABREM

## Problema
Os indicadores estão retornando erro "Não foi possível carregar os indicadores"

## Solução
Execute o arquivo `DEBUG_INDICADORES.sql` no Supabase para diagnosticar o problema.

### Passo a Passo

1. **Abra o Supabase SQL Editor**
   - URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/editor

2. **Copie o arquivo DEBUG_INDICADORES.sql**
   - Abra `DEBUG_INDICADORES.sql` nesta pasta
   - Selecione todo o conteúdo (Ctrl+A)
   - Copie (Ctrl+C)

3. **Cole no Supabase**
   - Cole (Ctrl+V) no editor SQL

4. **Execute (RUN)**
   - Clique no botão "Run" verde

5. **Analise os resultados**
   - Procure por erros ou dados vazios
   - Verifique se há agendamentos para hoje
   - Verifique se as funções foram criadas

## O que cada seção testa

| Seção | O que faz |
|-------|-----------|
| 1 | Verifica se as RPCs existem |
| 2 | Verifica se as views foram criadas |
| 3 | Conta agendamentos para hoje |
| 4 | Testa a view de indicadores |
| 5 | Testa a RPC principal |
| 6 | Mostra quantos agendamentos existem |
| 7 | Mostra exemplos de agendamentos |

## Cenários Possíveis

### Cenário 1: Nenhum agendamento para hoje
Se a seção 3 retornar **0 resultados**, é normal que os indicadores estejam vazios.
**Solução:** Crie agendamentos para hoje na agenda.

### Cenário 2: RPCs não existem
Se a seção 1 não mostrar as funções, as funções não foram criadas.
**Solução:** Execute o `FIX_INDICADORES_LIMPO.sql` novamente (sem erros desta vez).

### Cenário 3: RPCs existem mas retornam erro
Se houver erro na seção 5, há um problema na query.
**Solução:** Verifique o erro exato e nos avise.

### Cenário 4: Tudo funciona no SQL mas não no app
Se os testes retornarem dados mas o app ainda mostra erro:
**Solução:** Pressione F5 para refresh do navegador e abra DevTools (F12) para ver o erro exato.
