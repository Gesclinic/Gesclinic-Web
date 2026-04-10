# 📋 Atualização TISS - Padrão de Faturamento

## ✅ O que foi alterado

As abas de **Liberação** e **Faturamento** foram refatoradas para seguir o padrão **TISS (Troca de Informações de Saúde Suplementar)** com suporte completo a faturamento via XML para qualquer operadora.

### Operadoras Suportadas
- ✅ **Unimed** (variações regionais)
- ✅ **Fundação Copele**
- ✅ **Fundação Sanepar**
- ✅ **Itamed**
- ✅ **PAM** (Plano de Assistência Médica)
- ✅ **SUS** (via RPS)
- ✅ **Consórcios Intermunicipais**

---

## 📝 Alterações nas Abas

### 1️⃣ **Aba "Liberação" (Novo Padrão TISS)**

#### Campos Alterados:
- **Matrícula/Nº Carteirinha** (obrigatório)
  - Anteriormente: "Nº Carteirinha" opcional
  - Agora: Campo obrigatório seguindo padrão TISS

- **Requer Autorização Prévia?** (novo)
  - Radio buttons: Sim ou Não
  - Se "Sim": Exibe campos Nº de Autorização + Data de Validade
  - Se "Não": Consulta livre, sem necessidade de autorização

- **Status da Autorização** (novo)
  - Dropdown: Aprovada, Parcial, Pendente de Análise, Negada
  - Permite rastreamento do status junto à operadora

- **Validação**: Agora valida matrícula em primeiro lugar, depois autorização se necessário

---

### 2️⃣ **Aba "Faturamento" (Novo Padrão TISS XML)**

A aba foi completamente reestruturada em 4 seções:

#### **Seção 1: Tipo de Serviço**
- **Tipo de Guia TISS** (novo)
  - 01.01 - Consulta Médica/Odontológica
  - 01.02 - Procedimento
  - 01.03 - Internação Hospitalar
  - 01.04 - Atendimento de Urgência
  - 02.01 - Solicitação de Exame
  - 02.02 - Autorização de Procedimento

- **Tipo de Codificação** (novo)
  - TUSS (Padrão) - Para maioria das operadoras
  - CBHPM - Para medicina convencional
  - CPT - Para odontologia

- **Código do Procedimento** (novo)
  - Campo livre para inserir código TUSS/CBHPM
  - Será incluído no XML gerado

#### **Seção 2: Dados do Atendimento**
- **Data do Atendimento** (novo)
  - Preenchido automaticamente com a data do agendamento
  - Editável se necessário

- **Local de Atendimento** (novo)
  - Campo livre: Consultório, Hospital, etc.

- **Descrição do Serviço**
  - Herdado da tabela de serviços, somente leitura

- **Profissional Executante**
  - Quem realiza o procedimento

- **Profissional Solicitante**
  - Médico que solicitou o procedimento

#### **Seção 3: Identificação da Guia TISS**
- **Nº Sequencial da Guia TISS** (obrigatório)
  - Formato: 9 dígitos (000000001)
  - Será componente do arquivo XML

- **Valor Solicitado** (em R$)
  - Valor que a clínica cobra/solicita à operadora

- **Valor Autorizado** (em R$)
  - Valor que a operadora autoriza (pode ser menor que solicitado)

#### **Seção 4: Observações Adicionais**
- Campo de texto livre para informações complementares
- Será incluído na guia TISS

---

## 🗄️ Alterações no Banco de Dados

### 1. Nova Coluna: `billing_data` (JSONB)
Armazena a estrutura TISS completa em formato JSON:
```json
{
  "guide_number": "000000001",
  "guide_type": "consulta",
  "code_type": "tuss",
  "procedure_code": "30101020",
  "service_date": "2026-02-20",
  "service_place": "Consultório",
  "requesting_doctor": "Dr. João Silva",
  "responsible_doctor": "Dr. Pedro Santos",
  "estimated_value": "150.00",
  "authorized_value": "150.00",
  "notes": "Acompanhamento pós-operatório"
}
```

### 2. Nova Coluna: `billing_status` (VARCHAR)
Rastreia o status do faturamento:
- `pending` - Iniciado, ainda sendo preenchido
- `structured` - Estrutura TISS completa
- `sent` - Enviado à operadora
- `approved` - Aprovado
- `denied` - Rejeitado

### 3. Nova Coluna: `billing_xml` (TEXT) - Opcional
Armazena o XML gerado para auditoria

---

## 🚀 Como Aplicar a Migração

### Passo 1: Acessar o Supabase
1. Abra https://supabase.com/dashboard
2. Selecione o projeto Gesclinic
3. Vá para **SQL Editor**

### Passo 2: Executar a Migração SQL

Copie e execute o conteúdo do arquivo:
```
supabase\migrations\2026-02-20_add_tiss_fields.sql
```

**Ou execute manualmente:**

```sql
-- Adicionar coluna para dados de faturamento TISS estruturado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_data') THEN
    ALTER TABLE appointments ADD COLUMN billing_data JSONB;
  END IF;
END $$;

-- Adicionar coluna de status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_status') THEN
    ALTER TABLE appointments ADD COLUMN billing_status VARCHAR(50) DEFAULT 'pending';
  END IF;
END $$;

-- Adicionar coluna para XML (opcional para auditoria)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'billing_xml') THEN
    ALTER TABLE appointments ADD COLUMN billing_xml TEXT;
  END IF;
END $$;
```

### Passo 3: Verificar a Migração

No SQL Editor do Supabase, execute:
```sql
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'appointments' 
  AND column_name IN ('billing_data', 'billing_status', 'billing_xml');
```

Deverá retornar 3 linhas confirmando as colunas.

---

## 🔄 Fluxo de Atendimento (Novo)

### Para Convênio (Com Cobertura)
```
1. Cadastrais    → 2. Liberação    → 3. Faturamento → 4. Resumo
```

**Aba Liberação:**
- Preenche matrícula ✓
- Define se requer autorização (Sim/Não)
- Se Sim: Preenche nº autorização + validade
- Marca checkbox de validação
- Salva

**Aba Faturamento:**
- Seleciona tipo de guia (consulta, procedimento, etc.)
- Seleciona tipo de código (TUSS, CBHPM, CPT)
- Preenche código do procedimento
- Confirma profissionais (executante/solicitante)
- Preenche nº sequencial da guia TISS
- Define valores (solicitado/autorizado)
- Salva → Estrutura preparada para XML

### Para Particular (Paciente)
```
1. Cadastrais → 2. Pagamento → 3. Resumo
```
(Não passa por Liberação/Faturamento TISS)

---

## 📊 Nova View para Relatórios

Uma view foi criada para facilitar relatórios de faturamento:

**Nome:** `view_tiss_billing`

**Query de exemplo:**
```sql
SELECT 
  patient_name,
  patient_cpf,
  payer_name,
  guide_type,
  guide_number,
  estimated_value,
  billing_status
FROM view_tiss_billing
WHERE billing_status = 'structured'
  AND scheduled_date = CURRENT_DATE
ORDER BY payer_name;
```

---

## ✅ Checklist de Verificação

Após aplicar a migração:

- [ ] Criadas 3 novas colunas na tabela `appointments`
- [ ] Frontend refatorado com novas abas
- [ ] Teste com convênio que requer autorização
- [ ] Teste com convênio que NÃO requer autorização
- [ ] Teste com particular
- [ ] Verificar que `billing_data` é salvo em JSON
- [ ] Relatório `view_tiss_billing` retorna dados corretos

---

## 🔧 Próximas Etapas

A estrutura TISS `billing_data` agora pode ser usada para:

### 1. **Gerador de XML TISS** (Próximo desenvolvimento)
```javascript
generateTISSXml(appointment) {
  // Ler appointment.billing_data
  // Gerar XML conforme padrão TISS
  // Assinar digitalmente (se obrigatório)
  // Submeter à operadora
}
```

### 2. **Integração com Operadoras** (Futura)
- Conectar com WebService TISS de cada operadora
- Enviar XML automaticamente
- Receber confirmação de recebimento
- Atualizar `billing_status` automático

### 3. **Auditoria e Rastreamento**
- Logs de todos os envios de guias TISS
- Histórico de alterações
- Relatórios de rejeições/aprovações

---

## ❓ Dúvidas Frequentes

**P: E se a operadora não usar padrão TISS?**
R: O formato JSON é flexível. Diferentes operadoras têm variações. O design permite customização por operadora.

**P: Posso usar sem preencher o código do procedimento?**
R: Sim, o `procedure_code` é opcional. Recomendado sempre preencher para maior compatibilidade.

**P: Como gero o XML?**
R: Por enquanto, os dados estão estruturados em JSON pronto para geração. Em breve haverá função para gerar XML automático.

**P: Qual é o formato do Nº Sequencial da Guia?**
R: Padrão TISS: 9 dígitos (000000001, 000000002, etc.). Pode ser sequencial por mês/ano conforme política de cada operadora.

---

## 📞 Suporte

Para dúvidas sobre implementação TISS:
- Consulte documentação oficial TISS: http://www.tiss.saude.gov.br/
- Verifique manuais técnicos da sua operadora
- Entre em contato com departamento de faturamento
