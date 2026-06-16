⏰ ETAPA 8: ALERTAS E AUTOMAÇÕES - PLANO DETALHADO

════════════════════════════════════════════════════════════════════════════════

📋 OBJETIVO

Implementar sistema avançado de alertas e automações para:
- Monitorar inadimplência em tempo real
- Notificar sobre repasses atrasados
- Alertar sobre metas não atingidas
- Executar ações automáticas baseadas em regras
- Enviar notificações (email, push, dashboard)

════════════════════════════════════════════════════════════════════════════════

🏗️ ARQUITETURA

1. BANCO DE DADOS
   ├─ alerts_config: Configuração de alertas por clínica
   ├─ alert_rules: Regras de disparo de alertas
   ├─ alert_notifications: Histórico de notificações
   ├─ alert_actions: Ações automáticas a executar
   └─ notification_logs: Log de envios

2. SQL FUNCTIONS
   ├─ create_alert_if_delinquency() - Alerta inadimplência
   ├─ create_alert_if_repayment_late() - Alerta repasse atrasado
   ├─ create_alert_if_goal_missed() - Alerta meta não atingida
   ├─ create_alert_if_low_cash_flow() - Alerta fluxo de caixa
   ├─ execute_alert_action() - Executa ação automática
   └─ check_and_trigger_alerts() - Função scheduled

3. REACT COMPONENTS
   ├─ AlertCenter.jsx - Central de alertas
   ├─ AlertNotification.jsx - Componente de notificação
   ├─ AlertSettings.jsx - Configuração de alertas
   ├─ AlertHistory.jsx - Histórico de alertas
   └─ NotificationBell.jsx - Ícone com contador

4. APIs
   ├─ alertsApi.js - CRUD de alertas
   ├─ notificationsApi.js - Envio de notificações
   └─ automationApi.js - Controle de automações

5. BACKEND (Node.js)
   ├─ alert-service.js - Serviço de alertas
   ├─ notification-queue.js - Fila de notificações
   ├─ automation-executor.js - Executor de automações
   └─ email-service.js - Envio de emails

════════════════════════════════════════════════════════════════════════════════

📊 TIPOS DE ALERTAS

1. ALERTAS DE INADIMPLÊNCIA
   ├─ Quando: Faturas com 1+ dia de atraso
   ├─ Severidade: MEDIUM
   ├─ Ação: Email + Dashboard
   ├─ Config: Ativar/desativar, email destinatário
   └─ Exemplo: "2 faturas vencidas (R$ 850) de João Silva"

2. ALERTAS DE REPASSE ATRASADO
   ├─ Quando: Repasse médico não pago há 48+ horas
   ├─ Severidade: HIGH
   ├─ Ação: Email + SMS + Dashboard
   ├─ Config: Dias limite, profissionais
   └─ Exemplo: "Dr. Pedro aguarda repasse de R$ 1.200"

3. ALERTAS DE META NÃO ATINGIDA
   ├─ Quando: KPI < 80% da meta para o período
   ├─ Severidade: LOW
   ├─ Ação: Dashboard + Email diária
   ├─ Config: Metas por KPI
   └─ Exemplo: "Faturamento 28% abaixo da meta (R$ 12k vs R$ 17k)"

4. ALERTAS DE FLUXO DE CAIXA
   ├─ Quando: Saldo em caixa < 10% receita mensal
   ├─ Severidade: HIGH
   ├─ Ação: Email + SMS + Dashboard
   ├─ Config: Limiar percentual
   └─ Exemplo: "Fluxo de caixa crítico: R$ 800 disponível"

5. ALERTAS DE COLETA BAIXA
   ├─ Quando: Taxa de coleta < meta diária por 3 dias
   ├─ Severidade: MEDIUM
   ├─ Ação: Email + Dashboard
   ├─ Config: Meta diária %
   └─ Exemplo: "Coleta em 12% (meta: 25%) - últimos 3 dias"

════════════════════════════════════════════════════════════════════════════════

⚙️ AUTOMAÇÕES

1. AUTO-GERAR COBRANÇA
   ├─ Gatilho: Fatura com 5+ dias de atraso
   ├─ Ação: Criar segunda notificação de cobrança
   ├─ Config: Ativar/desativar, dias limite
   └─ Resultado: Email automático de cobrança enviado

2. AUTO-AGENDAR REPASSE
   ├─ Gatilho: Repasse não pago há 48h
   ├─ Ação: Criar agendamento de pagamento
   ├─ Config: Data padrão (p.ex., 5º dia útil)
   └─ Resultado: Repasse marcado para "Agendado"

3. AUTO-APLICAR DESCONTO
   ├─ Gatilho: Fatura em atraso por 60+ dias
   ├─ Ação: Aplicar desconto de 5% se pago na semana
   ├─ Config: % desconto, dias limite
   └─ Resultado: Flag "desconto_pendente" ativado

4. AUTO-ESCALAR
   ├─ Gatilho: Fatura em atraso por 30+ dias sem resposta
   ├─ Ação: Enviar email para gestor
   ├─ Config: Gestor responsável
   └─ Resultado: Notificação escalonada para gestor

5. AUTO-ATUALIZAR STATUS
   ├─ Gatilho: Repasse foi pago
   ├─ Ação: Atualizar status_repayment = "paid", data_pagamento
   ├─ Config: Validação automática
   └─ Resultado: Dashboard atualizado em tempo real

════════════════════════════════════════════════════════════════════════════════

🗄️ SCHEMA BANCO DE DADOS

-- Configuração de alertas por clínica
CREATE TABLE alert_configs (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  alert_type VARCHAR(50), -- 'delinquency', 'repayment_late', 'goal_missed', 'low_cashflow'
  is_enabled BOOLEAN DEFAULT TRUE,
  severity_level VARCHAR(20), -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  check_frequency VARCHAR(20), -- 'HOURLY', 'DAILY', '3HOURLY'
  notify_channels JSONB, -- {email: true, sms: false, push: true, dashboard: true}
  email_recipients TEXT[], -- ['admin@clinic.com', 'financeiro@clinic.com']
  webhook_url TEXT, -- Para integrações customizadas
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Regras específicas de alerta
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  alert_config_id UUID REFERENCES alert_configs(id),
  rule_name VARCHAR(100),
  condition_type VARCHAR(50), -- 'delinquency_days', 'amount', 'percentage', etc
  condition_value NUMERIC,
  condition_operator VARCHAR(10), -- '>', '<', '>=', '<=', '=='
  action_on_trigger VARCHAR(100), -- 'email', 'sms', 'escalate', 'auto_cobranca'
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Histórico de notificações
CREATE TABLE alert_notifications (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  alert_config_id UUID REFERENCES alert_configs(id),
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  title VARCHAR(200),
  message TEXT,
  data JSONB, -- {patient: 'João', amount: 850, days_late: 5, invoice_id: '...'}
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'resolved', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  created_by UUID REFERENCES users(id)
);

-- Log de envios de notificação
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY,
  alert_notification_id UUID REFERENCES alert_notifications(id),
  channel VARCHAR(50), -- 'email', 'sms', 'push', 'dashboard'
  recipient VARCHAR(255),
  status VARCHAR(20), -- 'pending', 'sent', 'failed', 'bounced'
  error_message TEXT,
  sent_at TIMESTAMP,
  delivery_status VARCHAR(50) -- Para webhooks de entrega
);

-- Ações automáticas pendentes
CREATE TABLE alert_actions (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  alert_notification_id UUID REFERENCES alert_notifications(id),
  action_type VARCHAR(100), -- 'send_email', 'create_cobranca', 'update_status', etc
  action_params JSONB, -- Parâmetros específicos da ação
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'executing', 'completed', 'failed'
  execution_result TEXT,
  scheduled_for TIMESTAMP,
  executed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

════════════════════════════════════════════════════════════════════════════════

📱 COMPONENTES REACT

1. AlertCenter.jsx (Página principal)
   ├─ Lista de alertas ativas
   ├─ Filtros: tipo, severidade, data
   ├─ Ações: resolver, descartar, editar
   ├─ Gráfico: alertas por tipo (pizza)
   └─ Stats: alertas críticos, ativos, resolvidos

2. NotificationBell.jsx (Navbar)
   ├─ Ícone de sino com contador
   ├─ Dropdown com últimos 5 alertas
   ├─ Indicador: vermelho (crítico), laranja (alto), amarelo (médio)
   ├─ Ação: clique abre AlertCenter
   └─ Auto-atualiza cada 30s

3. AlertSettings.jsx (Página de config)
   ├─ Ativar/desativar tipos de alerta
   ├─ Escolher canais: email, SMS, push
   ├─ Definir frequência de verificação
   ├─ Listar recipients de email
   ├─ Configurar webhooks
   └─ Salvar preferences

4. AlertHistory.jsx (Histórico)
   ├─ Todos os alertas (ativo + resolvido)
   ├─ Filtros: data range, tipo
   ├─ Paginação
   ├─ Exportar como CSV/PDF
   └─ Ver detalhes: ações tomadas

5. AlertNotification.jsx (Toast component)
   ├─ Notificação em tempo real
   ├─ Cores por severidade
   ├─ Dismiss button
   ├─ Link para AlertCenter
   ├─ Auto-hide após 8s

════════════════════════════════════════════════════════════════════════════════

🔄 FLUXO DE EXECUÇÃO

1. TRIGGER DIÁRIO (3:00 AM)
   ├─ Função: check_and_trigger_alerts()
   ├─ Processa todas as clínicas
   ├─ Verifica cada alert_config ativa
   ├─ Executa logic de alerta
   └─ Cria alert_notifications

2. QUANDO ALERTA É CRIADO
   ├─ insert trigger: alert_notifications
   ├─ Busca email_recipients de alert_config
   ├─ Cria rows em notification_logs (pending)
   ├─ Enfileira em queue de notificações
   └─ Processa fila (email async)

3. QUANDO AÇÃO É ACIONADA
   ├─ insert alert_action
   ├─ Valida parâmetros
   ├─ Executa ação (async)
   ├─ Atualiza status = 'completed' ou 'failed'
   ├─ Cria log de execução
   └─ Notifica resultado ao usuário

════════════════════════════════════════════════════════════════════════════════

⏱️ TIMELINE ETAPA 8

Tarefa 8.1: Criar migration SQL (tabelas + functions)  [30 min]
Tarefa 8.2: Criar alertsApi.js + notificationsApi.js    [20 min]
Tarefa 8.3: Implementar AlertCenter.jsx                 [40 min]
Tarefa 8.4: Implementar NotificationBell.jsx            [20 min]
Tarefa 8.5: Implementar AlertSettings.jsx               [30 min]
Tarefa 8.6: Integrar menu + rota                        [10 min]
Tarefa 8.7: Testar sistema completo                     [30 min]
────────────────────────────────────────────────────────
TOTAL: ~3 horas

════════════════════════════════════════════════════════════════════════════════

✅ COMEÇAR ETAPA 8 - Tarefa 8.1: SQL Migration
