# 📊 Guia de Observabilidade com Sentry (Produção)

## Objetivo

Capturar erros reais, rastrear comportamento de usuários e debug em produção sem acesso direto aos logs.

---

## 1️⃣ Configuração Inicial (OBRIGATÓRIO)

### A. Criar Conta no Sentry

1. Ir para: https://sentry.io
2. Criar conta (ou login se já tem)
3. Criar novo projeto:
   - **Project Name:** Gesclinic Web
   - **Team:** Seu time
   - **Platform:** React (a ferramenta detectará automaticamente)

### B. Obter DSN

Após criar o projeto, você receberá uma **DSN** (Data Source Name):

```
https://xxxxxxxxxxxxx@o12345.ingest.sentry.io/6789012
```

---

## 2️⃣ Configurar no Projeto

### A. Adicionar VITE_SENTRY_DSN ao .env

**Arquivo: `.env.local` ou `.env.production`**

```env
VITE_SENTRY_DSN=https://xxxxxxxxxxxxx@o12345.ingest.sentry.io/6789012
VITE_APP_ENV=production
```

> ⚠️ **IMPORTANTE:** Nunca commitar `.env` com secrets reais no Git. Adicionar ao `.gitignore`:
>
> ```
> .env.local
> .env.production
> .env.*.local
> ```

### B. Verificar main.jsx

✅ Já configurado automaticamente:

```javascript
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || '',
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: 0.1, // 10% sampling
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.VITE_APP_ENV || 'production',
  });
}
```

---

## 3️⃣ O Que Está Sendo Rastreado

### Criar Agendamento

**Em Erro:**

```
❌ Sentry Event:
- Exception: Error message
- Tag: action=criar_agendamento
- Extra: clinicId, payload, errorMessage
- Stack trace completa
```

**Em Sucesso:**

```
✅ Sentry Event (info):
- Message: "Agendamento criado com sucesso"
- Tag: action=criar_agendamento, clinicId
```

### Atualizar Agendamento

**Em Erro:**

```
❌ Sentry Event:
- Exception: Error message
- Tags: action=atualizar_agendamento, clinicId, agendamentoId
- Extra: payload, errorMessage
- Stack trace
```

**Em Sucesso:**

```
✅ Sentry Event (info):
- Message: "Agendamento atualizado com sucesso"
- Tags: action=atualizar_agendamento, clinicId, agendamentoId
```

---

## 4️⃣ Acessar Dados no Sentry Dashboard

### A. Ver Eventos de Erro

1. Abrir: https://sentry.io/organizations/seu-org/issues/
2. Filtrar por projeto: **Gesclinic Web**
3. Ver últimos erros:
   - **Title:** Descrição do erro
   - **Count:** Quantas vezes ocorreu
   - **Users Affected:** Quantos usuários
   - **Status:** Resolved, Ignored, Reopened

### B. Detalhes do Erro

Clicar no erro para ver:

- ✅ **Stack Trace** — Linha exata do erro
- ✅ **Breadcrumbs** — Eventos antes do erro
- ✅ **Tags** — action, clinicId para filtrar
- ✅ **Extra** — payload, errorMessage
- ✅ **Replay Video** — Reprodução do erro (se habilitado)

### C. Buscar por Tag

```
is:resolved status:unresolved
action:criar_agendamento clinicId:123
```

---

## 5️⃣ Exemplos de Uso Avançado

### Capturar Erro Customizado em Qualquer Lugar

```javascript
import * as Sentry from '@sentry/react';

try {
  // seu código
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: 'relatorio' },
    extra: { dados: meusDados },
  });
}
```

### Enviar Mensagem de Info

```javascript
Sentry.captureMessage('Relatório gerado', {
  level: 'info',
  tags: { feature: 'relatorio' },
});
```

### Acompanhamento de Performance

```javascript
const transaction = Sentry.startTransaction({ name: 'operacao-pesada' });

// seu código aqui

transaction.finish();
```

---

## 6️⃣ Configurações Avançadas (Opcional)

### A. Filtrar Erros Específicos

Se quiser ignorar certos erros:

```javascript
Sentry.init({
  // ... outros config
  beforeSend(event, hint) {
    // Ignorar erros de rede normais
    if (event.exception?.values?.[0]?.value?.includes('Failed to fetch')) {
      return null;
    }
    return event;
  },
});
```

### B. Adicionar Contexto do Usuário

```javascript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name,
});
```

### C. Adicionar Contexto da Clínica

```javascript
Sentry.setTag('clinicId', clinicId);
Sentry.setContext('clinic', {
  name: clinicName,
  plan: 'premium',
});
```

---

## 7️⃣ Troubleshooting

### Problema: Eventos não aparecem no Sentry

**Checklist:**

- [ ] DSN configurada corretamente em `.env.production`
- [ ] App rodando em build de produção (`npm run build && npm run preview`)
- [ ] Network tab mostra requisições para `ingest.sentry.io`
- [ ] Sem ad-blockers bloqueando Sentry

### Problema: Sensitive Data Exposto

**Solução:**

```javascript
Sentry.init({
  integrations: [
    new Sentry.Replay({
      maskAllText: true, // Esconde todo texto
      blockAllMedia: true, // Bloqueia imagens/vídeos
    }),
  ],
});
```

### Problema: Quota Excedida

**Sentry oferece:**

- Free: 5k eventos/mês
- Paid: Planos personalizados

Para economizar:

```javascript
tracesSampleRate: 0.1, // Reduzir para 5% se necessário
```

---

## 8️⃣ Checklist de Deploy

Antes de ir para produção:

- [ ] VITE_SENTRY_DSN configurada em variáveis de ambiente
- [ ] VITE_APP_ENV definida como "production"
- [ ] Build local testado: `npm run build && npm run preview`
- [ ] Verificar que Sentry.init() está sendo chamado apenas em PROD
- [ ] Testar um erro intencional para confirmar envio para Sentry
- [ ] Configurar alertas no Sentry para notificar erros
- [ ] Revisar política de retenção de dados (GDPR, Lei Geral de Proteção de Dados)

---

## 9️⃣ Teste Rápido (5 min)

### Passo 1: Build de Produção

```bash
npm run build
npm run preview
```

### Passo 2: Abrir Console e Forçar Erro

```javascript
// No console do navegador, simular erro:
import * as Sentry from '@sentry/react';
Sentry.captureException(new Error('Erro de teste deliberado'));
```

### Passo 3: Verificar Dashboard

1. Ir para: https://sentry.io/organizations/seu-org/issues/
2. Procurar por "Erro de teste deliberado"
3. Deve aparecer em segundos

✅ Se aparecer: **Tudo funcionando!**

---

## 🔟 Próximos Passos

### Fase 1: Monitoramento Básico ✅ COMPLETO

- [x] Sentry configurado
- [x] Erros de mutation rastreados
- [x] Eventos de sucesso logados

### Fase 2: Alertas (OPCIONAL)

- [ ] Criar regra de alert: "Quando erro de criar_agendamento"
- [ ] Notificar via Email/Slack

### Fase 3: Análise (OPCIONAL)

- [ ] Dashboard customizado de performance
- [ ] Relatório semanal de erros

---

## 📚 Recursos

- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react/
- **React Query Integration:** https://docs.sentry.io/platforms/javascript/integrations/react-query/
- **Performance Monitoring:** https://docs.sentry.io/product/performance/

---

## ✅ Status

**Observabilidade implementada:** 🚀 100%

Todos os erros de agenda agora são rastreados automaticamente em produção. Dashboard Sentry fornece insights completos sobre o comportamento do sistema em tempo real.
