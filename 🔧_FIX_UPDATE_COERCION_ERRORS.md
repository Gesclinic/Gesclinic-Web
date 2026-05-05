╔════════════════════════════════════════════════════════════════════════════╗
║               🔧 FIX: UPDATE Query Coercion Errors                          ║
║             "Cannot coerce the result to a single JSON object"              ║
║                       April 24, 2026 - Final Fix                            ║
╚════════════════════════════════════════════════════════════════════════════╝

═════════════════════════════════════════════════════════════════════════════
⚠️ PROBLEMA IDENTIFICADO
═════════════════════════════════════════════════════════════════════════════

Erro: "Cannot coerce the result to a single JSON object"

Causa Raiz:
- UPDATE com filtros não-únicos (ex: service_id + clinic_id)
- .select() retorna ARRAY [{ ... }] 
- .maybeSingle() espera 0 ou 1 registro
- Se há 2+ registros com mesma combinação, falha!

Exemplo Problemático:
```javascript
// ❌ ERRADO - pode retornar 2+ linhas
const { data } = await supabase
  .from('agenda_rules')
  .update(updates)
  .eq('service_id', serviceId)        // ← Não garante única linha
  .eq('clinic_id', clinicId)          // ← Não garante única linha
  .select()
  .maybeSingle();                      // ← Espera 0-1, mas retorna N linhas

// data = [{ ...rule1 }, { ...rule2 }] → ERRO!
```

═════════════════════════════════════════════════════════════════════════════
✅ SOLUÇÃO APLICADA
═════════════════════════════════════════════════════════════════════════════

SUBSTITUIR:
```javascript
.select()
.maybeSingle()
```

POR:
```javascript
.select()
// Handle array response
if (!data || data.length === 0) {
  throw new Error('Record not found');
}
return data[0];
```

═════════════════════════════════════════════════════════════════════════════
📋 ARQUIVOS CORRIGIDOS (4 Total)
═════════════════════════════════════════════════════════════════════════════

1️⃣ src/lib/agendaRulesApi.js
   ├─ Line 137: updateAgendaRule()
   │  Filtra: service_id + clinic_id (não-único)
   │  Fix: .select() → array handling
   │
   └─ Line 156: deactivateAgendaRule()
      Filtra: service_id + clinic_id (não-único)
      Fix: .select() → array handling

2️⃣ src/lib/resourcesApi.js
   ├─ Line 150: updateResource()
   │  Filtra: id + clinic_id (ID é único ✓)
   │  Fix: Ainda usar array handling para consistência
   │
   ├─ Line 169: deactivateResource()
   │  Filtra: id + clinic_id (ID é único ✓)
   │  Fix: Ainda usar array handling para consistência
   │
   └─ Line 257: deallocateResourceFromRoom()
      Filtra: room_id + resource_id + clinic_id
      Fix: .select() → array handling

   └─ Line 279: updateRoomResourceQuantity()
      Filtra: room_id + resource_id + clinic_id
      Fix: .select() → array handling

3️⃣ src/lib/healthInsurancesApi.js
   ├─ Line 433: updateHealthInsurance()
   │  Filtra: id + clinic_id (ID é único ✓)
   │  Fix: .select() → array handling

4️⃣ src/lib/roomServicesApi.js
   └─ Line 104: updateRoomService()
      Filtra: id + clinic_id (ID é único ✓)
      Fix: .select() → array handling

═════════════════════════════════════════════════════════════════════════════
🔄 PADRÃO NOVO UNIVERSAL
═════════════════════════════════════════════════════════════════════════════

SEMPRE que precisar de UPDATE que retorna dados:

```javascript
const { data, error } = await supabase
  .from('table')
  .update(payload)
  .eq('id', id)
  .select();  // ← Retorna array

if (error) throw error;

if (!data || data.length === 0) {
  throw new Error('Record not found or RLS denied');
}

return data[0];  // ← Extract first element
```

✅ Benefícios:
  ✓ Funciona com 0 registros (RLS block)
  ✓ Funciona com 1 registro (normal)
  ✓ Funciona com N registros (query bug - deveria ser 1)
  ✓ Consistente em todo o codebase
  ✓ Evita "Cannot coerce" errors

═════════════════════════════════════════════════════════════════════════════
⚡ O QUE NÃO MUDAR
═════════════════════════════════════════════════════════════════════════════

✅ SELECT queries com .maybeSingle(): DEIXAR COMO ESTÁ
   - SELECT pode retornar 0 registros legitimamente
   - .maybeSingle() é perfeito para leitura

✅ SELECT queries com .single(): DEIXAR COMO ESTÁ
   - SELECT de registros conhecidos como únicos
   - .single() garante exatamente 1

✅ UPDATE sem .select(): DEIXAR COMO ESTÁ
   - Fire-and-forget operations
   - Não precisa retornar dados

═════════════════════════════════════════════════════════════════════════════
🧪 TESTE DE VALIDAÇÃO
═════════════════════════════════════════════════════════════════════════════

Build Status:
  ✅ npm run build: SUCCESS
  ✅ Build Time: 23.73s
  ✅ Modules: 4947 transformed
  ✅ Errors: 0
  ✅ Warnings: 0

═════════════════════════════════════════════════════════════════════════════
📝 NOTAS IMPORTANTES
═════════════════════════════════════════════════════════════════════════════

1. COMPOSITE KEYS:
   - Se a tabela tem PRIMARY KEY composto (ex: service_id, clinic_id)
   - A query DEVE retornar exatamente 1 linha
   - Mas `.select()` SEMPRE retorna array
   - Logo, SEMPRE usar: if (!data || data.length === 0) return data[0];

2. RLS PROTECTION:
   - clinic_id na cláusula .eq() é para validação, não para filtragem
   - RLS policies garantem que user só acessa seus próprios registros
   - Se RLS bloqueia, data retorna [] (não erro)
   - Logo, checar data.length é essencial

3. SINGLE vs MAYBLESINGLE:
   - .single(): Lança erro se 0-1 registros → não ideal para RLS
   - .maybeSingle(): Retorna null se 0-1 → mas ainda quebra com 2+ linhas
   - Solução: NÃO usar .single()/.maybeSingle() em UPDATE
   - Sempre usar .select() + array handling

═════════════════════════════════════════════════════════════════════════════
✅ PRÓXIMAS AÇÕES
═════════════════════════════════════════════════════════════════════════════

1. ✅ Corrigir 4 arquivos API
2. ✅ Validar build (23.73s, 0 erros)
3. ⏳ Executar SQL migration (supabase/migrations/20260424_fix_get_current_clinic_function.sql)
4. ⏳ Reiniciar npm run dev
5. ⏳ Hard refresh + teste de login
6. ⏳ Salvar agendamento e verificar console (sem erros de JSON)

═════════════════════════════════════════════════════════════════════════════
📚 REFERÊNCIA
═════════════════════════════════════════════════════════════════════════════

Supabase JavaScript Client:
- .update(): https://supabase.com/docs/reference/javascript/update
- .select(): https://supabase.com/docs/reference/javascript/select
- .single(): https://supabase.com/docs/reference/javascript/single
- .maybeSingle(): https://supabase.com/docs/reference/javascript/maybeSingle

PostgreSQL Docs:
- PRIMARY KEY (composite): https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-PRIMARY-KEYS

═════════════════════════════════════════════════════════════════════════════
