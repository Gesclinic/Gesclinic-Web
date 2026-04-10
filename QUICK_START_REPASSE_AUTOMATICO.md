# ⚡ QUICK START - REPASSE AUTOMÁTICO (3 MINUTOS)

## PASSO 1: Aplicar Migração (2 min)

1. Abra: https://app.supabase.com
2. Vá para **SQL Editor**
3. Clique em **New query**
4. Abra arquivo: `supabase/migrations/20260318_create_medical_repasse_module.sql`
5. Copie todo o conteúdo
6. Cole na query e clique **▶ Execute**
7. Aguarde conclusão ✅

## PASSO 2: Testar no Navegador (1 min)

1. Certifique-se de que `npm run dev` está rodando
2. Abra: http://localhost:3000/clinica/repasse
3. Clique nas abas: Dashboard | Configurações | Histórico

## PASSO 3: Pronto! 🎉

Seu sistema de repasse automático está 100% funcional!

---

## 🎯 O QUE FOI CRIADO

✅ **Backend (SQL)**
- Tabelas de configuração, produção e resultado
- Função automática de cálculo
- Trigger para gerar contas a pagar
- RLS policies configuradas

✅ **API (JavaScript)**
- `medicalRepasseApi.js` com 10+ funções
- Integração com dashboard
- Suporte a lote

✅ **Frontend (React)**
- Página principal com 3 abas
- Página de configurações
- Página de ajustes
- Dashboard executivo

✅ **Menu Lateral**
- Integrado em `Financeiro > Repasse Médico`
- 3 sub-itens: Visão Geral, Configurações, Histórico

---

## 📌 PRIMEIRO USO

1. **Configurar Profissional**
   - Menu > Repasse > Configurações
   - Selecionar médico
   - Definir % (ex: 70/30)
   - Salvar

2. **Registrar Produção** (manual ou integração)
   ```javascript
   await registrarProducao(clinicId, professionalId, {
     valor_bruto: 300,
     valor_liquido: 250,
     data_atendimento: '2026-03-18'
   });
   ```

3. **Calcular Repasse**
   - Menu > Repasse > Dashboard
   - Criar período (mês/ano)
   - Botão "Recalcular"

4. **Ver Resultado**
   - Dashboard mostra: Total faturado, repasse, lucro
   - Financeiro > Contas a Pagar mostra despesa

---

## 🔗 ARQUIVOS PRINCIPAIS

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `20260318_create_medical_repasse_module.sql` | SQL | Migrações |
| `medicalRepasseApi.js` | JS | API Core |
| `RepasseMedicoPage.jsx` | React | UI Principal |
| `RepasseConfigPage.jsx` | React | Configurações |
| `RepasseAjustePage.jsx` | React | Ajustes |
| `RepasseDashboardPage.jsx` | React | Dashboard |

---

## ❓ FAQ RÁPIDO

**P: Como integrar com agenda?**
A: Adicionar chamada `registrarProducao()` após criar atendimento

**P: Como automático calcula mensalmente?**
A: Usar cron job ou integração com backend

**P: Como exportar PDF?**
A: Implementar lib como `pdfkit` ou `html2pdf`

**P: Pode mudar percentual depois?**
A: Sim, muda em Configurações e recalcula com novo %

---

✅ **Status**: PRONTO PARA USO  
🚀 **Próximo**: Integrar com sistema de agendamento

