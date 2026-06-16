# 🚀 ROADMAP ETAPAS 6, 7, 8 — Financial Cockpit Premium

**Data**: 23 de Maio de 2026  
**Status**: Planejamento  
**Dependências**: ETAPA 5 (Alertas Financeiros) ✅ Completa

---

## 📊 ETAPA 6: Conciliação Inteligente
**Objetivo**: Automatizar reconciliação de transações bancárias com lançamentos financeiros

### 🎯 Escopo

#### 1. **Importação de Extratos Bancários**
```
- Formato: .OFX, .CSV, .TXT (padrão banco)
- Campos: Data, Valor, Descrição, Número do Documento
- Validação: Detecção de duplicatas automática
- Armazenamento: Tabela `bank_statements`
```

#### 2. **Motor de Matching Automático**
```
Regras de Correspondência:
├── Exato: valor + data + descrição
├── Fuzzy: valor ± 0.01 + descrição similar (90% match)
├── Parcial: valor exato + data próxima (±2 dias)
└── Manual: interface para matching manual

Campos para matching:
├── Valor da transação (ar_invoices.total_amount)
├── Data da transação (±3 dias de tolerância)
├── Descrição/referência
└── Profissional/Paciente (quando disponível)
```

#### 3. **Tabelas Necessárias**
```sql
-- Extratos bancários
CREATE TABLE bank_statements (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  account_id UUID NOT NULL,
  statement_date DATE NOT NULL,
  import_date TIMESTAMP DEFAULT NOW(),
  file_name VARCHAR(255),
  total_amount DECIMAL(15,2),
  transaction_count INT,
  status VARCHAR(20) -- 'pending', 'processing', 'completed'
);

-- Transações do extrato
CREATE TABLE bank_transactions (
  id UUID PRIMARY KEY,
  statement_id UUID NOT NULL REFERENCES bank_statements,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  matched_to_id UUID, -- ar_invoice ID ou null
  match_type VARCHAR(20), -- 'auto_exact', 'auto_fuzzy', 'manual', null
  match_confidence DECIMAL(3,2), -- 0.00 - 1.00
  status VARCHAR(20) -- 'unmatched', 'matched', 'rejected'
);

-- Histórico de reconciliação
CREATE TABLE reconciliation_history (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  reconciliation_date TIMESTAMP DEFAULT NOW(),
  period_start DATE,
  period_end DATE,
  total_matched DECIMAL(15,2),
  total_unmatched DECIMAL(15,2),
  match_rate DECIMAL(5,2), -- 0-100%
  details JSONB
);
```

#### 4. **React Component: ConciliadorInteligente**
```jsx
Abas:
├── 📤 Upload de Extratos
├── 🔄 Matching Automático
├── 🔗 Validação Manual
├── 📊 Resumo Reconciliação
└── 📋 Histórico

Funcionalidades:
├── Drag-drop para upload
├── Preview do extrato
├── Matching em tempo real
├── Confirmação de matches
├── Geração de relatório
└── Exportação de discrepâncias
```

#### 5. **Funções PL/pgSQL**
```
├── match_bank_transactions(statement_id)
├── calculate_match_confidence(amount, date, desc)
├── detect_duplicates(clinic_id, date_range)
├── generate_reconciliation_report(clinic_id, period)
└── sync_matched_payments()
```

### 📈 Benefícios
- ⏱️ Reduz tempo de reconciliação de 2h para 10min
- 💯 90%+ de matches automáticos
- 🔍 Detecta fraudes/discrepâncias
- 📱 Auditoria completa de transações

---

## 💎 ETAPA 7: Financial Cockpit Premium
**Objetivo**: Dashboard executivo avançado com BI, previsões e KPIs estratégicos

### 🎯 Escopo

#### 1. **KPIs Estratégicos** (12 métricas premium)
```
Receita:
├── Faturamento Bruto (total + tendência)
├── Receita Líquida (descontos aplicados)
├── Margem Operacional (%)
└── Índice de Crescimento (YoY)

Operacional:
├── Ticket Médio (per appointment)
├── Taxa de Ocupação (%)
├── Custo Operacional (% da receita)
└── Payback Period (dias)

Financeiro:
├── Cash Flow (entrada - saída)
├── Dias para Pagar (AP)
├── Dias para Receber (AR)
└── Índice de Inadimplência (%)
```

#### 2. **Previsões com ML (opcional - MVP sem ML)**
```
MVP Versão 1 (Regressão Linear):
├── Previsão de Receita (30/60/90 dias)
├── Previsão de Inadimplência
├── Sazonalidade detectada
└── Alertas de anomalias

Tecnologia: PostgreSQL + PL/pgSQL (simples)
Alternativa futura: Python + scikit-learn
```

#### 3. **Visualizações Premium**
```
Gráficos:
├── 📈 Revenue vs Target (linha + barra)
├── 🎯 Funnel (Faturamento → Recebimento)
├── 🔥 Heatmap (produção por dia/profissional)
├── 📊 Waterfall (receita bruta → líquida)
├── 📉 Delinquency Aging (30/60/90+ dias)
├── 🌍 Geomap (receita por região - futuro)
└── 🔄 Sankey (fluxo de caixa)

Biblioteca: Recharts (MVP) → Plotly/Tableau (Enterprise)
```

#### 4. **Comparativo Período**
```
Funcionalidades:
├── Período Atual vs Período Anterior
├── Período Atual vs Mesmo Período Ano Passado (YoY)
├── Variação % com indicadores (↑ verde, ↓ vermelho)
├── Tendência visual
└── Exportação em PDF/Excel
```

#### 5. **Views para BI**
```sql
v_kpi_mensais -- KPIs por mês
v_previsao_receita -- Previsão 30/60/90 dias
v_analise_inadimplencia -- Evolução de contas vencidas
v_profissional_ranking -- Top 10 profissionais por receita
v_convenio_performance -- Performance por convênio
v_custo_beneficio -- ROI por serviço
```

#### 6. **Tabela de Configuração**
```sql
CREATE TABLE cockpit_goals (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  metric_name VARCHAR(100), -- 'revenue', 'ocupancy', etc
  target_value DECIMAL(15,2),
  period_start DATE,
  period_end DATE,
  alert_threshold DECIMAL(5,2), -- % de variação
  notification BOOLEAN DEFAULT true
);
```

### 🎨 Layout
```
┌─────────────────────────────────────────────────────┐
│  📊 Financial Cockpit Premium                       │
│  Período: Jan/2026  |  vs Período Anterior         │
├─────────────────────────────────────────────────────┤
│                                                       │
│  [Receita] [Despesa] [Margem] [Cash Flow]           │
│  R$ XXX ↑12.5%  R$ XXX ↓3.2%  XX% ↑1.5%  R$ XXX    │
│                                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │ Revenue vs Target   │  │ Funnel Análise      │   │
│  │ (Linha + Barra)     │  │ (Faturamento...)    │   │
│  │                     │  │                     │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                       │
│  ┌─────────────────────┐  ┌─────────────────────┐   │
│  │ Delinquency Aging   │  │ Profissional Top 10 │   │
│  │ (Stacked Bar)       │  │ (Ranking)           │   │
│  │                     │  │                     │   │
│  └─────────────────────┘  └─────────────────────┘   │
│                                                       │
│  📌 Previsão Próx. 30 Dias: R$ XXX (±5%)           │
│  ⚠️ Alertas: 2 contas vencidas, 1 meta não atingida│
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 💾 Componentes React
```
├── CockpitDashboard (container principal)
├── KPICard (métrica individual)
├── ComparativoCard (período vs período)
├── ChartSection (wrapper para gráficos)
├── MetasSection (metas vs realizado)
├── AlertasSection (alertas premium)
└── ExportButton (PDF/Excel)
```

### 📈 Benefícios
- 👔 Dashboard executivo pronto para C-Level
- 📊 Insights accionáveis em real-time
- 📱 Previsões automáticas (MVP linear)
- 🎯 Rastreamento de metas
- 📤 Relatórios personalizados

---

## 🔔 ETAPA 8: Alertas e Automações Avançadas
**Objetivo**: Sistema de alertas inteligente + automações workflow

### 🎯 Escopo

#### 1. **Tipos de Alertas (20+ cenários)**
```
💰 Financeiros:
├── Contas vencidas (30/60/90+ dias)
├── Cobrança automática falhada
├── Limite de crédito cliente atingido
├── Fluxo de caixa negativo previsto
└── Inadimplência recorrente

📊 Operacionais:
├── Meta de receita não atingida
├── Taxa de ocupação baixa (<70%)
├── Profissional sem agendamento
├── Paciente não compareceu (2x)
└── Equipamento manutenção vencida

🏥 Clínica:
├── Documento vencido (RG, CRM)
├── Licença sanitária próxima de vencer
├── Seguro vencimento
└── Falta de profissional (férias)

🔐 Segurança:
├── Acesso atípico detectado
├── Tentativa de fraude (transação suspeita)
├── Alteração de configuração crítica
└── Backup falhou
```

#### 2. **Canais de Notificação**
```
├── 📧 Email (SMTP configurável)
├── 📱 WhatsApp (Twilio/Evolution)
├── 🔔 Push (app mobile)
├── 💬 Telegram Bot
├── 📞 SMS (opcional)
└── 📊 Dashboard In-App
```

#### 3. **Tabelas para Sistema de Alertas**
```sql
CREATE TABLE alert_templates (
  id UUID PRIMARY KEY,
  clinic_id UUID,
  name VARCHAR(200),
  condition_type VARCHAR(50), -- 'overdue', 'low_ocupancy', etc
  trigger_value DECIMAL(15,2), -- valor/percentual
  channels TEXT[], -- {email, whatsapp, push}
  recipients TEXT[], -- {admin, financeiro, gerente}
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE alert_logs (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL,
  clinic_id UUID NOT NULL,
  triggered_at TIMESTAMP DEFAULT NOW(),
  channel VARCHAR(20),
  status VARCHAR(20), -- 'sent', 'failed', 'pending'
  message_id VARCHAR(255),
  response JSONB,
  retry_count INT DEFAULT 0
);
```

#### 4. **Automações Workflow**
```
Quando: Paciente não paga em 30 dias
├── Dia 1: Gerar boleto automático
├── Dia 7: Enviar lembrete WhatsApp
├── Dia 15: Enviar notificação com juros
├── Dia 30: Enviar alerta financeiro + gerente
└── Dia 60: Bloquear novos agendamentos

Quando: Taxa de ocupação < 70%
├── Notificar gerente
├── Sugerir promoção
├── Alertar profissionais
└── Gerar relatório de oportunidades

Quando: Repasse médico pendente > 14 dias
├── Notificar profissional
├── Gerar comprovante de pendência
├── Alertar financeiro
└── Agendar pagamento automático
```

#### 5. **Funções Automatizadas**
```sql
-- Executar diariamente via cron
├── check_overdue_accounts() → Gerar alertas vencidas
├── check_upcoming_events() → Alertas de vencimentos
├── process_pending_automations() → Executar workflows
├── send_scheduled_alerts() → Enviar alertas
└── cleanup_old_alerts() → Limpar histórico

-- Executar por trigger
├── on_appointment_no_show() → Alerta + automação
├── on_payment_failed() → Retry + notificação
├── on_professional_absence() → Alerta + cobertura
└── on_security_event() → Alerta + bloqueio
```

#### 6. **React Components**
```
├── AlertasCentral (painel central)
├── AlertaCard (card individual)
├── TemplateEditor (criar/editar alertas)
├── AutomaçãoWorkflow (visualizar automações)
├── HistóricoAlertas (log completo)
└── NotificaçõesPreferências (canais por usuário)
```

#### 7. **Integração com APIs Externas**
```
WhatsApp:
├── Twilio (pago: $0.01/msg)
├── Evolution (self-hosted)
└── Meta Business API (futuro)

Email:
├── SendGrid (pago)
├── Brevo (grátis até 300/dia)
└── SMTP customizado

SMS:
├── AWS SNS
├── Twilio
└── Brevo

Telegram:
├── Bot Token
├── Chat ID per usuário
```

### 🎨 Layout Central de Alertas
```
┌─────────────────────────────────────────────────────┐
│  🔔 Alertas e Automações                            │
│  Total: 24 alertas | 12 pendentes                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│  Filtros: [Tipo ▼] [Severidade ▼] [Status ▼]       │
│                                                       │
│  [🔴 CRÍTICO] Conta vencida R$ 5.000 (90 dias)      │
│  └─ Cliente: João Silva | Ação: [Cobrar] [Ver]     │
│                                                       │
│  [🟠 ALTO] Fluxo caixa negativo em 3 dias           │
│  └─ Valor: -R$ 2.000 | Ação: [Aprovar Limite]      │
│                                                       │
│  [🟡 MÉDIO] Ocupação baixa (65%) - Semana             │
│  └─ Sugestão: Ativar promoção | [Atualizar]         │
│                                                       │
│  [🟢 BAIXO] Repasse profissional pronto (R$ 1.500)  │
│  └─ Dr. Ana Silva | Ação: [Aprova] [Agendar]        │
│                                                       │
│  📋 Automações em Execução:                          │
│  ├─ Cobrança automática: 3 em execução              │
│  ├─ Notificações agendadas: 7 pendentes             │
│  └─ Workflows: 2 ativos                             │
│                                                       │
└─────────────────────────────────────────────────────┘
```

### 📈 Benefícios
- ⚡ Reduz tempo de resposta em 80%
- 🤖 Automações economizam 10h/semana
- 📱 Notificações em tempo real
- 💼 Customizável por perfil de usuário
- 🔄 Workflows sem programação

---

## 📋 Ordem de Implementação Recomendada

```
SEMANA 1: ETAPA 6 (Conciliação)
├── Dia 1-2: Tabelas + Funções SQL
├── Dia 3-4: Upload de extratos
├── Dia 5: Matching automático
└── Dia 6: Component React

SEMANA 2: ETAPA 7 (Cockpit Premium)
├── Dia 1-2: Views SQL + Previsões
├── Dia 3-4: Componentes React
├── Dia 5-6: Gráficos + Comparativo
└── Dia 7: Testes + Otimização

SEMANA 3: ETAPA 8 (Alertas)
├── Dia 1-2: Templates + Configuração
├── Dia 3-4: Canais de notificação
├── Dia 5-6: Automações + Triggers
└── Dia 7: Testes end-to-end
```

---

## 🎯 Dependências de Infraestrutura

| Serviço | Necessário | Gratuito | Pago |
|---------|-----------|----------|------|
| WhatsApp/SMS | ETAPA 8 | ❌ | ✅ $0.01/msg |
| Email API | ETAPA 8 | ✅ Brevo | ✅ SendGrid |
| Banco de Dados | Todas | ✅ Supabase | ✅ AWS RDS |
| Hosting | Todas | ✅ Vercel | ✅ AWS |

---

## 📞 Próximos Passos

```
[ ] ETAPA 6: Iniciar desenvolvimento
    └─ SQL: supabase/migrations/20260524_ETAPA6_CONCILIACAO.sql
    └─ React: src/pages/clinica/financeiro/Conciliador.jsx
    └─ Menu: Financeiro → Movimento → Conciliação Bancária

[ ] ETAPA 7: Após ETAPA 6 completa
    └─ SQL: supabase/migrations/20260531_ETAPA7_COCKPIT.sql
    └─ React: src/pages/clinica/financeiro/CockpitPremium.jsx
    └─ Menu: Financeiro → Análise → Financial Cockpit

[ ] ETAPA 8: Após ETAPA 7 completa
    └─ SQL: supabase/migrations/20260607_ETAPA8_ALERTAS.sql
    └─ React: src/pages/clinica/financeiro/AlertasCentral.jsx
    └─ Menu: Financeiro → Análise → Alertas e Automações
```

---

## ✅ Checklist de Validação por ETAPA

### ETAPA 6
- [ ] Upload de extrato funciona
- [ ] Matching automático >85% precisão
- [ ] 100 transações processadas em <5s
- [ ] Histórico de reconciliação salvo
- [ ] Relatório exportável

### ETAPA 7
- [ ] 12 KPIs calculando corretamente
- [ ] Gráficos rendendo sem lag
- [ ] Previsão dentro de 10% da realidade
- [ ] Comparativo período funcionando
- [ ] Dashboard carrega em <3s

### ETAPA 8
- [ ] Alertas enviados no tempo correto
- [ ] 90%+ taxa de entrega
- [ ] Automações executando sem erros
- [ ] Histórico completo de alertas
- [ ] Preferências de notificação por usuário

---

**Status**: 🟢 Pronto para iniciar  
**Estimativa**: 3 semanas  
**Complexidade**: 🔴 Alta (ETAPA 6) 🟠 Média-Alta (ETAPA 7) 🟠 Média-Alta (ETAPA 8)

