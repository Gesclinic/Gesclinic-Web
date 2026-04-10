# 🚀 PHASE 1 - DEPLOYMENT CHECKLIST

**Status:** ✅ BUILD PASSED | ✓ built in 28.64s  
**Data:** 10 de Abril de 2026

---

## ✅ PRÉ-DEPLOY CHECKLIST

- [x] Migration SQL executada no Supabase ✓
- [x] 5 arquivos de código modificados ✓
- [x] Build compile sem erros ✓
- [ ] Deploy em staging (próximo)
- [ ] Testar 5 cenários
- [ ] Deploy em produção

---

## 📦 ARQUIVOS PRONTOS PARA DEPLOY

```
✅ src/lib/appointmentsApi.js (BLOCKER 1 + 4)
✅ src/lib/appointmentFinancialIntegrationApi.js (BLOCKER 2)
✅ src/lib/guiasApi.js (BLOCKER 2)
✅ src/pages/clinica/financeiro/DashboardDRE.jsx (BLOCKER 3)
✅ src/lib/repasseSchedulerApi.js (BLOCKER 5)

✅ supabase/migrations/20260409_add_appointment_fk_to_billing_guides.sql (DONE)

Tamanho: dist/ = 3,416.63 kB (872.44 kB gzipped)
```

---

## 🎯 OPÇÃO 1: Deploy via Vercel (Recomendado)

### Pré-requisitos:
- Conta em vercel.com
- Vercel CLI instalado (npm install -g vercel)

### Comandos:

```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Deploy para staging
vercel --prod --prebuilt

# Ou pré-build + deploy:
npm run build
vercel deploy dist --prod
```

**Resultado esperado:**
```
🔗 Production: https://seu-projeto.vercel.app
```

---

## 🎯 OPÇÃO 2: Deploy via Netlify

### Pré-requisitos:
- Conta em netlify.com
- Netlify CLI instalado (npm install -g netlify-cli)

### Comandos:

```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Deploy para production
netlify deploy --prod --dir=dist

# Ou interativo:
netlify deploy --prod
```

**Resultado esperado:**
```
🔗 Live URL: https://seu-projeto.netlify.app
```

---

## 🎯 OPÇÃO 3: Deploy Manual (Qualquer Servidor)

1. **Copiar a pasta `dist/` para seu servidor**
   ```bash
   scp -r dist/* seu-servidor:/var/www/seu-projeto/
   ```

2. **Configurar nginx.conf (se nginx):**
   ```nginx
   server {
       listen 80;
       server_name seu-dominio.com;
       root /var/www/seu-projeto;
       
       location / {
           try_files $uri /index.html;
       }
   }
   ```

3. **Reiniciar servidor:**
   ```bash
   sudo systemctl restart nginx
   ```

---

## 🧪 TESTES PÓS-DEPLOY (5-10 minutos)

Execute estes testes logo após deploy:

### Teste 1: Auto AR Creation ✅
```
1. Acesse: https://seu-url/clinica/agenda
2. Criar novo appointment
3. Preencher dados (value > 0)
4. Marcar como "finalizado"
5. Verificar:
   ✓ Acessar Financeiro → ContasReceber
   ✓ Nova AR apareceu automaticamente?
   ✓ appointment_id está preenchido?
```

### Teste 2: Auto Guide Creation ✅
```
1. Continue do Teste 1 (AR foi criada)
2. Verificar:
   ✓ Acessar Faturamento → GuiasPage
   ✓ Nova Guide apareceu automaticamente?
   ✓ appointment_id está preenchido?
   ✓ Status é "Aguardando Envio"?
```

### Teste 3: Cascade Delete ✅
```
1. Ir para Agenda
2. Buscar appointment criado nos testes anteriores
3. Clicar em "Cancelar" ou "Deletar"
4. Verificar:
   ✓ AR foi deletada? (Financeiro → ContasReceber)
   ✓ Guide foi deletada? (Faturamento → GuiasPage)
   ✓ Sem registros órfãos?
```

### Teste 4: DRE Real Data ✅
```
1. Acessar: https://seu-url/clinica/financeiro/dre
2. Verificar:
   ✓ Mostra dados reais (não todos 150000 fake)?
   ✓ Se nenhuma transação = tudo zero (OK)?
   ✓ Layout carrega sem erros?
```

### Teste 5: Scheduler Fix ✅
```
1. No browser console (F12):
2. Execute:
   const { executarCalculoAutomatico } = await import('@/lib/repasseSchedulerApi');
   await executarCalculoAutomatico();
3. Verificar:
   ✓ Sem erro "today is not defined"?
   ✓ Console mostra "Processando clínica"?
```

---

## 🔍 DEBUG PÓS-DEPLOY

### Se AR não foi criada automaticamente:
```
1. Verificar console (F12) por erros em appointmentFinancialIntegrationApi
2. Verificar se status foi atualizado exatamente para "finalizado"
3. Verificar logs do backend se disponível
```

### Se Guide não foi criada:
```
1. Verificar se FK foi criado: SELECT * FROM information_schema.table_constraints WHERE table_name='billing_guides'
2. Testar criarGuia() diretamente do console
3. Verificar permissões RLS em billing_guides
```

### Se Deploy falhou:
```
1. Verificar build logs
2. npm run build localmente para replicar erro
3. Verificar variáveis de ambiente (VITE_SUPABASE_*)
```

---

## 📊 MÉTRICAS PÓS-DEPLOY

Monitorar por 24 horas:

- [ ] Sem erros 404/500 nos logs
- [ ] Tempo de carga < 3s
- [ ] Função de auto-create executou X vezes
- [ ] Zero crashes ou memory leaks
- [ ] Users conseguem usar agenda normalmente

---

## ✨ ROLLBACK (Se necessário)

Se algo der muito errado:

```bash
# Voltar para versão anterior
git revert HEAD
npm run build
npm deploy dist
```

Ou revert SQL:
```sql
ALTER TABLE billing_guides DROP COLUMN appointment_id;
```

---

## 📋 PRÓXIMAS ETAPAS (APÓS VALIDAÇÃO)

1. **Monitor 24h** - Acompanhe dados e erros
2. **Celebre** 🎉 - Phase 1 em produção!
3. **Inicie Phase 2** - Glosa + Integrations (em 3-4 dias)

---

## 🎯 RESUMO QUICK REFERENCE

```
Build Status:    ✅ PASSED
Migration:       ✅ DONE
Code Changes:    ✅ READY
Arquivos:        ✅ 5 files modified
Deploy Options:  ✅ 3 métodos acima
Testes:          ✅ 5 cenários definidos
```

**Ready for deployment!** 🚀

---

**Deploy checklist concluído: 10/04/2026**
