# GESCLINIC - REFERÊNCIA COMPLETA DE TABELAS DO BANCO DE DADOS

**Data de Revisão:** 12 de Janeiro de 2026  
**Status:** ✅ Completo - Todas as tabelas mapeadas e documentadas

---

## 📋 RESUMO EXECUTIVO

Este documento lista **TODAS** as 73 tabelas do Gesclinic, organizadas por módulo funcional:

- **Base:** 2 tabelas (clinics, users)
- **Agenda:** 10 tabelas (patients, professionals, appointments, services, etc.)
- **Payers/Planos:** 5 tabelas (payers, plans, professional_payers, service_prices, etc.)
- **Financeiro:** 8 tabelas (chart_of_accounts, ap_bills, ar_invoices, cash_flow, etc.)
- **Repasse Médico:** 3 tabelas (repasse_medico, repasse_config, repasse_ajuste)
- **Estoque:** 7 tabelas (stock_categories, stock_items, stock_movements, etc.)
- **Orçamentos:** 4 tabelas (orcamentos, orcamento_itens, orcamento_profissionais, etc.)
- **Laudos:** 1 tabela (laudos)
- **Conciliação Bancária:** 6 tabelas (clinic_bank_accounts, conciliation_bank_statements, etc.)

---

## 1️⃣ TABELAS BASE

### `clinics`
Armazena informações das clínicas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| name | TEXT | Nome da clínica |
| email | TEXT | Email principal |
| phone | TEXT | Telefone |
| address | TEXT | Endereço |
| city | TEXT | Cidade |
| state | TEXT | Estado |
| zip_code | TEXT | CEP |
| cnpj | TEXT | CNPJ (único) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** name, cnpj

---

### `users`
Usuários do sistema (autenticação via Supabase Auth).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária (ID do Supabase Auth) |
| clinic_id | UUID | FK: clinics |
| email | TEXT | Email (único) |
| name | TEXT | Nome do usuário |
| role | VARCHAR(50) | Papel (admin, doctor, receptionist, etc.) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, email

---

## 2️⃣ MÓDULO AGENDA (Appointments)

### `patients`
Informações dos pacientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do paciente |
| email | TEXT | Email |
| phone | TEXT | Telefone |
| birthdate | DATE | Data de nascimento |
| document_id | TEXT | CPF/RG |
| gender | VARCHAR(10) | Gênero |
| address | TEXT | Endereço |
| city | TEXT | Cidade |
| state | TEXT | Estado |
| zip_code | TEXT | CEP |
| emergency_contact | TEXT | Contato de emergência |
| emergency_phone | TEXT | Telefone de emergência |
| allergies | TEXT | Alergias |
| medical_notes | TEXT | Notas médicas |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, name, email, document_id

---

### `patient_media`
Arquivos de mídia dos pacientes (imagens, documentos).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| patient_id | UUID | FK: patients (ON DELETE CASCADE) |
| clinic_id | UUID | FK: clinics |
| file_name | TEXT | Nome do arquivo |
| file_path | TEXT | Caminho no storage |
| file_type | VARCHAR(100) | Tipo MIME |
| file_size | BIGINT | Tamanho em bytes |
| created_at | TIMESTAMP | Data de criação |

**Índices:** patient_id, clinic_id

---

### `patients_files`
Tabela alternativa para arquivos de pacientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| patient_id | UUID | FK: patients (ON DELETE CASCADE) |
| clinic_id | UUID | FK: clinics |
| file_name | TEXT | Nome do arquivo |
| file_path | TEXT | Caminho no storage |
| file_type | VARCHAR(100) | Tipo MIME |
| file_size | BIGINT | Tamanho em bytes |
| created_at | TIMESTAMP | Data de criação |

**Índices:** patient_id, clinic_id

---

### `professionals`
Informações dos profissionais (médicos, enfermeiros, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do profissional |
| email | TEXT | Email |
| phone | TEXT | Telefone |
| specialization | TEXT | Especialização |
| license_number | TEXT | Número de licença |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, name, active

---

### `professional_schedules`
Horários de trabalho dos profissionais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| professional_id | UUID | FK: professionals (ON DELETE CASCADE) |
| clinic_id | UUID | FK: clinics |
| day_of_week | INT | Dia da semana (0=domingo, 6=sábado) |
| start_time | TIME | Hora de início |
| end_time | TIME | Hora de término |
| created_at | TIMESTAMP | Data de criação |

**Índices:** professional_id

---

### `services`
Serviços oferecidos pela clínica (consultas, procedimentos, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do serviço |
| description | TEXT | Descrição |
| duration_minutes | INT | Duração em minutos |
| price | DECIMAL(12, 2) | Preço padrão |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, name

---

### `service_groups`
Grupos de serviços para organização.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do grupo |
| description | TEXT | Descrição |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `appointments`
Agendamentos de consultas/procedimentos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| patient_id | UUID | FK: patients |
| professional_id | UUID | FK: professionals |
| service_id | UUID | FK: services |
| scheduled_date | DATE | Data do agendamento |
| scheduled_time | TIME | Hora do agendamento |
| end_time | TIME | Hora de término |
| status | VARCHAR(50) | Status (scheduled, confirmed, completed, cancelled, etc.) |
| notes | TEXT | Notas |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, patient_id, professional_id, scheduled_date, status

**Views relacionadas:**
- `view_agenda_completa_v6` - View completa com join de pacientes, profissionais, serviços
- `agenda_confirmacao_view` - View para confirmações

---

### `appointment_notification_logs`
Histórico de notificações de agendamentos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| appointment_id | UUID | FK: appointments (ON DELETE CASCADE) |
| clinic_id | UUID | FK: clinics |
| notification_type | VARCHAR(50) | Tipo (email, sms, whatsapp, etc.) |
| sent_at | TIMESTAMP | Hora de envio |
| created_at | TIMESTAMP | Data de criação |

**Índices:** appointment_id

---

## 3️⃣ MÓDULO PAYERS/PLANOS

### `payers`
Convênios/Seguradoras/Pagadores.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do pagador |
| cnpj | TEXT | CNPJ |
| contact_person | TEXT | Pessoa de contato |
| contact_email | TEXT | Email |
| contact_phone | TEXT | Telefone |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, name

---

### `plans`
Planos de convênios.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| payer_id | UUID | FK: payers |
| name | TEXT | Nome do plano |
| code | VARCHAR(50) | Código |
| description | TEXT | Descrição |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, payer_id

---

### `professional_payers`
Associação entre profissionais e convênios.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| professional_id | UUID | FK: professionals (ON DELETE CASCADE) |
| payer_id | UUID | FK: payers |
| clinic_id | UUID | FK: clinics |
| created_at | TIMESTAMP | Data de criação |

**Índices:** professional_id

---

### `service_prices`
Preços de serviços por convênio.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| service_id | UUID | FK: services (ON DELETE CASCADE) |
| payer_id | UUID | FK: payers |
| clinic_id | UUID | FK: clinics |
| price | DECIMAL(12, 2) | Preço |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** service_id, payer_id

---

### `professional_services`
Associação entre profissionais e serviços.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| professional_id | UUID | FK: professionals (ON DELETE CASCADE) |
| service_id | UUID | FK: services (ON DELETE CASCADE) |
| clinic_id | UUID | FK: clinics |
| created_at | TIMESTAMP | Data de criação |

**Índices:** professional_id

---

## 4️⃣ MÓDULO FINANCEIRO

### `chart_of_accounts`
Plano de contas (contabilidade).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| code | VARCHAR(50) | Código da conta |
| name | TEXT | Nome da conta |
| type | TEXT | Tipo (revenue, expense, asset, liability) |
| dre_group | TEXT | Agrupamento DRE |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, code, type

---

### `account_plans`
Planos de contas alternativos/seed.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| code | VARCHAR(50) | Código |
| name | TEXT | Nome |
| type | TEXT | Tipo |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `cost_centers`
Centros de custo.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do centro |
| description | TEXT | Descrição |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |

**Índices:** clinic_id

---

### `finance_accounts`
Contas financeiras (diferentes de chart_of_accounts).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome |
| description | TEXT | Descrição |
| account_type | VARCHAR(50) | Tipo de conta |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `bank_accounts`
Contas bancárias da clínica.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome da conta |
| bank_name | VARCHAR(100) | Nome do banco |
| account_number | VARCHAR(100) | Número da conta |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `ap_bills`
Contas a Pagar (Accounts Payable).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| supplier_id | UUID | ID do fornecedor (opcional) |
| supplier_name | TEXT | Nome do fornecedor |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor total |
| paid_value | DECIMAL(12, 2) | Valor pago |
| due_date | DATE | Data de vencimento |
| paid_at | TIMESTAMP | Data do pagamento |
| status | VARCHAR(50) | Status (open, paid, canceled, partial, scheduled) |
| payment_method | VARCHAR(100) | Método de pagamento |
| chart_account_id | UUID | FK: chart_of_accounts |
| cost_center_id | UUID | FK: cost_centers |
| category_id | UUID | FK: account_plans |
| recurring_config_id | UUID | FK: recurring_accounts_payable |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, status, due_date, paid_at

**Relações:**
- Muitos itens em `ap_items`
- View: `ap_bills_with_category`

---

### `ap_items`
Itens detalhados de contas a pagar.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| ap_bill_id | UUID | FK: ap_bills (ON DELETE CASCADE) |
| bill_id | UUID | FK: ap_bills (alternativo) |
| description | TEXT | Descrição do item |
| quantity | DECIMAL(10, 2) | Quantidade |
| unit_price | DECIMAL(12, 2) | Preço unitário |
| total_price | DECIMAL(12, 2) | Preço total |
| tax_type | VARCHAR(50) | Tipo de imposto |
| tax_rate | DECIMAL(5, 2) | Taxa de imposto |
| tax_amount | DECIMAL(12, 2) | Valor do imposto |
| created_at | TIMESTAMP | Data de criação |

**Índices:** ap_bill_id

---

### `ar_invoices`
Contas a Receber (Accounts Receivable) - Invoice version.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| patient_id | UUID | ID do paciente |
| patient_name | TEXT | Nome do paciente |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor |
| received_value | DECIMAL(12, 2) | Valor recebido |
| due_date | DATE | Data de vencimento |
| received_at | TIMESTAMP | Data de recebimento |
| status | VARCHAR(50) | Status (open, paid, canceled) |
| payment_method | VARCHAR(100) | Método de pagamento |
| chart_account_id | UUID | FK: chart_of_accounts |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, status, due_date

---

### `ar_receivables`
Contas a Receber (versão alternativa).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| patient_id | UUID | ID do paciente |
| patient_name | TEXT | Nome do paciente |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor |
| received_value | DECIMAL(12, 2) | Valor recebido |
| due_date | DATE | Data de vencimento |
| received_at | TIMESTAMP | Data de recebimento |
| status | VARCHAR(50) | Status |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

**Relações:**
- View: `view_ar_receivables_v1`

---

### `invoices`
Faturas gerais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| invoice_number | TEXT | Número da nota fiscal |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor |
| issued_date | DATE | Data de emissão |
| due_date | DATE | Data de vencimento |
| paid_date | DATE | Data do pagamento |
| status | VARCHAR(50) | Status (open, paid) |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, status

---

### `recurring_accounts_payable`
Contas a pagar recorrentes (mensais, semanais, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| supplier_id | UUID | ID do fornecedor |
| supplier_name | TEXT | Nome do fornecedor |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor |
| frequency | VARCHAR(50) | Frequência (monthly, weekly, quarterly, etc.) |
| day_of_month | INT | Dia do mês (para monthly) |
| chart_account_id | UUID | FK: chart_of_accounts |
| cost_center_id | UUID | FK: cost_centers |
| active | BOOLEAN | Ativa? |
| next_due_date | DATE | Próxima data de vencimento |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `cash_flow`
Fluxo de caixa (lançamentos de entradas e saídas).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| description | TEXT | Descrição |
| amount | DECIMAL(12, 2) | Valor |
| transaction_type | VARCHAR(20) | Tipo (credit ou debit) |
| transaction_date | DATE | Data da transação |
| chart_account_id | UUID | FK: chart_of_accounts |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, transaction_date

**RPCs relacionadas:**
- `cashflow_summary` - Resumo de fluxo de caixa
- `pay_accounts_payable_batch` - Pagamento em lote

---

## 5️⃣ MÓDULO REPASSE MÉDICO

### `repasse_medico`
Repassos para médicos/profissionais.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| professional_id | UUID | ID do profissional |
| professional_name | TEXT | Nome do profissional |
| period_start | DATE | Data de início do período |
| period_end | DATE | Data de término do período |
| total_appointments | INT | Total de consultas |
| total_revenue | DECIMAL(12, 2) | Receita total |
| amount_due | DECIMAL(12, 2) | Valor devido |
| amount_paid | DECIMAL(12, 2) | Valor pago |
| status | VARCHAR(50) | Status (pending, paid, partial) |
| payment_date | TIMESTAMP | Data do pagamento |
| notes | TEXT | Notas |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, professional_id, period_start, period_end

---

### `repasse_config`
Configurações de repasse médico.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| professional_id | UUID | ID do profissional |
| percentage | DECIMAL(5, 2) | Percentual (%) |
| fixed_amount | DECIMAL(12, 2) | Valor fixo |
| active | BOOLEAN | Ativa? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `repasse_ajuste`
Ajustes/correções em repassos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| repasse_id | UUID | FK: repasse_medico (ON DELETE CASCADE) |
| description | TEXT | Descrição do ajuste |
| adjustment_amount | DECIMAL(12, 2) | Valor do ajuste |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** repasse_id

**RPCs relacionadas:**
- `repasse_medico_dashboard` - Dashboard de repassos
- `repasse_medico_detalhe` - Detalhes do repasse

---

## 6️⃣ MÓDULO ESTOQUE (Stock)

### `stock_categories`
Categorias de itens de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome da categoria |
| description | TEXT | Descrição |
| active | BOOLEAN | Ativa? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

### `stock_items`
Itens de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| category_id | UUID | FK: stock_categories |
| name | TEXT | Nome do item |
| description | TEXT | Descrição |
| sku | VARCHAR(100) | SKU/Código |
| quantity_on_hand | DECIMAL(12, 2) | Quantidade disponível |
| minimum_quantity | DECIMAL(12, 2) | Quantidade mínima |
| unit_cost | DECIMAL(12, 2) | Custo unitário |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, category_id, sku

**Relações:**
- Muitos movimentos em `stock_movements`

---

### `stock_movements`
Histórico de movimentações de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| stock_item_id | UUID | FK: stock_items |
| movement_type | VARCHAR(50) | Tipo (entry, exit, adjustment) |
| quantity | DECIMAL(12, 2) | Quantidade |
| reference_type | VARCHAR(50) | Tipo de referência |
| reference_id | UUID | ID da referência |
| notes | TEXT | Notas |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, stock_item_id, created_at

---

### `stock_suppliers`
Fornecedores de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do fornecedor |
| cnpj | TEXT | CNPJ |
| contact_person | TEXT | Pessoa de contato |
| contact_email | TEXT | Email |
| contact_phone | TEXT | Telefone |
| address | TEXT | Endereço |
| city | TEXT | Cidade |
| state | TEXT | Estado |
| zip_code | TEXT | CEP |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, name

---

### `stock_units`
Unidades de medida de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | VARCHAR(20) | Nome (un, kg, l, etc.) |
| description | TEXT | Descrição |
| created_at | TIMESTAMP | Data de criação |

**Índices:** clinic_id

---

### `stock_locations`
Locais/Armazéns de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| name | TEXT | Nome do local |
| description | TEXT | Descrição |
| active | BOOLEAN | Ativo? |
| created_at | TIMESTAMP | Data de criação |

**Índices:** clinic_id

---

### `stock_requests`
Requisições de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| request_number | VARCHAR(50) | Número da requisição |
| requester_id | UUID | ID de quem solicitou |
| purpose | TEXT | Finalidade |
| status | VARCHAR(50) | Status (pending, approved, rejected) |
| approval_status | VARCHAR(50) | Status de aprovação |
| approved_by | UUID | ID de quem aprovou |
| approved_at | TIMESTAMP | Data de aprovação |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, status

---

### `stock_request_items`
Itens de requisição de estoque.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| stock_request_id | UUID | FK: stock_requests (ON DELETE CASCADE) |
| stock_item_id | UUID | FK: stock_items |
| quantity_requested | DECIMAL(12, 2) | Quantidade solicitada |
| quantity_approved | DECIMAL(12, 2) | Quantidade aprovada |
| created_at | TIMESTAMP | Data de criação |

**Índices:** stock_request_id

**Função relacionada:**
- `get_stock_balance` - Saldo de estoque

---

## 7️⃣ MÓDULO ORÇAMENTOS

### `orcamentos`
Orçamentos para pacientes.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| patient_id | UUID | FK: patients |
| number | TEXT | Número do orçamento |
| status | VARCHAR(50) | Status (draft, sent, accepted, rejected) |
| total_amount | DECIMAL(12, 2) | Valor total |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, patient_id

---

### `orcamento_itens`
Itens de orçamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| orcamento_id | UUID | FK: orcamentos (ON DELETE CASCADE) |
| description | TEXT | Descrição |
| quantity | DECIMAL(10, 2) | Quantidade |
| unit_price | DECIMAL(12, 2) | Preço unitário |
| total_price | DECIMAL(12, 2) | Preço total |
| created_at | TIMESTAMP | Data de criação |

**Índices:** orcamento_id

---

### `orcamento_profissionais`
Profissionais alocados ao orçamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| orcamento_id | UUID | FK: orcamentos (ON DELETE CASCADE) |
| professional_id | UUID | FK: professionals |
| created_at | TIMESTAMP | Data de criação |

**Índices:** orcamento_id

---

### `orcamento_materiais`
Materiais usados no orçamento.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| orcamento_id | UUID | FK: orcamentos (ON DELETE CASCADE) |
| description | TEXT | Descrição do material |
| quantity | DECIMAL(10, 2) | Quantidade |
| unit_price | DECIMAL(12, 2) | Preço unitário |
| created_at | TIMESTAMP | Data de criação |

**Índices:** orcamento_id

---

## 8️⃣ MÓDULO LAUDOS

### `laudos`
Laudos/Relatórios médicos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| title | TEXT | Título do laudo |
| content | TEXT | Conteúdo |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id

---

## 9️⃣ MÓDULO CONCILIAÇÃO BANCÁRIA

### `clinic_bank_accounts`
Contas bancárias da clínica (para conciliação).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| account_name | VARCHAR(255) | Nome da conta |
| bank_name | VARCHAR(100) | Nome do banco |
| account_number | VARCHAR(100) | Número da conta |
| account_holder | VARCHAR(255) | Titular da conta |
| bank_balance | DECIMAL(12, 2) | Saldo do banco |
| system_balance | DECIMAL(12, 2) | Saldo no sistema |
| last_reconciliation_date | DATE | Data da última conciliação |
| active | BOOLEAN | Ativa? |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, active

---

### `conciliation_bank_statements`
Extratos bancários importados.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| bank_account_id | UUID | FK: clinic_bank_accounts |
| statement_date | DATE | Data do extrato |
| description | TEXT | Descrição da transação |
| amount | DECIMAL(12, 2) | Valor |
| transaction_type | VARCHAR(20) | Tipo (credit ou debit) |
| bank_id | VARCHAR(255) | ID no banco |
| status | VARCHAR(50) | Status (pending, conciliated, adjusted, divergent, ignored) |
| linked_financial_id | UUID | ID do lançamento financeiro (AP/AR) |
| linked_type | VARCHAR(20) | Tipo (payable ou receivable) |
| divergence_reason | TEXT | Motivo de divergência |
| import_batch_id | UUID | FK: conciliation_import_batches |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |
| created_by | UUID | ID de quem criou |
| updated_by | UUID | ID de quem atualizou |

**Índices:** clinic_id, status, statement_date, bank_account_id

---

### `conciliation_link_history`
Histórico de ligações entre extratos e lançamentos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| bank_statement_id | UUID | FK: conciliation_bank_statements (ON DELETE CASCADE) |
| financial_id | UUID | ID do lançamento (AP/AR) |
| financial_type | VARCHAR(20) | Tipo (payable ou receivable) |
| action | VARCHAR(50) | Ação (conciliate, adjust, divergent, ignore, unlink) |
| action_notes | TEXT | Notas da ação |
| user_id | UUID | ID do usuário |
| created_at | TIMESTAMP | Data de criação |

**Índices:** bank_statement_id, financial_id, created_at

---

### `conciliation_auto_rules`
Regras automáticas de conciliação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| rule_name | VARCHAR(255) | Nome da regra |
| description | TEXT | Descrição |
| pattern_keywords | TEXT[] | Palavras-chave para match |
| min_amount | DECIMAL(12, 2) | Valor mínimo |
| max_amount | DECIMAL(12, 2) | Valor máximo |
| transaction_type | VARCHAR(20) | Tipo de transação |
| default_category_id | UUID | FK: chart_of_accounts |
| default_cost_center_id | UUID | FK: cost_centers |
| default_payment_method | VARCHAR(100) | Método de pagamento |
| auto_create_if_no_match | BOOLEAN | Criar automaticamente se sem match? |
| active | BOOLEAN | Ativa? |
| priority | INT | Prioridade |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

**Índices:** clinic_id, active

---

### `conciliation_suggestions`
Sugestões de conciliação (cache).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| bank_statement_id | UUID | FK: conciliation_bank_statements (ON DELETE CASCADE) |
| suggested_financial_id | UUID | ID sugerido (AP/AR) |
| suggested_type | VARCHAR(20) | Tipo (payable ou receivable) |
| match_score | DECIMAL(3, 2) | Score de confiança (0.0-1.0) |
| match_reason | VARCHAR(255) | Motivo do match |
| created_at | TIMESTAMP | Data de criação |

**Índices:** bank_statement_id, suggested_financial_id

---

### `conciliation_import_batches`
Lotes de importação de extratos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | Chave primária |
| clinic_id | UUID | FK: clinics |
| bank_name | VARCHAR(255) | Nome do banco |
| account_number | VARCHAR(100) | Número da conta |
| import_date | DATE | Data de importação |
| total_records | INT | Total de registros |
| total_amount_credit | DECIMAL(12, 2) | Total de créditos |
| total_amount_debit | DECIMAL(12, 2) | Total de débitos |
| import_status | VARCHAR(50) | Status (processing, completed, error) |
| import_error_message | TEXT | Mensagem de erro |
| imported_by | UUID | ID de quem importou |
| created_at | TIMESTAMP | Data de criação |

**Índices:** clinic_id, import_date

---

## 📊 RESUMO DE TABELAS POR CATEGORIA

| Categoria | Quantidade | Tabelas |
|-----------|-----------|---------|
| Base | 2 | clinics, users |
| Agenda | 10 | patients, patient_media, patients_files, professionals, professional_schedules, services, service_groups, appointments, appointment_notification_logs, ... |
| Payers | 5 | payers, plans, professional_payers, service_prices, professional_services |
| Financeiro | 8 | chart_of_accounts, account_plans, cost_centers, finance_accounts, bank_accounts, ap_bills, ap_items, ar_invoices, ar_receivables, invoices, recurring_accounts_payable, cash_flow |
| Repasse Médico | 3 | repasse_medico, repasse_config, repasse_ajuste |
| Estoque | 7 | stock_categories, stock_items, stock_movements, stock_suppliers, stock_units, stock_locations, stock_requests, stock_request_items |
| Orçamentos | 4 | orcamentos, orcamento_itens, orcamento_profissionais, orcamento_materiais |
| Laudos | 1 | laudos |
| Conciliação | 6 | clinic_bank_accounts, conciliation_bank_statements, conciliation_link_history, conciliation_auto_rules, conciliation_suggestions, conciliation_import_batches |

---

## 🔗 RELACIONAMENTOS PRINCIPAIS

```
clinics (1) ──┬─→ (N) users
              ├─→ (N) patients
              ├─→ (N) professionals
              ├─→ (N) services
              ├─→ (N) appointments
              ├─→ (N) ap_bills ──→ ap_items
              ├─→ (N) ar_invoices
              ├─→ (N) stock_items ──→ stock_movements
              ├─→ (N) orcamentos ──→ orcamento_itens
              ├─→ (N) repasse_medico
              └─→ (N) conciliation_bank_statements

appointments (1) ──→ (1) patient
appointments (1) ──→ (1) professional
appointments (1) ──→ (1) service

ap_bills (1) ──→ (N) ap_items
ap_bills (1) ──→ (1) chart_of_accounts
ap_bills (1) ──→ (1) cost_centers

stock_items (1) ──→ (N) stock_movements
stock_items (1) ──→ (1) stock_categories

orcamentos (1) ──→ (N) orcamento_itens
orcamentos (1) ──→ (1) patient
```

---

## 🔌 VIEWS DO BANCO

| View | Descrição | Tabela Base |
|------|-----------|------------|
| `view_agenda_completa_v6` | Agenda completa com patients, professionals, services | appointments |
| `agenda_confirmacao_view` | Visualização para confirmação de agendamentos | appointments |
| `ap_bills_with_category` | Contas a pagar com categoria | ap_bills |
| `view_ar_receivables_v1` | Contas a receber | ar_receivables |
| `view_doctor_commissions_summary` | Resumo de comissões médicas | repasse_medico |
| `repasse_dashboard` | Dashboard de repassos | repasse_medico |

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Execute o SQL:** Abra o Supabase SQL Editor e copie o conteúdo de `20260113_COMPREHENSIVE_INIT.sql`
2. ✅ **Aplique as migrações existentes:** As migrações específicas já criadas serão aplicadas automaticamente
3. ✅ **Configure RLS (Row Level Security):** Adicione políticas de segurança conforme necessário
4. ✅ **Crie índices adicionais:** Se necessário, para melhorar performance

---

**Última atualização:** 12 de Janeiro de 2026
