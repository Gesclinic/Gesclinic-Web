# 📱 Sistema de Confirmação de Agendamentos via WhatsApp

## 🎯 O que foi implementado

Um sistema automático que envia mensagens via WhatsApp para pacientes 1 dia antes da consulta, permitindo que confirmem ou cancelem a consulta.

### Fluxo completo:
1. **Disparo automático**: Todos os dias à noite (19:00), sistema busca agendamentos de amanhã
2. **Mensagem WhatsApp**: Paciente recebe mensagem com botões de confirmação
3. **Confirmação**: Paciente clica em "Confirmar" ou "Cancelar"
4. **Atualização automática**: Status do agendamento é atualizado no sistema

---

## 🔧 Instalação e Configuração

### 1. **Criar tabela no Supabase**

Execute a migração SQL em `supabase/migrations/20260212_create_appointment_confirmations.sql`:

```sql
-- Abrir em Supabase > SQL Editor > colar conteúdo > Run
```

Ou via terminal:
```bash
npx supabase db push
```

### 2. **Configurar Evolution API (para testes com WhatsApp pessoal)**

A Evolution API permite usar WhatsApp pessoal (sem precisar da API oficial do WhatsApp).

#### Opção A: Usar Docker (mais simples)
```bash
docker run -d \
  -p 8080:8080 \
  -e DATABASE_URL=postgres://user:pass@localhost:5432/evolution \
  evolutionapi/evolution:latest
```

#### Opção B: Instalar servidor localmente
- Clone: https://github.com/EvolutionAPI/evolution-api
- Siga o README do projeto

#### Opção C: Usar serviço na nuvem
- Vá em https://evolution-api.com e contrate um serviço

### 3. **Configurar variáveis de ambiente**

Crie `.env.local` na raiz do projeto:

```env
# Evolution API - WhatsApp
VITE_EVOLUTION_API_URL=http://localhost:8080/message/sendText
VITE_EVOLUTION_API_KEY=sua_api_key
VITE_EVOLUTION_INSTANCE=gesclinic
VITE_APP_URL=http://localhost:3000
```

### 4. **Conectar seu WhatsApp na Evolution API**

1. Acesse http://localhost:8080
2. Scanear QR Code com seu WhatsApp (mesmo telefone que receberá as mensagens)
3. Pronto! Agora a Evolution API pode enviar mensagens usando sua conta

---

## 📲 Como usar

### Envio Manual (para testar agora)

1. Vá para **Agenda** no sistema
2. Procure por um button "Enviar Confirmações WhatsApp" (será adicionado)
3. Clique para enviar para todos os pacientes com agendamentos de amanhã

### (Futuro) Envio Automático

Um cron job rodará diariamente às 19:00 executando:

```javascript
// Supabase Edge Function ou backend próprio
const result = await sendBatchConfirmations(clinicId);
```

---

## 📋 Estrutura de Dados

### Tabela `appointment_confirmations`
```
id (UUID)                 - Chave primária
appointment_id (UUID)     - Referência ao agendamento
clinic_id (UUID)          - Referência à clínica
confirmation_token (str)  - Token único para link
message_sent_at (ts)      - Quando a mensagem foi enviada
confirmed (bool)          - null=não respondeu, true=confirmou, false=cancelou
confirmed_at (ts)         - Quando paciente respondeu
created_at (ts)           - Quando o registro foi criado
```

---

## 🔗 URLs de Confirmação

Quando paciente clica, vai para:

```
http://localhost:3000/clinica/agendamento/confirmar/{token}?status=confirmed
http://localhost:3000/clinica/agendamento/confirmar/{token}?status=rejected
```

Isso chama a rota no `AppRoutes.jsx`:
```jsx
<Route path="agendamento/confirmar/:token" element={<AppointmentConfirmationPage />} />
```

---

## 📝 Exemplo de Mensagem Enviada

```
Olá Bruno! 👋

Para confirmar sua consulta *amanhã (quinta-feira, 13 de fevereiro) às 10:00* com Talvany Donizete:

✅ *Confirmar:* http://localhost:3000/clinica/agendamento/confirmar/abc123def456?status=confirmed
❌ *Cancelar:* http://localhost:3000/clinica/agendamento/confirmar/abc123def456?status=rejected

Qualquer dúvida, me chama! 😊
```

---

## 🛠️ Funções disponíveis

### `whatsappConfirmationApi.js`

```javascript
// Enviar confirmação para um paciente
sendAppointmentConfirmation(
  clinicId, 
  appointmentId, 
  patientPhone, 
  patientName, 
  appointmentDate, 
  appointmentTime, 
  professionalName
)

// Confirmar/rejeitar quando paciente clica
confirmAppointmentByToken(token, status)

// Buscar agendamentos que precisam confirmação
getAppointmentsNeedingConfirmation(clinicId)

// Enviar para todos os agendamentos de amanhã
sendBatchConfirmations(clinicId)
```

---

## ⚠️ Troubleshooting

### "ECONNREFUSED - conexão recusada"
- Evolution API não está rodando
- Verifique se está em `http://localhost:8080`
- Inicie com Docker ou localmente

### "API Key inválida"
- Verifique `.env.local` tem a chave correta
- Verifique permissões na Evolution API

### "Mensagem não enviada"
- WhatsApp não está conectado na Evolution API
- Faça scan do QR Code novamente

### "Erro ao buscar agendamentos"
- Tabela `appointment_confirmations` não foi criada
- Execute a migração SQL novamente

---

## 🔐 Segurança

- Tokens são UUID únicos e não reutilizáveis
- URLs contêm token - não vazar em logs públicos
- RLS (Row Level Security) garante que clínica só vê seus agendamentos
- Tokens não expiram (considerar adicionar expiração no futuro)

---

## 📈 Próximas ações

1. ✅ Tabela criada
2. ✅ API funcional
3. ✅ Rota de confirmação pronta
4. ⏳ Botão na agenda para testar
5. ⏳ Cron job automático (diário)
6. ⏳ Dashboard com estatísticas de confirmação

---

## 💬 Suporte

Qualquer dúvida sobre integração WhatsApp, consultar:
- Evolution API docs: https://github.com/EvolutionAPI/evolution-api
- WhatsApp Business API: https://developers.facebook.com/docs/whatsapp/cloud-api/
