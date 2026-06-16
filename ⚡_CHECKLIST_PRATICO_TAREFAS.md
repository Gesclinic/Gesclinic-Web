✅ CHECKLIST PRÁTICO - INTEGRAÇÃO ATENDIMENTO UNIFICADO

═══════════════════════════════════════════════════════════════════════════════════

🚀 FASE 1: SQL DEPLOYMENT (5 MINUTOS)
═══════════════════════════════════════════════════════════════════════════════════

Tarefa 1: Abrir arquivo SQL
  ☐ Abra VS Code
  ☐ Arquivo: ⚡_SQL_COPIAR_COLAR_30SEGUNDOS.sql
  ☐ Selecione TODO o conteúdo SQL (Ctrl+A)
  ☐ Copie (Ctrl+C)

Tarefa 2: Colar em Supabase
  ☐ Abra: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
  ☐ Clique no editor branco
  ☐ Cole (Ctrl+V)
  ☐ Clique em "RUN"
  ☐ Aguarde 2-3 segundos

Tarefa 3: Verificar sucesso
  ☐ Procure por mensagem verde "Success"
  ☐ Se vermelho/erro:
    - Leia mensagem de erro
    - Verifique que tabelas base existem (appointments, ar_invoices, payers)
    - Tente novamente

Tarefa 4: Executar verificação
  ☐ Copie a linha: SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';
  ☐ Cole em novo editor SQL
  ☐ Clique "RUN"
  ☐ Resultado esperado: 3 linhas com triggers

✅ CHECKPOINT 1: SQL aplicado com sucesso

═══════════════════════════════════════════════════════════════════════════════════

🚀 FASE 2: TESTAR INTEGRAÇÃO LOCAL (10 MINUTOS)
═══════════════════════════════════════════════════════════════════════════════════

Tarefa 5: Iniciar dev server
  ☐ Abra terminal/PowerShell
  ☐ Navegue para c:\dev\gesclinic-web
  ☐ Digite: npm run dev
  ☐ Espere aparecer: "Local: http://localhost:3000"
  ☐ Não feche este terminal

Tarefa 6: Abrir aplicação
  ☐ Navegador: http://localhost:3000
  ☐ Faça login (se necessário)
  ☐ Vá para /clinica/agenda
  ☐ Você deve ver calendário com agendamentos

Tarefa 7: Testar modal unificado
  ☐ Procure um agendamento no calendário
  ☐ Clique NELE
  ☐ Verifique que MODAL ABRE (não página inteira)
  ☐ Modal deve mostrar: "Atendimento Unificado" no topo
  ☐ Modal deve ter 5 ABAS visíveis

Verificar 5 Abas:
  ☐ Aba 1: "Dados" - mostra Paciente, Pagador, Profissional, Sala
  ☐ Aba 2: "Serviços" - tabela vazia ou com serviços, botão "+ Adicionar"
  ☐ Aba 3: "Financeiro" - status, valores (pode estar vazio inicialmente)
  ☐ Aba 4: "Auditoria" - timeline de eventos
  ☐ Aba 5: "Check-in" - campos de presença, horários

Tarefa 8: Testar validação
  ☐ Na Aba "Dados"
  ☐ Observe badge no topo (deve estar VERMELHO "INVÁLIDO")
  ☐ Preencha campo "Paciente" - selecione um
  ☐ Observe badge mudar cor (deve ir ficando verde)
  ☐ Preencha todos obrigatórios (Paciente, Pagador, Profissional, Sala - se aplicável)
  ☐ Badge deve ficar VERDE "✓ VÁLIDO"

Tarefa 9: Testar serviços
  ☐ Na Aba "Serviços"
  ☐ Clique "+ Adicionar Serviço"
  ☐ Selecione um serviço do dropdown
  ☐ Verifique que campos se preenchem automaticamente:
    - Descrição
    - Valor unitário
    - Quantidade (e.g., 1)
    - Subtotal = valor × quantidade
  ☐ Clique "+" para adicionar outro serviço
  ☐ Verifique que aparece na tabela
  ☐ Procure por totalizadores (Subtotal, Impostos, Total)

Tarefa 10: Fechar modal
  ☐ Clique "X" ou "Fechar" ou pressione ESC
  ☐ Modal deve desaparecer
  ☐ Você volta ao calendário

Tarefa 11: Verificar console
  ☐ Pressione F12 (abrir DevTools)
  ☐ Vá para aba "Console"
  ☐ Procure por ERROS vermelhos
  ☐ Se houver:
    - Leia mensagem de erro
    - Tire screenshot
    - Reporte

✅ CHECKPOINT 2: Modal funciona localmente

═══════════════════════════════════════════════════════════════════════════════════

🚀 FASE 3: TESTE COMPLETO END-TO-END (20 MINUTOS)
═══════════════════════════════════════════════════════════════════════════════════

Tarefa 12: Criar agendamento de teste
  ☐ Na agenda, procure slot vazio
  ☐ Clique para criar novo
  ☐ Preencha todos os campos obrigatórios:
    - Data: hoje ou amanhã
    - Hora: qualquer
    - Paciente: selecione
    - Profissional: selecione
    - Sala/Consultório: selecione
    - Serviço: ≥ 1 serviço obrigatório
  ☐ Salve

Tarefa 13: Abrir em modal unificado
  ☐ Clique no agendamento criado
  ☐ Modal deve abrir com dados preenchidos
  ☐ Se Paciente/Profissional vazios, preencha

Tarefa 14: Adicionar serviços
  ☐ Va para Aba "Serviços"
  ☐ Se vazio, clique "+ Adicionar Serviço"
  ☐ Selecione ≥ 1 serviço
  ☐ Observe totalizadores

Tarefa 15: Preencher Check-in
  ☐ Va para Aba "Check-in"
  ☐ Marque "Presente" ou "Ausente"
  ☐ Preencha horários (hora entrada/saída)
  ☐ Observações (opcional)

Tarefa 16: Procurar botão "Finalizar"
  ☐ Procure por botão com texto:
    - "Finalizar Atendimento" ou
    - "Marcar como Concluído" ou
    - "Complete Appointment" ou
    - "Salvar e Finalizar"
  ☐ Botão deve estar VERDE (ativo)
  ☐ Se desabilitado (cinza), verifique Aba "Dados" - deve estar VERDE

Tarefa 17: Finalizar atendimento
  ☐ Clique em "Finalizar Atendimento"
  ☐ Observe status mudar:
    - "Processando..." (amarelo) durante 1-2 segundos
    - "✓ Criado" ou "Receivable criado" (verde) = SUCESSO
    - "Erro" ou "❌" (vermelho) = PROBLEMA
  
  SE SUCESSO (verde):
    ☐ Status financeiro mudou
    ☐ Prossiga para Tarefa 18
    
  SE ERRO (vermelho):
    ☐ Clique em "detalhes" ou hover para ler mensagem
    ☐ Mensagens comuns:
      - "RLS policy denied" → Problema de permissões (contactar admin)
      - "Validation failed" → Dados incompletos (preencha tudo novamente)
      - "Connection refused" → Supabase down (tente mais tarde)
    ☐ Anote mensagem exacta

Tarefa 18: Verificar em Supabase
  ☐ Abra Supabase Dashboard
  ☐ Vá para SQL Editor
  ☐ Execute (copie e cole):
    
    SELECT * FROM ar_invoices 
    WHERE appointment_id = 'COPIE_O_ID_DO_AGENDAMENTO' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    (Encontre appointment_id nas abas do modal ou em browser DevTools)
  
  ☐ Resultado esperado:
    - 1 linha
    - Colunas visíveis: id, clinic_id, appointment_id, status, valor_gross, impostos_totais, valor_liquido
    - status = 'open' ou 'created'
    - valores preenchidos (não NULL)

Tarefa 19: Verificar auditoria
  ☐ Supabase > SQL Editor
  ☐ Execute:
    
    SELECT event_type, event_data, created_at FROM financial_audit_logs 
    WHERE appointment_id = 'MESMO_ID' 
    ORDER BY created_at DESC 
    LIMIT 10;
  
  ☐ Resultado esperado:
    - Múltiplas linhas com eventos:
      1. APPOINTMENT_DATA_FETCHED
      2. APPOINTMENT_DATA_VALIDATION_FAILED (se houve erro) ou APPOINTMENT_DATA_VALIDATION_OK
      3. RECEIVABLE_CREATED
      4. MAPPING_CREATED
      5. CASHFLOW_UPDATED
      6. TRIGGER_* eventos

Tarefa 20: Verificar cashflow
  ☐ Supabase > SQL Editor
  ☐ Execute:
    
    SELECT * FROM cash_flow_entries 
    WHERE appointment_id = 'MESMO_ID';
  
  ☐ Resultado esperado:
    - 1 linha
    - type = 'projected' ou 'estimated'
    - valor = valor total do agendamento

✅ CHECKPOINT 3: Fluxo end-to-end funcionando

═══════════════════════════════════════════════════════════════════════════════════

🚀 FASE 4: VALIDAÇÃO DE PRODUÇÃO (10 MINUTOS)
═══════════════════════════════════════════════════════════════════════════════════

Tarefa 21: Testar 2-3 agendamentos mais
  ☐ Repita Tarefas 12-20 para 2-3 agendamentos diferentes
  ☐ Teste com:
    - Diferentes pacientes
    - Diferentes profissionais
    - Diferentes combinações de serviços
  ☐ Todos devem funcionar

Tarefa 22: Verificar performance
  ☐ F12 > Network tab
  ☐ Clique em agendamento
  ☐ Procure por requisições API (GET/POST)
  ☐ Tempo de resposta (em ms):
    - ✓ <200ms = Excelente
    - ✓ 200-500ms = Bom
    - ⚠️ 500-1000ms = Aceitável
    - ❌ >1000ms = Problema (otimizar queries)
  ☐ Todos com status 200 OK (verde)

Tarefa 23: Verificar segurança RLS
  ☐ Abra Supabase Dashboard
  ☐ Va para aba "Data" (Editor de dados)
  ☐ Clique em tabela "financial_audit_logs"
  ☐ Você deve ver APENAS dados da SUA clínica (clinic_id)
  ☐ Se ver dados de outras clínicas = PROBLEMA RLS

Tarefa 24: Verificar logs de erro
  ☐ Supabase Dashboard > Logs > Database
  ☐ Procure por erros vermelhos (últimas 10 min)
  ☐ Erros esperados: Nenhum (ou pouquíssimos)
  ☐ Se muitos erros:
    - Leia mensagens
    - Procure por padrões
    - Reporte problemas

✅ CHECKPOINT 4: Validação de produção OK

═══════════════════════════════════════════════════════════════════════════════════

RESUMO - TAREFAS CRÍTICAS
═══════════════════════════════════════════════════════════════════════════════════

OBRIGATÓRIO (Sem estes, não funciona):
1. ✅ Aplicar SQL em Supabase (Tarefa 1-4)
2. ✅ Iniciar dev server (Tarefa 5)
3. ✅ Modal abre ao clicar (Tarefa 7)
4. ✅ Validação funciona (Tarefa 8)
5. ✅ Agendamento finaliza sem erro (Tarefa 17)
6. ✅ Receivable criado em Supabase (Tarefa 18)

RECOMENDADO (Para garantir qualidade):
7. ⚠️ Testar 2-3 agendamentos (Tarefa 21)
8. ⚠️ Verificar performance (Tarefa 22)
9. ⚠️ Validar RLS (Tarefa 23)
10. ⚠️ Revisar logs (Tarefa 24)

═══════════════════════════════════════════════════════════════════════════════════

SE ALGO NÃO FUNCIONAR:
═══════════════════════════════════════════════════════════════════════════════════

Erro de SQL:
→ Verifique que todas as tabelas base existem:
  - appointments ✓
  - ar_invoices ✓
  - payers ✓
  - financial_audit_logs (será criada)
→ Se alguma está faltando, contacte desenvolvedor

Modal não abre:
→ F12 > Console > procure por erro vermelho
→ Se "ReferenceError: AtendimentoUnificado is not defined"
  → Problema no import (arquivo não copiado/integrado corretamente)
→ Se "Cannot read property 'map'"
  → Problema em queries React Query (alguma query retornou undefined)

Receivable não foi criado:
→ Supabase > Logs > Database
→ Procure por erro do RPC
→ Causas comuns:
  - validation_failed: Dados incompletos (preenchaAgendamento novamente)
  - permission_denied: RLS bloqueando (verifique clinic_id)
  - connection_error: Supabase instável (tente mais tarde)

Modal lento:
→ F12 > Performance tab > gravar durante clique
→ Procure por queries lentas (>500ms)
→ Possíveis causas:
  - Muitos serviços carregando
  - Índices faltando no BD
  - Internet lenta

═══════════════════════════════════════════════════════════════════════════════════

✅ FELICIDADES! 
Se você chegou aqui e todos os checkpoints passaram:

🎉 INTEGRAÇÃO ATENDIMENTO UNIFICADO ESTÁ FUNCIONANDO

Próximos passos:
1. Documentar workflows com usuários finais
2. Treinar equipe
3. Deploy para staging
4. Deploy para produção
5. Monitoramento em produção

═══════════════════════════════════════════════════════════════════════════════════
