# 🚀 GUIA PASSO-A-PASSO: Feriados 2026

## PASSO 1: Aplicar Fix do Banco (OBRIGATÓRIO)

### 1.1 Abra Supabase
https://supabase.com/dashboard

### 1.2 Entre no projeto Gesclinic

### 1.3 Vá para SQL Editor
```
Left Menu → SQL Editor
```

### 1.4 Novo Query
```
Click "+" ou "New Query"
```

### 1.5 Cole o código
Abra o arquivo `⚡_SQL_FIX_HOLIDAYS_RLS.sql` e cole TUDO.

**Seu SQL Editor deve ter 70+ linhas de código**

### 1.6 Execute
Clique no botão verde **RUN** (canto superior direito)

### 1.7 Verifique o resultado
Deve aparecer:
```
✅ 3 rows
3 policies were found
```

**Se deu erro:** Veja a mensagem abaixo do editor (em vermelho)

---

## PASSO 2: Testar na Aplicação

### 2.1 Abra Terminal
```
PowerShell / CMD
```

### 2.2 Vá para a pasta do projeto
```powershell
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
```

### 2.3 Inicie o servidor
```powershell
npm run dev
```

**Espere aparecer:**
```
➜  Local:   http://localhost:3001/
```

### 2.4 Abra no browser
```
http://localhost:3001
```

### 2.5 Abra DevTools
```
F12  ou  Ctrl+Shift+I
```

### 2.6 Vá para Console
```
DevTools → Console (aba)
```

---

## PASSO 3: Navegar para Agenda

### 3.1 Login
- Digite suas credenciais
- Click "Login"

### 3.2 Ir para Agenda
```
Menu → Clínica → Agenda
  ou
http://localhost:3001/clinica/agenda
```

### 3.3 Esperar logs
No Console (F12) você vai ver aparecer:

```javascript
🌱 [Seed] Iniciando seed de feriados 2026
📋 [Seed] Total de feriados a inserir: 12
(aguarde 2-3 segundos)
✅ [Seed] Feriados 2026 inseridos/atualizados com sucesso
📊 [Seed] Total de feriados nacionais em 2026: 12
```

---

## PASSO 4: Verificar se Funcionou

### 4.1 Logs no Console
Procure por:
- ✅ (verde) = SUCESSO
- ❌ (vermelho) = ERRO

Se tiver erro, copie a mensagem e imprima ela.

### 4.2 Debug Banner na Tela
Procure por um box cinza escuro no topo com esse conteúdo:

```
[AGENDA DEBUG]
Feriados encontrados: 12
Datas com feriado: 2026-01-01, 2026-02-13, 2026-02-14, 2026-02-17, 2026-04-03, 2026-04-21, 2026-05-01, 2026-09-07, 2026-10-12, 2026-11-02, 2026-11-20, 2026-12-25
```

---

## ✅ PRONTO!

Se viu tudo acima com ✅, o sistema de feriados está funcionando!

### Os feriados agora estão bloqueados:
- 01/01 - Confraternização Universal
- 13/02 - Carnaval
- 14/02 - Sexta-feira de Carnaval
- 17/02 - Terça-feira de Carnaval
- 03/04 - Sexta-feira Santa
- 21/04 - Tiradentes
- 01/05 - Dia do Trabalho
- 07/09 - Independência
- 12/10 - Nossa Senhora Aparecida
- 02/11 - Finados
- 20/11 - Consciência Negra
- 25/12 - Natal

---

## 🐛 Se Algo Deu Errado

### Erro no SQL (no Supabase)
```
Error: syntax error in ...
```
**Solução:** Verifique se copiou o código completo. Tente novamente.

### Console mostra erro
```
❌ [Seed] Erro: invalid request body
```
**Solução:** Execute o SQL fix novamente (Passo 1)

### Console vazio (sem logs de seed)
**Solução:** 
1. F5 para recarregar a página
2. Ou abra em modo Incognito (Ctrl+Shift+N)
3. Login novamente
4. Vá para Agenda

### Debug banner vazio
**Solução:** 
1. Espere 3-5 segundos
2. Recarregue (F5)
3. Verifique se está em `/clinica/agenda`

---

## 📞 Debug Avançado

Se ainda não funcionar, execute no Console:

```javascript
// Ver todos os feriados no banco
const result = await fetch('/api/holidays', {method: 'GET'}).then(r => r.json());
console.log(result);
```

Ou vá direto no Supabase e execute:
```sql
SELECT * FROM holidays WHERE scope = 'NACIONAL' LIMIT 5;
```

Deve retornar 5 feriados com `clinic_id = NULL`.

---

**Status:** ✅ Pronto para usar
**Data:** 30 de janeiro de 2026

