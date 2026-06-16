# ✅ VALIDAÇÃO 5 - QUERY COMPLETA (SEM ERROS)

---

## 🔧 Copie TUDO isto (query completa):

```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND (routine_name LIKE '%receivable%' OR routine_name LIKE '%professional_repay%' OR routine_name LIKE '%sync_plan%' OR routine_name LIKE '%cashflow%')
ORDER BY routine_name;
```

---

## ✅ Resultado Esperado:

```
calculate_professional_repay (FUNCTION)
create_receivable_from_appointment (FUNCTION)
sync_cashflow_from_receivable (FUNCTION)
sync_plan_info_to_service (FUNCTION)
```

---

## 📝 Passos:

1. Copie TODO o SQL acima (do SELECT até o ;)
2. Clique "New Query" no Supabase
3. Cole o SQL
4. Clique "Run"
5. ✅ Pronto!

---

**Execute agora! ⚡**

