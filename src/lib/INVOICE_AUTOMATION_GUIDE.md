/\*\*

- 📊 NF → AR → REPASSE AUTOMATION GUIDE
-
- Fluxo Completo de Emissão de Nota Fiscal e Geração Automática de Contas a Receber + Repasse
-
- Date: 2026-05-02
- Status: ✅ Ready for Production
  \*/

// ============================================================
// 1. ARQUITETURA DO FLUXO
// ============================================================

/_
┌─────────────────────────────────────────────────────────────┐
│ FLUXO COMPLETO │
├─────────────────────────────────────────────────────────────┤
│ │
│ 1. 📋 APPOINTMENT COMPLETED │
│ └─ Status: at_checkout → awaiting_professional │
│ │
│ 2. 📄 ISSUE INVOICE (AppointmentUnitedModal.jsx) │
│ └─ Modal: InvoiceEmissionModal │
│ └─ Calls: invoiceApi.createInvoice() │
│ └─ Creates: invoices table record (status: draft) │
│ │
│ 3. 📊 EMIT INVOICE & CREATE AR (invoiceApi.js) │
│ └─ Updates: invoices.status = 'issued' │
│ └─ Triggers: fn_create_ar_from_invoice() (SQL) │
│ └─ Creates: ar_receivables record (status: open) │
│ └─ Amount: invoice.net_amount (bruto - desconto) │
│ │
│ 4. 💰 TRIGGER PROFESSIONAL REPASSE (invoiceApi.js) │
│ └─ Queries: medical_repasse_config │
│ └─ Calculates: repasse_amount = net_amount _ % │
│ └─ Creates: medical_production record │
│ └─ Stores: professional_id, amount, percentage │
│ │
│ 5. 📈 GENERATE REPASSE ACCOUNTS (optional monthly) │
│ └─ Via: medicalRepasseApi.generateMonthlyRepasse() │
│ └─ Creates: contas_a_pagar records (ap_bills) │
│ └─ Amount: repasse_amount │
│ └─ Status: scheduled → pending payment │
│ │
└─────────────────────────────────────────────────────────────┘
\*/

// ============================================================
// 2. ARQUIVO: invoiceApi.js (PRINCIPAL)
// ============================================================

/\*
FUNÇÕES EXPORT:

1. createInvoice(params)
   - Cria NF com status: draft
   - params: clinicId, appointmentId, patientId, payerId, grossAmount, etc
   - return: { id, invoice_number, ...dados }

2. emitInvoiceAndCreateAR(invoiceId, options)
   - Emite NF (status: issued)
   - Dispara trigger SQL fn_create_ar_from_invoice()
   - Cria registr em medical_production
   - return: { invoice, receivable, repasse }

3. updateInvoiceStatus(invoiceId, newStatus)
   - Atualiza status da NF
   - Valores: 'draft', 'issued', 'sent', 'canceled'

4. cancelInvoice(invoiceId, cancellationReason)
   - Cancela NF e AR relacionados
   - Dispara reversão de dados

5. listInvoices(clinicId, filters)
   - Busca todas as NF da clínica
   - filters: { appointmentId, status, payerType, etc }

6. getInvoice(invoiceId)
   - Retorna dados completos da NF com relacionamentos
     \*/

// ============================================================
// 3. ARQUIVO: InvoiceEmissionModal.jsx (UI)
// ============================================================

/\*
COMPONENTE REACT:

Props:

- isOpen: boolean - Controla abertura do modal
- onClose: () => void - Callback de fechamento
- onSuccess: (invoiceData) => void - Callback de sucesso
- appointmentData: object - Dados do agendamento
- patientData: object - Dados do paciente

Estado:

- formData.description - Descrição dos serviços (obrigatório)
- formData.grossAmount - Valor bruto (obrigatório)
- formData.discountAmount - Desconto (opcional)
- formData.dueDate - Data de vencimento (30 dias padrão)
- formData.payerType - Tipo de pagador: patient, insurance, company
- formData.shouldCreateAR - Criar AR automaticamente (default: true)
- formData.shouldTriggerRepasse - Calcular repasse (default: true)

Fluxo:

1. User preenche formulário
2. Clica "Emitir NF"
3. Valida dados obrigatórios
4. Chama invoiceApi.createInvoice()
5. Chama invoiceApi.emitInvoiceAndCreateAR()
6. Exibe sucesso com número da NF
7. Fecha modal automaticamente

UI Features:

- Resumo dos dados do atendimento
- Cálculo de valor líquido em tempo real
- Toggle para automação (AR + Repasse)
- Feedback visual de sucesso/erro
  \*/

// ============================================================
// 4. DATABASE SCHEMA
// ============================================================

/\*
TABLE: invoices
┌─────────────────────────────────────────────────┐
│ Column │ Type │ Notes │
├─────────────────────────────────────────────────┤
│ id │ UUID │ PK │
│ clinic_id │ UUID │ FK clinics │
│ appointment_id │ UUID │ FK appointments│
│ patient_id │ UUID │ FK patients │
│ payer_id │ UUID │ FK payers │
│ professional_id │ UUID │ FK professionals│
│ service_id │ UUID │ FK services │
│ invoice_number │ VARCHAR │ YYYY-000001 │
│ status │ VARCHAR │ draft/issued │
│ gross_amount │ DECIMAL │ Bruto │
│ discount_amount │ DECIMAL │ Desconto │
│ net_amount │ DECIMAL │ Líquido │
│ payer_type │ VARCHAR │ patient/etc │
│ description │ TEXT │ Serviços │
│ emission_date │ DATE │ Emissão │
│ due_date │ DATE │ Vencimento │
│ notes │ TEXT │ Observações │
│ created_at │ TIMESTAMP │ Auto │
│ updated_at │ TIMESTAMP │ Auto │
└─────────────────────────────────────────────────┘

TRIGGERS:

1. fn_create_ar_from_invoice()
   - Executa quando invoices.status = 'issued'
   - Cria registro em ar_receivables
   - Cópia de dados: amount, payer_name, description, etc

2. fn_cancel_invoice_with_ar()
   - Executa quando invoices.status = 'canceled'
   - Atualiza ar_receivables.status = 'canceled'
   - Reversa dados financeiros
     \*/

// ============================================================
// 5. INTEGRAÇÃO COM AR (CONTAS A RECEBER)
// ============================================================

/\*
FLUXO AR:

Quando invoices.status = 'issued':
↓
fn_create_ar_from_invoice() trigger executa
↓
INSERT INTO ar_receivables:

- invoice_id = invoice.id (link-back)
- description = 'NF ' + invoice_number + description
- amount = invoice.net_amount
- status = 'open'
- data_vencimento = invoice.due_date
- origem = 'nf'
- profissional_id = invoice.professional_id
- paciente_id = invoice.patient_id
- convenio_id = (se tipo = insurance)

Campos mapeados (camelCase → snake_case):
invoiceData.netAmount → ar_receivables.amount
invoiceData.payerName → ar_receivables.pager_name
invoiceData.dueDate → ar_receivables.data_vencimento
\*/

// ============================================================
// 6. INTEGRAÇÃO COM REPASSE (MEDICAL PRODUCTION)
// ============================================================

/\*
FLUXO REPASSE:

Quando invoiceApi.emitInvoiceAndCreateAR() executa:
↓
triggerProfessionalRepasse() é chamada
↓
Busca: medical_repasse_config
└─ clinic_id, professional_id
└─ percentage (ex: 70% para o profissional)
↓
Calcula:

- repasseAmount = invoice.net_amount \* (percentage / 100)
- clinicAmount = invoice.net_amount \* (1 - percentage)
  ↓
  INSERT INTO medical_production:
- clinic_id
- professional_id
- appointment_id
- invoice_id (link)
- amount (valor da NF)
- repasse_percentage
- repasse_amount
- clinic_amount
- status = 'registered'
  ↓
  Posteriormente (monthly):
- medicalRepasseApi.generateMonthlyRepasse()
- Cria registros em ap_bills (contas a pagar)
- Amount = repasse_amount
- Tipo = 'medical_repasse'
  \*/

// ============================================================
// 7. COMO USAR - PASSO A PASSO
// ============================================================

/\*
STEP 1: MIGRATIONS
Execute SQL no Supabase:

- supabase/migrations/20260502_create_invoices_table.sql
- Cria tabela invoices
- Cria triggers de AR automático

STEP 2: FILES CRIADOS

- src/lib/invoiceApi.js (API)
- src/pages/clinica/agenda/components/InvoiceEmissionModal.jsx (UI)

STEP 3: INTEGRAÇÃO NO MODAL

- AppointmentUnitedModal.jsx recebeu:
  - Import: InvoiceEmissionModal
  - State: invoiceModalOpen
  - Button: "📄 Emitir NF" (na aba "resumo")
  - Render: <InvoiceEmissionModal ... />

STEP 4: FLUXO NA APLICAÇÃO

1. User abre "Editar Agendamento"
2. Atende paciente → status "at_checkout"
3. Clica "🎬 Criar Atendimento"
4. Auto-navega para aba "resumo"
5. Clica "📄 Emitir NF"
6. Preenche dados da NF
7. Clica "Emitir NF"
   → Cria invoice (draft)
   → Emite invoice (issued)
   → Trigger SQL cria AR
   → Calcula repasse do profissional
   → Exibe confirmação
8. Clica "✅ Liberar para Atendimento"
   → Modal fecha
   \*/

// ============================================================
// 8. CONFIGURAÇÃO NECESSÁRIA - REPASSE
// ============================================================

/\*
ANTES DE EMITIR NF:
Configure percentuais de repasse na tabela medical_repasse_config:

INSERT INTO medical_repasse_config (
clinic_id,
professional_id,
percentage,
effective_from
) VALUES (
'clinic-uuid',
'professional-uuid',
70, -- 70% para o profissional
NOW()
);

Se não configurado:

- triggerProfessionalRepasse() retorna NULL
- NF é emitida normalmente
- AR é criado com sucesso
- Apenas repasse não é calculado (log aviso)
  \*/

// ============================================================
// 9. VALIDAÇÕES E ERROS
// ============================================================

/\*
OBRIGATÓRIOS PARA EMITIR NF:
✅ appointment_id (agendamento)
✅ patient_id (paciente)
✅ payer_id (pagador)
✅ gross_amount > 0 (valor bruto)
✅ description (descrição)

AUTOMÁTICO DO APPOINTMENT:

- clinic_id
- professional_id
- service_id

OPCIONAIS:

- discount_amount
- notes
- payer_type (default: 'insurance')

SE FALTAR DADOS:

- Modal mostra alert com erro
- Não fecha
- User pode corrigir dados no agendamento e tentar novamente
  \*/

// ============================================================
// 10. TESTE RÁPIDO
// ============================================================

/\*
CENÁRIO DE TESTE:

1. Criar agendamento normal
2. Status "at_checkout"
3. Clicar "Criar Atendimento"
4. Ir para aba "Resumo"
5. Clicar "Emitir NF"
6. Preencher:
   - Descrição: "Consulta Clínica Geral"
   - Valor Bruto: R$ 150,00
   - Desconto: R$ 0,00
   - Vencimento: 30 dias
   - Tipo Pagador: "Convênio/Seguro"
7. Clicar "Emitir NF"

ESPERADO:
✅ NF criada com número: 2026-000001
✅ Status: draft → issued
✅ AR criado automaticamente
✅ Repasse calculado (se config existir)
✅ Modal fecha após 2 segundos
✅ Mensagem: "✅ NF 2026-000001 emitida com sucesso!"

VERIFICAR:

- Tabela invoices: novo registro
- Tabela ar_receivables: novo registro com invoice_id
- Tabela medical_production: novo registro de produção (se config existe)
  \*/

// ============================================================
// 11. TROUBLESHOOTING
// ============================================================

/\*
PROBLEMA: "Erro ao criar NF: Clínica obrigatória"
SOLUÇÃO: Verificar se clinicId está vindo do context

PROBLEMA: "Erro ao criar NF: Agendamento obrigatório"
SOLUÇÃO: Verificar se appointmentId está sendo passado ao modal

PROBLEMA: "Erro ao criar NF: Pagador obrigatório"
SOLUÇÃO: Configurar payer_id no agendamento antes de emitir NF

PROBLEMA: AR não foi criado automaticamente
SOLUÇÃO: Verificar se trigger fn_create_ar_from_invoice() foi criada no Supabase

PROBLEMA: Repasse não foi calculado
SOLUÇÃO: Verificar se medical_repasse_config existe para this profissional

PROBLEMA: "Erro ao emitir NF e criar AR"
SOLUÇÃO: Verifique logs do Supabase em Logs > Edge Functions
\*/

// ============================================================
// 12. NEXT STEPS (FUTURO)
// ============================================================

/\*
MELHORIAS PLANEJADAS:

1. 📤 Envio de NF por Email
   - Integrar com notification system
   - Template de email com dados da NF

2. 📊 Dashboard de NF
   - Lista de invoices emitidas
   - Filtro por status, período, profissional
   - Relatórios de faturamento

3. 🔗 Integração com NFe (Nota Fiscal Eletrônica)
   - Gerar XML para envio à SEFAZ
   - Rastreamento de status
   - Download de DANFE

4. 💳 Automação de Pagamento
   - Gerar boleto/PIX a partir de AR
   - Webhooks para confirmação de pagamento
   - Reversão de AR quando pagamento recebido

5. 📈 Analytics
   - Média de faturamento por profissional
   - Taxa de conversão agendamento → NF → AR recebido
   - Previsão de fluxo de caixa
     \*/

// ============================================================

export default {
architecture: "NF → AR → REPASSE",
version: "1.0",
status: "production",
createdAt: "2026-05-02"
};
