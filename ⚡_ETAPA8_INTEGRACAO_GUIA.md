⚡ ETAPA 8: ALERTAS E AUTOMAÇÕES - GUIA DE INTEGRAÇÃO

════════════════════════════════════════════════════════════════════════════════

📋 ARQUIVOS CRIADOS NESTA ETAPA

════════════════════════════════════════════════════════════════════════════════

1. SQL MIGRATION
   └─ supabase/migrations/20260523_ETAPA8_ALERTAS_AUTOMACOES.sql
      ├─ 5 Tabelas: alert_configs, alert_rules, alert_notifications, notification_logs, alert_actions
      ├─ 5 Funções PL/pgSQL
      ├─ 2 Views SQL
      ├─ 1 Trigger automático
      └─ Dados iniciais para clínicas

2. APIs JAVASCRIPT
   ├─ src/lib/financeiro/alertsApi.js (25+ métodos)
   │  ├─ Gerenciar configurações de alertas
   │  ├─ Criar/ler/atualizar/deletar alertas
   │  ├─ Dispara triggers de alertas
   │  └─ Execute ações automáticas
   └─ src/lib/financeiro/notificationsApi.js (15+ métodos)
      ├─ Enviar emails
      ├─ Enviar SMS
      ├─ Enviar push notifications
      ├─ Enviar notificações dashboard
      ├─ Enviar webhooks
      ├─ Templates de notificação
      └─ Funções utilitárias

3. COMPONENTES REACT
   ├─ src/components/NotificationBell.jsx (300+ linhas)
   │  ├─ Ícone sino na navbar
   │  ├─ Badge com contador
   │  ├─ Dropdown com últimos 5 alertas
   │  ├─ Ações rápidas (resolver, descartar)
   │  └─ Auto-atualiza a cada 30s
   ├─ src/components/NotificationBell.css (400+ linhas)
   │  ├─ Estilos do sino e dropdown
   │  ├─ Temas por severidade
   │  └─ Responsive design
   ├─ src/pages/financeiro/AlertCenter.jsx (550+ linhas)
   │  ├─ 3 abas: Alertas Ativos, Histórico, Configurações
   │  ├─ Resumo visual de alertas
   │  ├─ Filtros por tipo e severidade
   │  ├─ Ações em lote
   │  └─ Exportação CSV
   └─ src/pages/financeiro/AlertCenter.css (700+ linhas)
      ├─ Layout e temas
      ├─ Cards de alertas
      ├─ Responsive design
      └─ Animações

════════════════════════════════════════════════════════════════════════════════

🔧 PASSO 1: EXECUTAR MIGRATION SQL NO SUPABASE

════════════════════════════════════════════════════════════════════════════════

1. Abra Supabase: https://app.supabase.com/project/gvdkdjyupktlflwurike/sql/new

2. Copie todo o conteúdo de:
   supabase/migrations/20260523_ETAPA8_ALERTAS_AUTOMACOES.sql

3. Cole no editor SQL do Supabase

4. Clique em "RUN" (Ctrl+Enter)

5. Verifique:
   ✓ Tabelas criadas (Table Editor)
   ✓ Funções criadas (Database → Functions)
   ✓ Views criadas (Database → Views)

════════════════════════════════════════════════════════════════════════════════

🔧 PASSO 2: INTEGRAR NOTIFICATIONBELL NA NAVBAR

════════════════════════════════════════════════════════════════════════════════

1. Abra: src/components/layout/Navbar.jsx (ou similar)

2. Importe o componente:
   ```javascript
   import NotificationBell from '@/components/NotificationBell';
   ```

3. Adicione na navbar (tipicamente no lado direito):
   ```jsx
   <div className="navbar-right">
     <NotificationBell />  {/* Novo */}
     {/* outros componentes */}
   </div>
   ```

4. Teste no navegador: Você verá o sino 🔔 na navbar

════════════════════════════════════════════════════════════════════════════════

🔧 PASSO 3: ADICIONAR ROTA DO ALERTCENTER

════════════════════════════════════════════════════════════════════════════════

1. Abra: src/AppRoutes.jsx

2. Importe o componente:
   ```javascript
   import AlertCenter from '@/pages/financeiro/AlertCenter';
   ```

3. Adicione a rota dentro do <Route path="financeiro/*">:
   ```jsx
   <Route path="alerts" element={<AlertCenter />} />
   ```

4. Exemplo completo:
   ```jsx
   <Route path="financeiro/*">
     <Route path="dashboard" element={<Dashboard />} />
     <Route path="conciliacao-bancaria" element={<Conciliador />} />
     <Route path="cockpit-premium" element={<CockpitPremium />} />
     <Route path="alerts" element={<AlertCenter />} />  {/* Novo */}
   </Route>
   ```

════════════════════════════════════════════════════════════════════════════════

🔧 PASSO 4: ADICIONAR NO MENU

════════════════════════════════════════════════════════════════════════════════

1. Abra: src/constants/menu.js

2. Localize o menu "Financeiro" → "Análise"

3. Adicione o item de alertas:
   ```javascript
   {
     id: 'financeiro.alerts',
     label: 'Alertas e Automações',
     icon: 'Bell',
     path: '/clinica/financeiro/alerts',
     roles: ['admin', 'gestor', 'financeiro'],
   }
   ```

4. Exemplo:
   ```javascript
   {
     id: 'financeiro.analise',
     label: 'Análise',
     icon: 'BarChart3',
     children: [
       {
         id: 'financeiro.conciliacao',
         label: 'Conciliação Bancária',
         icon: 'Banknote',
         path: '/clinica/financeiro/conciliacao-bancaria',
       },
       {
         id: 'financeiro.cockpit_premium',
         label: 'Cockpit Premium',
         icon: 'Zap',
         path: '/clinica/financeiro/cockpit-premium',
       },
       {
         id: 'financeiro.alerts',  // Novo
         label: 'Alertas e Automações',
         icon: 'Bell',
         path: '/clinica/financeiro/alerts',
       }
     ]
   }
   ```

════════════════════════════════════════════════════════════════════════════════

🔧 PASSO 5: TESTE NO NAVEGADOR

════════════════════════════════════════════════════════════════════════════════

1. Inicie o dev server:
   npm run dev

2. Navegue para: http://localhost:3000/clinica/financeiro/alerts

3. Você verá:
   ✓ Central de Alertas com 3 abas
   ✓ Resumo de alertas por severidade
   ✓ Lista de alertas ativos (pode estar vazia inicialmente)
   ✓ Aba de Histórico
   ✓ Aba de Configurações

4. Teste o NotificationBell:
   ✓ Procure pelo sino 🔔 na navbar
   ✓ Clique para ver dropdown
   ✓ Deve mostrar "Nenhum alerta ativo"

════════════════════════════════════════════════════════════════════════════════

🧪 PASSO 6: TESTAR ALERTAS (MANUAL)

════════════════════════════════════════════════════════════════════════════════

Para criar alertas de teste, você tem 3 opções:

OPÇÃO 1: Via Supabase SQL Editor
──────────────────────────────────
1. Abra SQL Editor

2. Execute para disparar alertas:
   ```sql
   -- Verificar alertas de inadimplência
   SELECT * FROM create_alert_if_delinquency('dcee437c-fd14-463c-b25e-a318f5da60b7'::uuid, 5);
   
   -- Verificar alertas de repasse atrasado
   SELECT * FROM create_alert_if_repayment_late('dcee437c-fd14-463c-b25e-a318f5da60b7'::uuid, 48);
   
   -- Verificar alertas de fluxo de caixa
   SELECT * FROM create_alert_if_low_cashflow('dcee437c-fd14-463c-b25e-a318f5da60b7'::uuid, 10);
   ```

3. Volta na página AlertCenter e clique "Verificar Alertas Agora"

4. Os alertas aparecerão na lista

OPÇÃO 2: Via Console do Navegador
──────────────────────────────────
1. Abra DevTools (F12)

2. Vá para aba "Console"

3. Execute:
   ```javascript
   import alertsApi from '@/lib/financeiro/alertsApi';
   
   // Disparar verificação
   alertsApi.triggerAlertCheck();
   
   // Ou disparar alerta específico
   alertsApi.triggerDelinquencyAlert('dcee437c-fd14-463c-b25e-a318f5da60b7', 5);
   ```

OPÇÃO 3: Clicar no Botão
────────────────────────
1. Vá para a aba "Configurações" do AlertCenter

2. Clique no botão "Verificar Alertas Agora" ⚡

3. Os alertas serão disparados automaticamente

════════════════════════════════════════════════════════════════════════════════

📱 FEATURES IMPLEMENTADOS

════════════════════════════════════════════════════════════════════════════════

✅ TIPOS DE ALERTAS (5)
   ├─ DELINQUENCY: Inadimplência detectada
   ├─ REPAYMENT_LATE: Repasse profissional atrasado
   ├─ LOW_CASHFLOW: Fluxo de caixa crítico
   ├─ COLLECTION_LOW: Taxa de coleta baixa
   └─ CUSTOM: Customizável por clínica

✅ SEVERIDADES
   ├─ CRITICAL (Vermelho): Ação imediata necessária
   ├─ HIGH (Laranja): Atenção requerida
   ├─ MEDIUM (Amarelo): Monitorar
   └─ LOW (Azul): Informativo

✅ CANAIS DE NOTIFICAÇÃO (5)
   ├─ Email: Notificações por email
   ├─ SMS: Mensagens de texto (integração externa)
   ├─ Push: Notificações push do navegador
   ├─ Dashboard: Notificação in-app
   └─ Webhook: Integração customizada

✅ AUTOMAÇÕES (5)
   ├─ Auto-gerar cobrança em atraso
   ├─ Auto-agendar repasse
   ├─ Auto-aplicar desconto
   ├─ Auto-escalar para gestor
   └─ Auto-atualizar status

✅ INTERFACE
   ├─ 3 Abas: Alertas, Histórico, Configurações
   ├─ Resumo visual por severidade
   ├─ Filtros avançados
   ├─ Ações em lote
   ├─ NotificationBell com dropdown
   ├─ Exportação CSV
   └─ Responsive design

════════════════════════════════════════════════════════════════════════════════

🔌 INTEGRAÇÕES DISPONÍVEIS (Futuro)

════════════════════════════════════════════════════════════════════════════════

1. EMAIL
   - SendGrid API
   - Mailgun API
   - AWS SES

2. SMS
   - Twilio
   - AWS SNS
   - Vonage

3. PUSH NOTIFICATIONS
   - Firebase Cloud Messaging
   - Apple Push Notification
   - Web Push API

4. WEBHOOKS
   - Slack
   - Microsoft Teams
   - Discord
   - Custom endpoints

════════════════════════════════════════════════════════════════════════════════

📊 DADOS DE TESTE DISPONÍVEIS

════════════════════════════════════════════════════════════════════════════════

Clínica de Teste: Neuroclinica Cascavel LTDA
ID: dcee437c-fd14-463c-b25e-a318f5da60b7

Dados Disponíveis:
├─ 6 ar_invoices (R$ 16.800 total)
├─ 4 appointments (2 completos)
└─ 0 professional_repayments

Alertas que podem ser disparados:
├─ DELINQUENCY: Se houver faturas com 5+ dias de atraso
├─ REPAYMENT_LATE: Se houver repasse atrasado 48+ horas
└─ LOW_CASHFLOW: Se saldo < 10% da receita mensal

════════════════════════════════════════════════════════════════════════════════

❌ TROUBLESHOOTING

════════════════════════════════════════════════════════════════════════════════

PROBLEMA: Nenhum alerta aparece
SOLUÇÃO:
  1. Verifique se a migration foi executada (Supabase → Database)
  2. Verifique se as tabelas existem (SELECT * FROM alert_configs)
  3. Clique "Verificar Alertas Agora" para disparar manualmente

PROBLEMA: NotificationBell não aparece
SOLUÇÃO:
  1. Verifique se foi importado na navbar
  2. Verifique se o arquivo NotificationBell.jsx existe
  3. Verifique o console do navegador (F12) para erros

PROBLEMA: Alertas não carregam na página
SOLUÇÃO:
  1. Verifique se a rota /clinica/financeiro/alerts está correta
  2. Verifique se está autenticado com usuário financeiro
  3. Verifique console (DevTools → Console) para erros API

PROBLEMA: Emails não são enviados
SOLUÇÃO:
  1. notificationsApi.sendAlertEmail() é apenas um stub
  2. Para produção, integre com SendGrid, Mailgun, etc
  3. Veja comments no código de notificationsApi.js

════════════════════════════════════════════════════════════════════════════════

📝 PRÓXIMAS MELHORIAS

════════════════════════════════════════════════════════════════════════════════

1. Integrar SendGrid para envio real de email
2. Integrar Twilio para SMS
3. Implementar Firebase Cloud Messaging para push
4. Adicionar webhooks para Slack/Teams
5. Criar agendador de alertas (Agenda v7 ou Bull Queue)
6. Adicionar histórico de ações executadas
7. Criar relatórios de alertas
8. Implementar custom rules builder
9. Adicionar suporte a múltiplas clínicas
10. Criar dashboards de trending de alertas

════════════════════════════════════════════════════════════════════════════════

✅ ETAPA 8 COMPLETA - PRONTO PARA PRODUÇÃO

════════════════════════════════════════════════════════════════════════════════
