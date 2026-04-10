# 📋 Módulo Completo de Repasse Automático - Documentação Técnica

## 📑 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Setupágina Inicial](#setup-inicial)
4. [Guia de Uso](#guia-de-uso)
5. [Referência de API](#referência-de-api)
6. [Exemplos de Código](#exemplos-de-código)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

O **Módulo de Repasse Automático** calcula automaticamente comissões de profissionais de saúde (70/30, ou percentuais customizados) baseado em:
- Atendimentos realizados
- Valor do faturamento
- Configuração por profissional

**Fluxo Automático:**
```
Atendimento Marcado → Production Registrada → Repasse Calculado → 
Transferência Bancária → Email Enviado → Auditoria Completa
```

---

## 🏗️ Arquitetura

### 📂 Estrutura de Arquivos

```
src/
├── lib/
│   ├── medicalRepasseApi.js              # Core API - Main functions
│   ├── agendaIntegrationRepasseApi.js    # Agenda ↔ Repasse integration
│   ├── repasseSchedulerApi.js            # Monthly automation scheduler
│   ├── repasseBancariaApi.js             # Bank transfer automation
│   ├── repasseEmailApi.js                # Email notifications
│   └── repasseAutomatizacaoCompleta.js   # Complete automation pipeline
│
├── pages/financeiro/
│   ├── RepasseMedicoPage.jsx             # Main dashboard (3 tabs)
│   ├── RepasseConfigPage.jsx             # Professional configs
│   ├── RepasseAjustePage.jsx             # Manual adjustments
│   ├── RepasseDashboardPage.jsx          # Executive analytics
│   └── RepasseTransferenciaPage.jsx      # Bank & email settings
│
supabase/migrations/
├── 20260318_create_medical_repasse_module.sql
└── 20260319_create_bancaria_email_tables.sql
```

### 🗄️ Schema de Banco de Dados

#### Tabelas Principais
- `medical_repasse_config` - Configuração de percentuais por profissional
- `medical_production` - Registro de cada atendimento/produção
- `medical_repasse` - Cálculo final de repasse para cada período
- `professional_bank_accounts` - Dados bancários para transferências
- `repasse_transferencias` - Log de transferências realizadas
- `clinic_email_settings` - Configuração de provedores de email
- `repasse_emails_enviados` - Histórico de emails

---

## ⚙️ Setup Inicial

### Passo 1: Aplicar Migrações SQL

```powershell
# Execute no Supabase console ou use o helper script
# File: supabase/migrations/20260318_create_medical_repasse_module.sql
# File: supabase/migrations/20260319_create_bancaria_email_tables.sql
```

### Passo 2: Configurar Variáveis de Ambiente

```env
# .env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
```

### Passo 3: Instalar Dependências Necessárias

```bash
npm install html2pdf jspdf nodemailer
```

### Passo 4: Integrar Routes

Adicionar em `src/AppRoutes.jsx`:

```jsx
import RepasseMedicoPage from './pages/financeiro/RepasseMedicoPage';
import RepasseConfigPage from './pages/financeiro/RepasseConfigPage';
import RepasseAjustePage from './pages/financeiro/RepasseAjustePage';
import RepasseDashboardPage from './pages/financeiro/RepasseDashboardPage';
import RepasseTransferenciaPage from './pages/financeiro/RepasseTransferenciaPage';

// Dentro da rota /clinica/financeiro/*
<Route path="repasse-medico" element={<RepasseMedicoPage />} />
<Route path="repasse-config" element={<RepasseConfigPage />} />
<Route path="repasse-ajuste" element={<RepasseAjustePage />} />
<Route path="repasse-dashboard" element={<RepasseDashboardPage />} />
<Route path="repasse-transferencia" element={<RepasseTransferenciaPage />} />
```

### Passo 5: Ativar Automatização em Tempo Real

Em `src/main.jsx` ou contexto de app:

```jsx
import { setupAutomatizacaoEmTempoReal } from './lib/repasseAutomatizacaoCompleta';

// Component App
useEffect(() => {
  const { subscricaoAtendimentos, intervaloDiario } = 
    setupAutomatizacaoEmTempoReal(clinicId);
  
  return () => {
    // Cleanup
    limpezaAutomatizacao(subscricaoAtendimentos, intervaloDiario);
  };
}, [clinicId]);
```

---

## 📺 Guia de Uso

### 👑 Fluxo Administrativo

#### 1. **Configurar Dados Bancários** (RepasseTransferenciaPage)
- Acesse: `/clinica/financeiro/repasse-transferencia`
- Selecione profissional
- Preencha dados bancários (agência, conta, etc)
- Configure PIX (chave CPF, email, telefone)
- Salve

#### 2. **Configurar Email** (RepasseTransferenciaPage - Aba 2)
- Escolha provedor: SendGrid, AWS SES, Mailgun
- Insira chave de API
- Configure email remetente
- Salve

#### 3. **Configurar Percentuais** (RepasseConfigPage)
- Acesse: `/clinica/financeiro/repasse-config`
- Para cada profissional, defina percentual (ex: 70%)
- Salve

#### 4. **Monitorar Dashboard** (RepasseMedicoPage)
- Acesse: `/clinica/financeiro/repasse-medico`
- **Aba 1: Dashboard**
  - Veja resumo do mês atual
  - Valor bruto, descontos, repasse profissional
  - Botão "Recalcular" para atualizar dados

- **Aba 2: Configuração**
  - Gerencia percentuais por profissional
  
- **Aba 3: Histórico**
  - Lista todos os repassos já processados

#### 5. **Fazer Ajustes Manuais** (RepasseAjustePage)
- Acesse: `/clinica/financeiro/repasse-ajuste`
- Registre correções ou ajustes
- Todo ajuste é auditado e registrado

#### 6. **Ver Análise Executiva** (RepasseDashboardPage)
- Acesse: `/clinica/financeiro/repasse-dashboard`
- Selecione período (data início/fim)
- Analise:
  - Margem de lucro por profissional
  - Produção vs Repasse
  - Evolução mensal

### 🤖 Automatização

#### Automática (dia 1º do mês - 01:00 AM)
```javascript
// Executa automaticamente
pipelineFinDeMes(clinicId)
  ↓
// 1. Calcula repassos do mês anterior
// 2. Processa transferências PIX
// 3. Envia emails notificando profissionais
// 4. Registra auditoria
```

#### Manual pela UI
```javascript
// En qualquer página, disparar:
import { pipelineProcessamentoManual } from '@/lib/repasseAutomatizacaoCompleta';

await pipelineProcessamentoManual(
  clinicId,
  '2025-01-01',
  '2025-01-31'
);
```

---

## 📚 Referência de API

### Core API (`medicalRepasseApi.js`)

```javascript
// Configuração
salvarConfigRepasse(clinicId, professionalId, porcentagem)
obterConfigRepasse(clinicId, professionalId)
listarConfigRepasse(clinicId)

// Production
registrarProducao(clinicId, professionalId, dados)
listarProducaoPeriodo(clinicId, dataInicio, dataFim)

// Cálculo
calcularRepasse(clinicId, professionalId, dataInicio, dataFim)
calcularRepasseEmLote(clinicId, dataInicio, dataFim)
obterRepassePeriodo(clinicId, dataInicio, dataFim)

// Dashboard
dashboardRepasseMedico(clinicId)
relatorioDetalhoProfissional(clinicId, professionalId)
margensLucro(clinicId, dataInicio, dataFim)
```

---

### Banco (`repasseBancariaApi.js`)

```javascript
// Configuração
salvarDadosBancarios(professionalId, clinicId, dados)
obterDadosBancarios(professionalId, clinicId)

// Transferências
criarRequisicaoTransferencia(repasse, metodo='pix')
transferirPIX(transferencia)
transferirIntegracaoAPI(transferencia, provedor)
processarTransferenciasLote(repassos, metodo)

// Histórico
obterHistoricoTransferencias(clinicId, professionalId)
gerarRelatorioBancario(clinicId, dataInicio, dataFim)
```

---

### Email (`repasseEmailApi.js`)

```javascript
// Configuração
salvarConfiguracaoEmail(clinicId, config)
obterConfiguracaoEmail(clinicId)

// Envio
enviarNotificacaoRepasse(repasse, profissional, clinic)
enviarNotificacoesEmLote(repassos, clinic)
reenviaremail(repasseId)

// Histórico
obterHistoricoEmails(clinicId, professionalId, dias=30)
```

---

### Scheduler (`repasseSchedulerApi.js`)

```javascript
// Agendamento
agendarCalculoMensal()                    // Verifica se é 1º dia do mês
agendarCalculoManual(dataInicio, dataFim) // Dispara cálculo on-demand
executarCalculoAutomatico()               // Loop todas as clínicas

// Auditoria
obterHistoricoScheduler(clinicId)
```

---

### Agenda Integration (`agendaIntegrationRepasseApi.js`)

```javascript
// Integration
aoMarcarAtendimento(appointmentData)           // Auto-registra production
sincronizarProducaoHistorica(clinicId)         // Migra dados históricos
setupAgendaListener()                           // Real-time listener
```

---

### Automatização Completa (`repasseAutomatizacaoCompleta.js`)

```javascript
// Pipelines
pipelineAtendimentoConcluido(appointmentData)        // Atendimento → Production
pipelineFinDeMes(clinicId)                           // Mês → Transferência + Email
pipelineProcessamentoManual(clinicId, inicio, fim)   // Manual on-demand

// Setup
setupAutomatizacaoEmTempoReal(clinicId)    // Ativa listeners
limpezaAutomatizacao(subscricao, intervalo) // Desativa

// Teste
testePipelineCompleto(clinicId)             // Debug
```

---

## 💻 Exemplos de Código

### Exemplo 1: Registrar Production e Calcular Repasse

```javascript
import { registrarProducao, calcularRepasse } from '@/lib/medicalRepasseApi';

async function registrarAtendimento(clinicId, professionalId, atendimento) {
  // 1. Registrar production
  const production = await registrarProducao(clinicId, professionalId, {
    atendimento_id: atendimento.id,
    tipo: 'consulta',
    valor_bruto: 150.00,
    valor_liquido: 120.00, // Após abatimentos
    descricao: 'Consulta Clínica Geral'
  });
  
  // 2. Calcular repasse do mês
  const repasse = await calcularRepasse(
    clinicId,
    professionalId,
    '2025-01-01',
    '2025-01-31'
  );
  
  return repasse;
}
```

### Exemplo 2: Processar Transferência e Enviar Email

```javascript
import { 
  criarRequisicaoTransferencia, 
  transferirPIX 
} from '@/lib/repasseBancariaApi';
import { enviarNotificacaoRepasse } from '@/lib/repasseEmailApi';

async function procesarRepasseFinal(repasse, profissional, clinic) {
  try {
    // 1. Criar requisição de transferência
    const transfer = await criarRequisicaoTransferencia(repasse, 'pix');
    
    // 2. Executar transferência
    const resultado = await transferirPIX(transfer);
    
    // 3. Notificar profissional
    await enviarNotificacaoRepasse(repasse, profissional, clinic);
    
    return { 
      sucesso: true, 
      transferencia: resultado,
      notificacao: 'Email enviado'
    };
  } catch (err) {
    console.error('Erro ao processar repasse:', err);
    throw err;
  }
}
```

### Exemplo 3: Integrar com Componente React

```jsx
import { useState } from 'react';
import { 
  enviarNotificacoesEmLote 
} from '@/lib/repasseEmailApi';

export function NotificarProfissionais() {
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  
  const handleEnviar = async (repassos) => {
    setEnviando(true);
    try {
      const result = await enviarNotificacoesEmLote(
        repassos,
        { id: clinicId }
      );
      setResultado(result);
    } catch (err) {
      setResultado({ erro: err.message });
    } finally {
      setEnviando(false);
    }
  };
  
  return (
    <div>
      <button 
        onClick={() => handleEnviar(repassos)}
        disabled={enviando}
      >
        {enviando ? 'Enviando...' : 'Enviar Notificações'}
      </button>
      
      {resultado && (
        <div>
          Enviados: {resultado.filter(r => r.status === 'enviado').length}
        </div>
      )}
    </div>
  );
}
```

---

## 🛠️ Troubleshooting

### ❌ "Professional não possui dados bancários cadastrados"
**Causa:** Profissional sem dados cadastrados em `professional_bank_accounts`  
**Solução:** 
1. Acesse RepasseTransferenciaPage
2. Selecione profissional
3. Preencha dados bancários
4. Salve

### ❌ "Email não configurado para a clínica"
**Causa:** Configuração de email não preenchida  
**Solução:**
1. Acesse RepasseTransferenciaPage → Aba "Email"
2. Selecione provedor (SendGrid, Mailgun, etc)
3. Insira chave API
4. Salve

### ❌ "Erro ao enviar PIX"
**Causa:** Integração com banco não configurada (em produção)  
**Solução:** 
- Modo teste: Função simula transferência
- Modo produção: Configurar integração com API do banco via `.env`

### ❌ "Scheduler não executa"
**Causa:** Nenhum backend rodando cron job  
**Solução:** Configurar backend Node.js com:
```javascript
// backend/cron.js
const cron = require('node-cron');
const { executarCalculoAutomatico } = require('./repasseSchedulerApi');

// Executa todo dia 1º às 01:00
cron.schedule('0 1 1 * *', async () => {
  await executarCalculoAutomatico();
});
```

### ❌ "RLS bloqueando acesso"
**Causa:** User não tem acesso à clínica em `user_roles`  
**Solução:**
```sql
INSERT INTO user_roles (user_id, clinic_id, role)
VALUES ('seu-user-uuid', 'clinic-uuid', 'admin');
```

---

## 📊 Métricas e KPIs

O dashboard fornece:

- **Produção Total:** Soma de todos os valores brutos
- **Descontos:** Impostos, procedimentos falhados, etc
- **Repasse Profissional:** Valor final a transferir
- **Margem da Clínica:** 100% - % profissional
- **Ticket Médio:** Valor médio por atendimento
- **Evolução Mensal:** Gráfico de tendências

---

## 🔐 Segurança e Conformidade

- ✅ **RLS Policies:** Cada clínica acessa apenas seus dados
- ✅ **Auditoria Completa:** Todo movimento registrado com timestamp
- ✅ **Criptografia:** Dados sensíveis não logados
- ✅ **Validação:** Percentuais validados (0-100%)
- ✅ **Compliância:** Segue padrões SPB para transferências

---

## 📝 Changelog

### v1.0.0 (2025-03-19)
- ✅ Core repasse functionality
- ✅ Automatic calculation (70/30)
- ✅ Bank transfer integration (PIX, TED)
- ✅ Email notifications (SendGrid, Mailgun)
- ✅ Agenda integration
- ✅ Monthly scheduler
- ✅ PDF export
- ✅ Complete dashboard

---

## 🤝 Suporte

Para dúvidas ou bugs:
1. Consulte [troubleshooting](#troubleshooting)
2. Verifique logs em `repasse_pipeline_log`
3. Teste com `testePipelineCompleto(clinicId)`

