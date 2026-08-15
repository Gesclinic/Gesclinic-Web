# Agenda - Relatorio E2E

## Estado

APROVADO LOCALMENTE.

## Tentativa

- `npm run test:e2e` falhou inicialmente porque o executavel `cypress` e `cypress/support/commands` nao estavam disponiveis.
- Cypress foi adicionado e verificado; o import redundante do arquivo inexistente foi removido.
- Vite foi iniciado em `http://127.0.0.1:3000` e a suite foi executada em Electron headless.
- Resultado: 22 passing, 0 failing, duracao 7m08s.

## Pre-requisitos

- Aplicacao servida em URL de teste.
- Supabase de teste com migrations Platform aplicadas.
- Usuario/clinica de teste e fixtures de appointment.
- Cypress instalado e configurado para a URL do ambiente.

## Criterio pendente

O E2E de formularios passou. O fluxo de banco Appointment -> Audit -> Outbox -> Worker -> Commit e o rollback correspondente continuam pendentes no ambiente de integracao.