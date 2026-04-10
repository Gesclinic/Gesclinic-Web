# 🎯 COMO RESOLVER O ERRO EM 3 PASSOS

## 🚨 Você Recebia:
```
ERROR: 42703 - column "code" does not exist
```

## ✅ Causa Encontrada:
Arquivos de migração antigos conflitando com o novo

## 🔧 Já Foi Resolvido:
✅ 4 arquivos conflitantes foram desabilitados automaticamente

---

## 📋 PASSO 1: Limpar o Banco (2 minutos)

**URL:** https://app.supabase.com/project/[seu-projeto]/sql/new

**Copie e Cole:**
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

**Aperte:** RUN

---

## 📋 PASSO 2: Executar o Arquivo Correto (2 minutos)

**Arquivo:** `supabase/migrations/20260113_COMPREHENSIVE_INIT.sql`

1. Abra o arquivo
2. Selecione tudo: Ctrl+A
3. Copie: Ctrl+C
4. Volta no Supabase (SQL Editor → New Query)
5. Cole: Ctrl+V
6. Aperte: RUN

**Deve aparecer:** "Success" em verde

---

## 📋 PASSO 3: Validar (1 minuto)

**Cole no Supabase:**
```sql
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
```

**Aperte:** RUN

**Resultado esperado:** 73

---

## ✅ Pronto!

Agora você pode:
```bash
npm run dev
```

E começar a desenvolver! 🚀

---

## 🆘 Se Ainda Tiver Erro

Leia: `SOLUCAO_ERRO_CODE.md` para mais detalhes
