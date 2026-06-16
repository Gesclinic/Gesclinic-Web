# 🧪 TESTE + DEPLOY - GUIA PRÁTICO

## ⏰ Tempo Total: 15 minutos

---

## PASSO 1️⃣: LOGIN (1 min)

**Situação Atual:**
- ✅ Dev server rodando: `http://localhost:3000`
- ✅ Browser em: `http://localhost:3000/login`

**O QUE FAZER:**

1. **Usando credenciais de teste (se disponível):**
   ```
   Email: demo@gesclinic.com
   Senha: demo123456
   ```
   Se não funcionar, use suas credenciais reais da Gesclinic.

2. **Ou crie um usuário de teste:**
   - Click em "Criar Conta"
   - Preencha dados
   - Verifique email (se necessário)

3. **Após login bem-sucedido:**
   - Você será redirecionado para `/clinica/dashboard`
   - Veja se seu clinic aparece no topo

---

## PASSO 2️⃣: NAVEGAR PARA DRE DASHBOARD (1 min)

**URL Direto:**
```
http://localhost:3000/clinica/financeiro/dre
```

**Ou via Menu:**
1. Sidebar → Financeiro
2. Sub-menu → DRE Dinâmica (ou buscar por "dre")
3. Click em "DRE Dinâmica"

**Esperado:**
- Dashboard carrega
- 6 KPI cards mostram **R$ 0.00** (correto, sem dados ainda)
- Gráfico vazio
- Tabela vazia
- Sem erros no console

---

## PASSO 3️⃣: ABRIR CONSOLE (1 min)

**Atalho:**
```
F12 (ou Ctrl+Shift+I)
```

**Ir para:**
- Tab: "Console"
- Você deve ver mensagens como:
  ```
  [ClinicContext] Loaded clinic: ...
  [DREDashboard] Fetching data...
  [Alerts] Subscribed to 5 channels
  ```

---

## PASSO 4️⃣: GET CLINIC ID (1 min)

**No console, cole:**
```javascript
const clinicId = localStorage.getItem('clinicId');
console.log('Clinic ID:', clinicId);
```

**Nota seu resultado:**
```
Clinic ID: 12345678-1234-1234-1234-123456789012
```

✅ Copie esse ID, você vai precisar nos testes!

---

## PASSO 5️⃣: EXECUTAR OS 6 TESTES (5 min)

**No console, cole TUDO de uma vez:**

```javascript
// Import test function
import { runAllIntegrationTests } from '@/lib/integrationTests';

// Get clinic ID
const clinicId = localStorage.getItem('clinicId');

// Verify clinic ID exists
if (!clinicId) {
  console.error('❌ ERROR: Clinic ID not found in localStorage');
  console.log('Possible solutions:');
  console.log('1. Are you logged in?');
  console.log('2. Try refreshing the page (F5)');
  console.log('3. Check browser dev tools → Application → Local Storage');
} else {
  console.log('✅ Using Clinic ID:', clinicId);
  console.log('Starting tests...\n');
  
  // Run all tests
  await runAllIntegrationTests(clinicId);
}
```

**O QUE ESPERAR:**

```
╔════════════════════════════════════════════════════════════╗
║     INTEGRATION TESTS - ETAPAS 1-6                         ║
║     Financial Automation Suite                             ║
║                                                            ║
║  Clinic ID: 12345678...                                   ║
║  Start Time: 2026-05-25T15:30:00.000Z                     ║
╚════════════════════════════════════════════════════════════╝

[1/6] Test 1: CREATE RECEIVABLE
✅ SUCCESS - Receivable created with ID: rec_abc123...

[2/6] Test 2: REGISTER PAYMENT WITH INSTALLMENTS
✅ SUCCESS - Payment created with 3 installments

[3/6] Test 3: SETTLE PAYMENT ATOMICALLY
✅ SUCCESS - Payment settled in atomic transaction

[4/6] Test 4: CALCULATE MEDICAL COMMISSION
✅ SUCCESS - Commission calculated: R$ 5,234.50

[5/6] Test 5: IMPORT BANK TRANSACTION
✅ SUCCESS - Bank transaction imported: PIX R$ 10,000.00

[6/6] Test 6: AUTO-RECONCILE WITH CONFIDENCE
✅ SUCCESS - Auto-matched with 98% confidence score

╔════════════════════════════════════════════════════════════╗
║  ALL TESTS PASSED ✅                                       ║
║  Duration: 2.45s                                           ║
║  Database Operations: 47                                   ║
╚════════════════════════════════════════════════════════════╝
```

**Tempo:** ~2-3 segundos para executar

⚠️ **Se falhar:**
- Verificar console para erro específico
- Checar se Supabase está conectado
- Confirmar se migrations foram aplicadas
- Ver seção "TROUBLESHOOTING" abaixo

---

## PASSO 6️⃣: VERIFICAR DADOS NA DASHBOARD (3 min)

**Após testes completarem:**

1. **Refresh a página:** F5

2. **Aguarde o carregamento** (~2-3 segundos)

3. **Verifique:**
   - ✅ KPI Cards agora mostram valores reais
   - ✅ Gráfico tem data (linha azul = receita)
   - ✅ Tabela poblada com períodos
   - ✅ Alertas aparecem (toasts na tela)

**Valores esperados (aproximados):**
```
Receita Total: R$ 10,000.00+ (do teste 5)
Total Despesas: R$ 5,234.50+ (comissões do teste 4)
Resultado Líquido: R$ 4,765.50+
Margem Bruta: ~48%
Margem Líquida: ~47%
```

**Alertas esperados (console + toasts):**
```
[Real-Time Alert] Payment registered
[Real-Time Alert] Commission calculated
[Real-Time Alert] Payment settled
[Real-Time Alert] Bank transaction imported
[Real-Time Alert] Reconciliation matched
```

---

## PASSO 7️⃣: BUILD PRODUCTION (2 min)

**Abra novo terminal (ou feche o dev server):**

```bash
npm run build
```

**Aguarde completo:**
```
vite v5.4.21 building for production...
transforming... 5167 modules transformed
rendering chunks... computing gzip size...

✅ built in 24.84s
```

**Resultado:**
- Pasta `dist/` criada
- Aplicação otimizada para produção
- Pronta para deploy

---

## PASSO 8️⃣: TESTE PRODUCTION BUILD (1 min)

**Ainda em outro terminal:**

```bash
npm run preview
```

**Navegue para:**
```
http://localhost:4173/clinica/financeiro/dre
```

**Verifique:**
- ✅ Dashboard carrega
- ✅ Dados persistem
- ✅ Sem console errors

---

## PASSO 9️⃣: DEPLOY 🚀

**Opção A: Vercel (Recomendado)**
```bash
# Se configurado:
npm run deploy
# Ou fazer push para GitHub e conectar Vercel
```

**Opção B: Netlify**
```bash
# Upload 'dist' folder manualmente
# ou via CLI: netlify deploy --prod --dir dist
```

**Opção C: Servidor Próprio**
```bash
# 1. Copy dist folder para web server
# 2. Configure web server (nginx/apache)
# 3. Reinicie web server
# 4. Done!
```

**Opção D: Docker**
```bash
docker build . -t gesclinic:latest
docker run -p 3000:3000 gesclinic:latest
```

---

## ✅ CHECKLIST FINAL

- [ ] Dev server rodando (`npm run dev`)
- [ ] Login realizado
- [ ] Dashboard carrega em `/clinica/financeiro/dre`
- [ ] Clinic ID obtido
- [ ] 6 testes executados com sucesso
- [ ] Todos testes retornam ✅
- [ ] Dashboard popula com dados reais
- [ ] Alertas aparecem
- [ ] Build production completo (`npm run build`)
- [ ] Production build testado (`npm run preview`)
- [ ] Aplicação deployada 🎉

---

## 🔧 TROUBLESHOOTING

### ❌ "Clinic ID not found in localStorage"
**Causa:** Não fez login ou sessão expirou

**Solução:**
1. Refresh página: F5
2. Fazer login novamente
3. Voltar para dashboard
4. Tente novamente

### ❌ "Database error: clinic_id mismatch"
**Causa:** Clinic ID inválido ou permissões insuficientes

**Solução:**
1. Verificar se está logado como admin
2. Usar clinic ID correto
3. Checar RLS policies no Supabase

### ❌ "Real-time subscription failed"
**Causa:** Supabase Real-Time não habilitado

**Solução:**
1. Ir para Supabase Dashboard
2. Project → Database → Replication
3. Habilitar Real-Time para tabelas necessárias

### ❌ "No data after tests"
**Causa:** Dashboard cache ou migrations não aplicadas

**Solução:**
1. Refresh: F5
2. Aguarde 3-5 segundos para carregar
3. Verificar migrations no Supabase
4. Rodar testes novamente

### ❌ "Build fails with missing modules"
**Causa:** npm packages não instalados

**Solução:**
```bash
npm install
npm run build
```

---

## 📞 SE AINDA TIVER PROBLEMAS

1. **Verificar console (F12)** para mensagens de erro
2. **Ler documentação técnica:** `🔧_TECHNICAL_SUMMARY_ETAPAS_1-6.md`
3. **Ver guia de deploy:** `⚡_DEPLOY_30SEGUNDOS_CHECKLIST.md`
4. **Check Supabase logs** para database errors

---

## 🎉 SUCESSO!

Se chegou até aqui com tudo ✅:

- Dashboard funcionando
- Dados persistindo
- Testes passando
- Build otimizado
- Pronto para deploy

**Status: 🟢 READY FOR PRODUCTION**

---

**Próxima etapa:** Deploy para seu servidor/cloud!

Tempo total: ~15 minutos
