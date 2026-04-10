# 🔧 DEBUG RÁPIDO - Feriados Não Aparecem

## Passo 1: Testar no Console do Navegador (F12)

Quando estiver na agenda, abra o console (F12) e cole EXATAMENTE isto:

```javascript
import { debugHolidaysTable, getAllNationalHolidays, seedNationalHolidays } from '/src/lib/holidaysApi.js';

// Teste 1: Ver qué há na tabela
await debugHolidaysTable();

// Teste 2: Ver feriados nacionais de 2026
const holidays2026 = await getAllNationalHolidays(2026);
console.log('📋 Feriados 2026:', holidays2026);

// Teste 3: Forçar seed de 2026
await seedNationalHolidays(2026, null);
```

---

## O que Você Verá

### ✅ Se funcionar (verá logs assim):
```
🔍 [DEBUG] Testando tabela holidays...
📊 [DEBUG] Status: 200
✅ [DEBUG] Sucesso! Registros encontrados: 12
📋 [DEBUG] Amostra: Array(12) [...]

📋 Feriados 2026: Array(10) [
  { date: '2026-01-01', name: 'Confraternização Universal', ... },
  { date: '2026-02-13', name: 'Carnaval', ... },
  ...
]

🌱 Seed de feriados 2026:
✅ 2026-01-01 - Confraternização Universal
✅ 2026-02-13 - Carnaval
...
```

### ❌ Se NÃO funcionar (verá logs assim):
```
❌ [DEBUG] Erro: { code: '42P01', message: 'relation "public.holidays" does not exist' }
```

**Significa:** Tabela `holidays` **não existe** → Você não executou a migration SQL

---

## Passo 2: Verificar o que Está Faltando

Copie e cole ESSE comando no console:

```javascript
// Rodar os testes automaticamente
(async () => {
  console.log('🧪 [TEST] Iniciando testes...\n');
  
  // Teste 1: Tabela
  console.log('─────────────────────────────');
  console.log('1️⃣ TABELA EXISTE?');
  console.log('─────────────────────────────');
  const { error: tableError, data: tableData } = await debugHolidaysTable();
  if (tableError) {
    console.error('❌ FALHOU: Tabela não existe ou sem permissão');
    console.log('SOLUÇÃO: Execute migration SQL primeiro');
    return;
  }
  console.log(`✅ PASSOU: ${tableData?.length} registros na tabela\n`);
  
  // Teste 2: Feriados nacionais
  console.log('─────────────────────────────');
  console.log('2️⃣ FERIADOS NACIONAIS EXISTEM?');
  console.log('─────────────────────────────');
  const holidays = await getAllNationalHolidays(2026);
  if (holidays.length === 0) {
    console.warn('⚠️ FALHOU: Nenhum feriado encontrado');
    console.log('SOLUÇÃO: Executar seed...\n');
    
    // Teste 2b: Forçar seed
    console.log('─────────────────────────────');
    console.log('2b. EXECUTANDO SEED...');
    console.log('─────────────────────────────');
    const seedResult = await seedNationalHolidays(2026, null);
    console.log(`Resultado: ${seedResult ? '✅ OK' : '❌ FALHOU'}\n`);
  } else {
    console.log(`✅ PASSOU: ${holidays.length} feriados encontrados\n`);
  }
  
  // Resumo
  console.log('═════════════════════════════');
  console.log('📊 RESUMO FINAL');
  console.log('═════════════════════════════');
  const finalHolidays = await getAllNationalHolidays(2026);
  console.log(`Total de feriados: ${finalHolidays.length}`);
  if (finalHolidays.length > 0) {
    console.log('✅ Sistema pronto! Recarregue a página (F5)');
  } else {
    console.log('❌ Ainda há problemas. Verifique acima.');
  }
})();
```

---

## Passo 3: Recarregar

Se passou em todos os testes:
```
F5  (reload)
```

---

## Se AINDA não aparecer

### Possível causa: RLS Policies bloqueando leitura

Execute ESTE SQL no Supabase (SQL Editor):

```sql
-- Remover RLS temporariamente (APENAS TESTE)
ALTER TABLE public.holidays DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_day_override DISABLE ROW LEVEL SECURITY;

-- Depois recarregar página (F5)
```

Se aparecer **agora**, o problema é RLS. Avise para debugar mais.

Se **ainda não aparecer**, é outra coisa.

---

## ⚡ Rápido: Validar Tudo

Copie e cole ISTO no console:

```javascript
const { debugHolidaysTable, getAllNationalHolidays } = await import('/src/lib/holidaysApi.js');
console.log('1️⃣ Teste tabela:', await debugHolidaysTable());
console.log('2️⃣ Teste feriados:', (await getAllNationalHolidays(2026)).length, 'encontrados');
```

✅ Se ver `"Status: 200"` e `"X encontrados"` (X > 0), está ok.  
❌ Se ver erro, siga os steps acima.

---

**📝 Reporte:**
- Screenshot do console
- O que vê (erro, dados, etc)
- Se executou migration SQL ou não
