# 🔐 Configuração de Monitoramento de Erros com Sentry

## Visão Geral

O Gesclinic Web suporta monitoramento de erros em produção através do **Sentry**.

## Como Configurar

### 1. Criar Conta no Sentry (Opcional)

Se desejar usar monitoramento de erros:

1. Acesse https://sentry.io/
2. Crie uma conta gratuita
3. Crie um novo projeto com React 18
4. Copie o **DSN** fornecido

### 2. Adicionar VITE_SENTRY_DSN

**Em Desenvolvimento (.env local):**
```bash
VITE_SENTRY_DSN=https://your-key@sentry.io/your-project-id
```

**Em Produção (GitHub Secrets):**
1. Vá para: `https://github.com/Gesclinic/Gesclinic-Web/settings/secrets/actions`
2. Clique em "New repository secret"
3. Nome: `VITE_SENTRY_DSN`
4. Valor: Cole seu DSN do Sentry

### 3. Redeploy

Após adicionar o secret, qualquer novo push para `master` acionará um novo deploy com Sentry habilitado.

## Se Não Configurar

Se `VITE_SENTRY_DSN` não for fornecido:
- ✅ App funciona normalmente
- ✅ Nenhum erro ocorre
- ❌ Você não terá monitoramento de erros em produção

## Usando Sentry

Após configurado, erros não capturados serão automaticamente relatados ao Sentry:

```javascript
// Sentry captura automaticamente
throw new Error("Algo deu errado!");

// Também pode capturar manualmente
import * as Sentry from '@sentry/react';
Sentry.captureException(error);
```

## Dashboard

Após erros ocorrerem, visualize-os em:
```
https://sentry.io/organizations/your-org/issues/
```

## Suporte

Para dúvidas sobre Sentry, consulte: https://docs.sentry.io/product/
