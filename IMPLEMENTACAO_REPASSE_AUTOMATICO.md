# 🎯 MÓDULO DE REPASSE AUTOMÁTICO - IMPLEMENTAÇÃO COMPLETA

## ✅ Arquivos Criados/Atualizados

### 1. **Migrações SQL** (Supabase)
📁 `supabase/migrations/20260318_create_medical_repasse_module.sql`

Cria:
- ✅ `medical_repasse_config` - Configuração de repasse por profissional
- ✅ `medical_production` - Registro de produção médica
- ✅ `medical_repasse` - Resultado do cálculo de repasse
- ✅ Função `calcular_repasse()` - Cálculo automático
- ✅ Função `gerar_conta_repasse()` - Integração com financeiro
- ✅ Trigger automático para gerar contas

### 2. **API Backend** (JavaScript)
📁 `src/lib/medicalRepasseApi.js` (NOVO)

Funções disponíveis:
```javascript
// Configuração
listarConfigRepasse(clinicId)
obterConfigRepasse(clinicId, professionalId)
salvarConfigRepasse(clinicId, professionalId, config)

// Produção
registrarProducao(clinicId, professionalId, producao)
listarProducaoPeriodo(clinicId, professionalId, dataInicio, dataFim)

// Cálculo
calcularRepasse(clinicId, professionalId, dataInicio, dataFim)
obterRepassePeriodo(clinicId, professionalId, dataInicio, dataFim)

// Dashboard
dashboardRepasseMedico(clinicId, dataInicio, dataFim)
relatorioDetalhoProfissional(clinicId, professionalId, dataInicio, dataFim)

// Lote
calcularRepasseEmLote(clinicId, dataInicio, dataFim)
```

### 3. **Páginas React** (Frontend)

| Arquivo | Descrição | Rota |
|---------|-----------|------|
| `RepasseMedicoPage.jsx` | Dashboard com 3 abas: Dashboard, Configurações, Histórico | `/clinica/repasse` |
| `RepasseConfigPage.jsx` | Gestão de configurações por profissional | `/clinica/repasse/config` |
| `RepasseAjustePage.jsx` | Ajustes e correções em repassos | `/clinica/repasse/ajustes` |
| `RepasseDashboardPage.jsx` | Dashboard executivo com análises | `/clinica/repasse/dashboard` |

---

## 🚀 COMO USAR

### PASSO 1: Aplicar Migração SQL

1. Abra **Supabase Studio** → SQL Editor
2. Copie o conteúdo de `supabase/migrations/20260318_create_medical_repasse_module.sql`
3. Cole no editor e execute
4. Aguarde completar com sucesso ✅

### PASSO 2: Verificar Tabelas Criadas

No Supabase, verifique se foram criadas:
- ✅ `medical_repasse_config`
- ✅ `medical_production`
- ✅ `medical_repasse`

### PASSO 3: Acessar a Interface

No navegador:
```
http://localhost:3000/clinica/repasse
```

Menu lateral: **Financeiro** → **Repasse Médico**

---

## 📊 FLUXO DE USO

### 1. Configurar Repasse (Admin)
```
Financeiro > Repasse Médico > Configurações
├─ Selecionar profissional
├─ Definir % para profissional (ex: 70%)
├─ % para clínica (auto-calcula: 30%)
└─ Salvar
```

### 2. Registrar Produção Médica
Quando um atendimento é realizado:
```javascript
await registrarProducao(clinicId, professionalId, {
  atendimento_id: 'uuid-atendimento',
  tipo: 'consulta',
  valor_bruto: 300.00,
  valor_liquido: 250.00,
  data_atendimento: '2026-03-18',
});
```

### 3. Calcular Repasse
```
Menu > Dashboard > Selecionar período > Botão "Recalcular"
```

Ou por API:
```javascript
await calcularRepasse(clinicId, professionalId, '2026-03-01', '2026-03-31');
```

### 4. Ver Resultados
```
Dashboard:
├─ 📊 Dashboard → Visão dos repassos por profissional
├─ ⚙️ Configurações → Ajustar regras
├─ 📋 Histórico → Repasses passados
└─ 💰 Dashboard Executivo → Análise de lucro
```

---

## 🧮 CÁLCULO AUTOMÁTICO

### Exemplo Prático

```
Profissional: Dr. João
Período: Março 2026
Configuração: 70% profissional / 30% clínica

PRODUÇÃO:
  ├─ Consulta 1: R$ 300,00
  ├─ Consulta 2: R$ 200,00
  └─ Consulta 3: R$ 250,00
  └─ Total Bruto: R$ 750,00
  └─ Total Líquido (após impostos): R$ 650,00

CÁLCULO:
  Repasse Profissional = R$ 650,00 × 70% = R$ 455,00
  Lucro Clínica = R$ 650,00 × 30% = R$ 195,00

RESULTADO:
  ├─ Dr. João recebe: R$ 455,00
  └─ Clínica lucra: R$ 195,00
```

---

## 🔌 INTEGRAÇÃO COM FINANCEIRO

### Automático
Quando um repasse é criado, uma entrada automática é gerada em:
```
Financeiro > Contas a Pagar
├─ Descrição: "Repasse médico - Dr. João"
├─ Valor: R$ 455,00
├─ Tipo: Despesa
├─ Categoria: Repasse
└─ Status: Pendente
```

---

## 📈 DASHBOARD EXECUTIVO

Acesse: `/clinica/repasse/dashboard`

Visualize:
- 📊 Total faturado (bruto e líquido)
- 💰 Repasse total por profissional
- 📉 Margem de lucro da clínica
- 📋 Histórico de repassos
- 🎯 Análise comparativa

---

## 🔐 PERMISSÕES

| Perfil | Acesso |
|--------|--------|
| `admin` | Total (configurar, calcular, editar, ajustar) |
| `gestor` | Total (configurar, calcular, editar, ajustar) |
| `financeiro` | Visualizar, calcular, ajustar |
| `medico` | Visualizar (read-only) |
| `recepcao` | ❌ Sem acesso |

---

## 🐛 TROUBLESHOOTING

### Erro: "Nenhuma produção encontrada"
- ✅ Certifique-se de ter registrado produção para o período
- ✅ Verifique se a data está correta

### Erro: "Configuração não encontrada"
- ✅ Sistema usa padrão 70/30 automaticamente
- ✅ Configure no menu se desejar mudar

### Erro de RLS
- ✅ Verifique permissões no Supabase
- ✅ Usuário precisa estar vinculado à clínica

---

## 💡 PRÓXIMOS PASSOS

1. **Integração com Agenda**: Auto-registrar produção ao marcar atendimento
2. **Relatório PDF**: Exportar repassos como relatório
3. **Agendamento**: Calcular repasse automaticamente mensalmente
4. **Notificações**: Alertar quando repasse foi calculado
5. **API de Webhook**: Notificar sistema externo

---

## 📝 NOTAS

- Cálculo é totalmente automático baseado em configuração
- Histórico completo de repasses é mantido
- Glosa e impostos podem ser aplicados automaticamente
- Sistema está integrado com Plano de Contas
- Auditoria automática de todos os repassos

---

**Versão**: 1.0  
**Data**: 18/03/2026  
**Status**: ✅ Pronto para Produção
