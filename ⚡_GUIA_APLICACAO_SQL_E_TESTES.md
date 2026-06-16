🚀 APLICAR SQL TRIGGERS - PASSO-A-PASSO

═══════════════════════════════════════════════════════════════════
FASE 1: INTEGRAÇÃO COMPLETADA
═══════════════════════════════════════════════════════════════════

✅ AtendimentoUnificado está integrado ao AgendaPage.jsx
✅ Handlers (open/close) implementados
✅ Estados (atendimentoUnificadoOpen, selectedAppointmentForUnified) criados
✅ Componente renderizando com props corretos

═══════════════════════════════════════════════════════════════════
FASE 2: APLICAR SQL TRIGGERS (AGORA)
═══════════════════════════════════════════════════════════════════

⏱️ TEMPO ESTIMADO: 5-10 minutos

PASSO 1: ABRIR SUPABASE SQL EDITOR
────────────────────────────────────────────────────────────────────
→ URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
→ Você deve estar logado no Supabase
→ Projeto: gvdkdjyupktlflwurike

PASSO 2: COPIAR O SQL
────────────────────────────────────────────────────────────────────
→ Abra VS Code
→ Arquivo: supabase/migrations/2024_04_appointment_financial_triggers.sql
→ Selecione TUDO (Ctrl+A)
→ Copie (Ctrl+C)

PASSO 3: COLAR E EXECUTAR
────────────────────────────────────────────────────────────────────
→ Volte a Supabase SQL Editor
→ Cole (Ctrl+V) no editor vazio
→ Clique no botão "RUN" (parte inferior/superior)
→ Aguarde alguns segundos

RESULTADO ESPERADO:
✓ Sem erros vermelhos
✓ Log mostrando tabelas/funções/triggers criados
✓ Mensagem de sucesso

PASSO 4: VERIFICAR SE FUNCIONOU
────────────────────────────────────────────────────────────────────
Execute os comandos de verificação:

A) Verificar triggers criados:
   SELECT * FROM pg_trigger WHERE tgname LIKE 'trg_%';
   → Deve retornar 3 linhas (3 triggers)

B) Verificar tabela audit:
   SELECT * FROM financial_audit_logs LIMIT 1;
   → Deve mostrar coluna de estrutura

C) Verificar RPC criado:
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'create_receivable_from_appointment';
   → Deve retornar 1 linha

═══════════════════════════════════════════════════════════════════
FASE 3: TESTAR INTEGRAÇÃO LOCALMENTE
═══════════════════════════════════════════════════════════════════

⏱️ TEMPO ESTIMADO: 10 minutos

TESTE 1: INICIAR DEV SERVER
────────────────────────────────────────────────────────────────────
Terminal:
$ npm run dev

Output esperado:
✓ VITE v5.4.21 building for development...
✓ Local: http://localhost:3000/
✓ ready in XXX ms

TESTE 2: TESTAR MODAL DO ATENDIMENTO UNIFICADO
────────────────────────────────────────────────────────────────────
Navegador:
1. Abra http://localhost:3000
2. Login se necessário
3. Vá para /clinica/agenda
4. Clique em qualquer AGENDAMENTO no calendário
5. Observe: Deve abrir modal com 5 abas

ABAS ESPERADAS:
✓ Aba 1 "Dados": Paciente, Pagador, Profissional, Sala
✓ Aba 2 "Serviços": Lista de serviços (preços, impostos)
✓ Aba 3 "Financeiro": Status (Não processado/Criado/Erro)
✓ Aba 4 "Auditoria": Timeline de eventos
✓ Aba 5 "Check-in": Presença, horários, observações

TESTE 3: VALIDAÇÃO DE DADOS
────────────────────────────────────────────────────────────────────
Na aba "Dados":
1. Observe badge vermelha "INVÁLIDO" (em cima)
2. Campos vazios mostram bordas vermelhas
3. Preencha um campo (ex: Paciente)
4. Observe badge mudar cor
5. Preencha todos os obrigatórios:
   - Paciente: selecionar
   - Pagador: selecionar
   - Profissional: selecionar
6. Badge deve ficar VERDE "✓ VÁLIDO"

TESTE 4: ADICIONAR SERVIÇOS
────────────────────────────────────────────────────────────────────
Na aba "Serviços":
1. Clique no botão "+ Adicionar Serviço"
2. Selecione um serviço
3. Observe os campos preenchidos automaticamente:
   - Descrição
   - Valor unitário
   - Quantidade
   - Subtotal
   - Impostos calculados
   - Valor líquido
4. Clique em "+" para adicionar outro serviço
5. Veja a tabela expandir e totais se atualizarem

TESTE 5: FECHAR E REABRIR
────────────────────────────────────────────────────────────────────
1. Clique "X" ou "Fechar"
2. Aguarde modal fechar
3. Clique novamente no agendamento
4. Observe modal abrir novamente (sem erros)
5. Verifique console (F12) - não deve ter erros vermelhos

═══════════════════════════════════════════════════════════════════
FASE 4: TESTE END-TO-END COMPLETO
═══════════════════════════════════════════════════════════════════

⏱️ TEMPO ESTIMADO: 20 minutos

CENÁRIO: Criar agendamento → Finalizar → Verificar receivable

PASSO 1: CRIAR NOVO AGENDAMENTO
────────────────────────────────────────────────────────────────────
1. Na agenda, crie novo slot (clique em espaço vazio)
2. Preencha todos os campos:
   - Paciente: selecione
   - Profissional: selecione
   - Data/Hora: confirme
   - Sala: selecione
3. Salve

PASSO 2: ABRIR EM MODAL UNIFICADO
────────────────────────────────────────────────────────────────────
1. Clique no agendamento criado
2. Observe modal abrir com dados preenchidos
3. Adicione pelo menos 1 SERVIÇO (aba Serviços)
4. Preencha CHECK-IN (aba Check-in)

PASSO 3: FINALIZAR ATENDIMENTO
────────────────────────────────────────────────────────────────────
1. Procure por botão "Finalizar Atendimento" ou similar
2. Clique
3. Observe status mudar para:
   - "Processando..." (amarelo)
   - Após alguns segundos → "Criado" ou "✓ Receivable criado" (verde)
4. Se ERROR (vermelho):
   - Clique em detalhes
   - Leia mensagem de erro
   - Reporte ao desenvolvedor

PASSO 4: VERIFICAR NO SUPABASE
────────────────────────────────────────────────────────────────────
Supabase Dashboard > SQL Editor, execute:

-- Localizar receivable criado:
SELECT * FROM ar_invoices 
WHERE appointment_id = 'SEU_APPOINTMENT_ID' 
ORDER BY created_at DESC;

-- Resultado esperado:
✓ Uma linha com status = 'open' ou 'created'
✓ valor_total calculado e preenchido
✓ impostos_totais calculado

-- Verificar auditoria:
SELECT * FROM financial_audit_logs 
WHERE appointment_id = 'SEU_APPOINTMENT_ID' 
ORDER BY created_at DESC;

-- Resultado esperado:
✓ Múltiplas linhas com eventos:
  - APPOINTMENT_DATA_VALIDATED
  - RECEIVABLE_CREATED
  - MAPPING_CREATED
  - Possíveis erros se houver

-- Verificar cashflow:
SELECT * FROM cash_flow_entries 
WHERE appointment_id = 'SEU_APPOINTMENT_ID';

-- Resultado esperado:
✓ Uma linha com:
  - type = 'projected' ou 'estimated'
  - valor = valor total do agendamento

═══════════════════════════════════════════════════════════════════
POSSÍVEIS PROBLEMAS E SOLUÇÕES
═══════════════════════════════════════════════════════════════════

PROBLEMA 1: "TypeError: Cannot read property 'map' of undefined"
SOLUÇÃO: Verifique que todas as queries foram resolvidas (loading=false)
→ Adicione console.log para debugar

PROBLEMA 2: "RPC call failed - permission denied"
SOLUÇÃO: Verifique RLS policies no Supabase
→ Execute: SELECT * FROM pg_policies WHERE tablename = 'ar_invoices';
→ Verifique que clinic_id está correto

PROBLEMA 3: "Modal não abre quando clico no agendamento"
SOLUÇÃO: Verifique console (F12)
→ Procure por erros em vermelho
→ Verifique que AtendimentoUnificado está importado em AgendaPage.jsx

PROBLEMA 4: "Serviços não aparecem no dropdown"
SOLUÇÃO: Verifique API
→ Abra DevTools (F12) → Network
→ Procure por requisição para /services
→ Verifique status 200 OK
→ Se 401/403, problema de autenticação

PROBLEMA 5: "Receivable não foi criado"
SOLUÇÃO: Verifique Supabase Logs
→ Dashboard > Logs > Database
→ Procure por erros do RPC
→ Se "valor_total null", problema está no cálculo de impostos

═══════════════════════════════════════════════════════════════════
CHECKLIST FINAL
═══════════════════════════════════════════════════════════════════

ANTES DE PARTIR PARA PRODUÇÃO:

☐ SQL triggers aplicados com sucesso (3 triggers + 1 RPC)
☐ Modal abre ao clicar em agendamento
☐ 5 abas carregam corretamente
☐ Validação (verde/vermelho) funciona
☐ Serviços podem ser adicionados
☐ Totais são calculados
☐ Modal fecha sem erros
☐ Agendamento pode ser finalizado
☐ Receivable criado em ar_invoices
☐ Auditoria registrada em financial_audit_logs
☐ Cashflow atualizado
☐ Console do navegador está limpo (sem erros)
☐ Network tab mostra requisições 200 OK
☐ RLS está protegendo dados (só vê clinic_id da clínica)

═══════════════════════════════════════════════════════════════════
PRÓXIMOS PASSOS APÓS TESTES
═══════════════════════════════════════════════════════════════════

1. ✅ SQL Triggers aplicados e testados
2. ✅ Integração local validada
3. ⏳ Deploy para produção (quando testes passarem 100%)
4. ⏳ Monitoramento em produção
5. ⏳ Otimizações conforme feedback

═══════════════════════════════════════════════════════════════════
DOCUMENTAÇÃO TÉCNICA
═══════════════════════════════════════════════════════════════════

Ver arquivos de documentação:
→ supabase/migrations/2024_04_appointment_financial_triggers.sql
→ src/lib/appointmentFinancialIntegrationApi.ts
→ src/pages/clinica/agenda/components/AtendimentoUnificado.jsx

═══════════════════════════════════════════════════════════════════
