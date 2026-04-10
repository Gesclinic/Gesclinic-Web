# ⚡ AÇÃO IMEDIATA: 3 Passos (8 minutos)

## ✅ SE VOCÊ QUER APENAS OS FERIADOS FUNCIONANDO

Faça APENAS isto (não leia documentação):

---

## 1️⃣ SUPABASE SQL (5 MINUTOS)

**VAI AQUI:**
```
https://supabase.com/dashboard
→ Seu projeto
→ SQL Editor (menu esquerdo)
→ "+" (novo query)
```

**COLE ISTO:**
Abra o arquivo: `⚡_SQL_FIX_HOLIDAYS_RLS.sql`
Copie TODO o conteúdo (ctrl+a, ctrl+c)

**PASTE NO SQL EDITOR** (ctrl+v)

**CLIQUE:** RUN (botão verde, canto superior direito)

**ESPERE:** Deve dizer ✅ "3 rows"

---

## 2️⃣ REINICIAR APP (2 MINUTOS)

Terminal:
```powershell
npm run dev
```

Browser:
```
http://localhost:3001
```

Login →  Agenda (/clinica/agenda)

---

## 3️⃣ VERIFICAR (1 MINUTO)

Abra DevTools:
```
F12
```

Vá para Console (aba)

**PROCURE POR:**
```
✅ [Seed] Feriados 2026 inseridos/atualizados com sucesso
```

Se ver isso → **PRONTO!** 🎉

---

## ✅ PRONTO QUANDO VOCÊ VIR:

### Console (F12):
```
🌱 [Seed] Iniciando seed de feriados 2026
✅ [Seed] Feriados 2026 inseridos/atualizados com sucesso
✅ Feriados encontrados: 12
🎯 Retornando 12 datas com feriado: 2026-01-01, 2026-02-13, ...
```

### Debug Banner (topo da página):
```
Feriados encontrados: 12
Datas com feriado: 2026-01-01, 2026-02-13, 2026-02-14, ...
```

---

## 🎁 RESULTADO:

12 feriados agora bloqueados na agenda:
- ✅ 01/01 - Confraternização
- ✅ 13/02 - Carnaval
- ✅ 14/02 - Sexta-feira Carnaval
- ✅ 17/02 - Terça-feira Carnaval
- ✅ 03/04 - Sexta-feira Santa
- ✅ 21/04 - Tiradentes
- ✅ 01/05 - Dia do Trabalho
- ✅ 07/09 - Independência
- ✅ 12/10 - Nossa Senhora Aparecida
- ✅ 02/11 - Finados
- ✅ 20/11 - Consciência Negra
- ✅ 25/12 - Natal

---

## 🔴 SE ALGO NÃO FUNCIONAR:

### Erro no SQL (Supabase)
❌ Você não copiou tudo
✅ Reabra `⚡_SQL_FIX_HOLIDAYS_RLS.sql`
✅ Copie TUDO (incluído DROP POLICY)
✅ Tente novamente

### Console mostra erro
❌ RLS precisa ser refixado
✅ Faça o SQL de novo
✅ Aguarde 3-5 segundos
✅ Recarregue (F5)

### Não vê logs
❌ Você não está em /clinica/agenda
✅ Vá para: http://localhost:3001/clinica/agenda
✅ Aguarde 5 segundos
✅ Recarregue (F5)

---

## 📚 SE QUISER ENTENDER O QUÊ ACONTECEU:

Leia nesta ordem:
1. `📝_RESUMO_MUDANCAS.md` (2 min - técnico)
2. `✨_RESUMO_FERIADOS_PRONTO.md` (3 min - completo)
3. `📦_PACKAGE_FERIADOS_INSTRUÇÕES.md` (5 min - detalhado)

---

**⏱️ Tempo total:** ~8 minutos  
**⚠️ Risco:** Nenhum (SQL é apenas RLS update)  
**✅ Resultado:** 12 feriados bloqueados  

**Simples assim! 🎉**

