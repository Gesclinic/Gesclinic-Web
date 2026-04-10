✅ DEPLOYMENT CHECKLIST - BASE DO SISTEMA

═════════════════════════════════════════════════════════════════════════════════

AMBIENTE: [ ] Desenvolvimento  [ ] Staging  [ ] Produção

DATA DO DEPLOYMENT: ___/___/______
RESPONSÁVEL: _____________________________
VERSÃO: 1.0

═════════════════════════════════════════════════════════════════════════════════

PRÉ-DEPLOYMENT CHECKLIST

┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. VERIFICAÇÕES DE CÓDIGO                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Todos os 12 componentes criados                                        │
│     ServicesPage, ProfessionalsPage, HealthInsurancesPage, RoomsPage,      │
│     ResourcesPage, ProfessionalServicesPage, AgendaRulesPage,             │
│     RoomResourcesPage, ProfessionalSchedulePage, ServicePricesPage,        │
│     RevenueRulesPage, ProfessionalPayerPage                               │
│                                                                             │
│ [ ] Todos os 12 componentes importados em pages.jsx                        │
│                                                                             │
│ [ ] Todas as 12 rotas registradas em AppRoutes.jsx                        │
│     Path: /clinica/base-sistema/{componente}                               │
│                                                                             │
│ [ ] Validações implementadas em todos os componentes                       │
│     - Campos obrigatórios                                                  │
│     - Formatos (email, numérico, etc)                                      │
│     - Ranges (0-100 para porcentagens)                                      │
│     - Duplicatas prevenidas (M:M)                                          │
│                                                                             │
│ [ ] Error handling implementado                                            │
│     - Try-catch em todas as requisições                                    │
│     - Loading states                                                       │
│     - Estados vazios exibidos                                              │
│     - Mensagens de erro claras                                             │
│                                                                             │
│ [ ] Soft delete implementado                                               │
│     - Deletar usa UPDATE deleted_at ao invés de remover                    │
│     - Queries filtram IS NULL para deleted_at                              │
│                                                                             │
│ [ ] Clinic_ID isolamento implementado                                      │
│     - Todas as queries: .eq('clinic_id', clinicId)                        │
│     - Todas as queries: .is('deleted_at', null)                           │
│     - Sem dados de outras clínicas aparecem                                │
│                                                                             │
│ [ ] Responsividade testada                                                 │
│     - Mobile (320px): Tabelas scrolláveis                                  │
│     - Tablet (768px): Layout adaptado                                      │
│     - Desktop (1920px): Layout perfeito                                    │
│                                                                             │
│ [ ] Lint check passou                                                      │
│     npm run lint                                                           │
│                                                                             │
│ [ ] Build sucesso                                                          │
│     npm run build                                                          │
│     Sem erros de build                                                     │
│                                                                             │
│ [ ] 120 testes automatizados passaram                                      │
│     npm run test:integration                                               │
│     Taxa de sucesso: 100%                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. VERIFICAÇÕES DE BANCO DE DADOS                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Tabelas criadas no Supabase:                                          │
│     - services                                                             │
│     - professionals                                                        │
│     - health_insurances                                                    │
│     - rooms                                                                │
│     - resources                                                            │
│     - professional_services (M:M)                                          │
│     - agenda_rules                                                         │
│     - room_resources (M:M)                                                 │
│     - professional_schedules                                               │
│     - service_prices                                                       │
│     - revenue_rules                                                        │
│     - professional_payer (M:M)                                             │
│                                                                             │
│ [ ] Coluna deleted_at em todas as tabelas                                 │
│     Tipo: TIMESTAMPTZ, Padrão: null                                        │
│                                                                             │
│ [ ] Coluna clinic_id em todas as tabelas                                  │
│     Tipo: UUID, NOT NULL                                                  │
│     Foreign Key: → clinics(id)                                            │
│                                                                             │
│ [ ] UNIQUE constraints implementados:                                      │
│     - health_insurances: (clinic_id, code)                                │
│     - professional_services: (clinic_id, prof_id, serv_id)               │
│     - room_resources: (clinic_id, room_id, resource_id)                  │
│     - professional_payer: (clinic_id, prof_id, payer_id)                 │
│                                                                             │
│ [ ] RLS (Row Level Security) habilitado no Supabase                       │
│     Política: clinic_id = auth.uid() → clinic_id                          │
│                                                                             │
│ [ ] Índices criados para performance:                                      │
│     - clinic_id em todas as tabelas                                        │
│     - deleted_at para filtragem rápida                                     │
│                                                                             │
│ [ ] Seed data adicionado (opcional)                                        │
│     - Dados de teste para cada tabela                                      │
│                                                                             │
│ [ ] Backups configurados                                                   │
│     Supabase: Settings → Backups → Habilitado                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. VERIFICAÇÕES DE AUTENTICAÇÃO E AUTORIZAÇÃO                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Componentes requerem autenticação                                      │
│     useAuth() retorna { isAuthenticated, loading }                         │
│     Redireciona para /login se não autenticado                             │
│                                                                             │
│ [ ] Clinic context funciona                                               │
│     useClinicContext() retorna { clinicId, clinic, loadingClinic }        │
│                                                                             │
│ [ ] Admin check implementado                                               │
│     Apenas admin pode acessar Base do Sistema                              │
│                                                                             │
│ [ ] Permissões verificadas                                                │
│     - CREATE: Admin                                                       │
│     - READ: Admin                                                         │
│     - UPDATE: Admin                                                       │
│     - DELETE: Admin                                                       │
│                                                                             │
│ [ ] Session timeout funcionando                                           │
│     Token expira e usuário é redirecionado                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. VERIFICAÇÕES DE PERFORMANCE                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Lazy loading implementado                                              │
│     Componentes carregam sob demanda em AppRoutes.jsx                      │
│                                                                             │
│ [ ] Paginação implementada                                                │
│     Listagens dividem em páginas (10-25 itens)                             │
│                                                                             │
│ [ ] Busca/filtro funciona                                                  │
│     .ilike() para busca case-insensitive                                   │
│                                                                             │
│ [ ] Sem memory leaks                                                       │
│     Testado: Abrir/fechar componentes 10x                                  │
│     Memoria não cresce continuamente                                       │
│                                                                             │
│ [ ] Time to Interactive < 3 segundos                                      │
│     Medido com Chrome DevTools                                             │
│                                                                             │
│ [ ] Sem N+1 queries                                                        │
│     Queries bem estruturadas                                               │
│     Não há loops dentro de queries                                         │
│                                                                             │
│ [ ] Memoization implementado                                               │
│     useCallback para funções de callback                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. VERIFICAÇÕES DE SEGURANÇA                                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] SQL Injection prevenido                                                │
│     Usar Supabase parameterized queries (nunca string interpolation)      │
│                                                                             │
│ [ ] XSS prevenido                                                          │
│     React sanitiza JSX automaticamente                                     │
│     Sem dangerouslySetInnerHTML                                            │
│                                                                             │
│ [ ] CSRF tokens implementados                                              │
│     Supabase RLS previne CSRF automaticamente                              │
│                                                                             │
│ [ ] Validação de entrada                                                   │
│     Frontend: Validação de formato                                         │
│     Backend: Constraints no banco                                          │
│                                                                             │
│ [ ] Sem sensitive data em console                                          │
│     Não logar senhas, tokens, etc                                         │
│                                                                             │
│ [ ] CORS configurado corretamente                                          │
│     Supabase URL é a origem permitida                                      │
│                                                                             │
│ [ ] Variáveis de ambiente protegidas                                       │
│     VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env                   │
│     Não commitadas no git                                                  │
│                                                                             │
│ [ ] RLS policies aplicadas                                                │
│     Supabase → Tables → [tabela] → RLS Policies → Ativar                 │
│                                                                             │
│ [ ] Rate limiting (opcional)                                               │
│     Para proteger contra brute force                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

DEPLOYMENT CHECKLIST (ANTES DE DEPLOY)

┌─────────────────────────────────────────────────────────────────────────────┐
│ 6. PREPARAÇÃO PARA DEPLOY                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Branch correto selecionado                                             │
│     git branch: main ou production                                         │
│                                                                             │
│ [ ] Última versão do código                                                │
│     git pull origin [branch]                                               │
│     Sem conflitos                                                          │
│                                                                             │
│ [ ] Node modules atualizados                                               │
│     npm install                                                            │
│     npm ci (recomendado em CI/CD)                                          │
│                                                                             │
│ [ ] Variáveis de ambiente corretas                                         │
│     .env contém valores do ambiente de deploy                              │
│     VITE_SUPABASE_URL = [URL de produção]                                 │
│     VITE_SUPABASE_ANON_KEY = [Chave de produção]                          │
│                                                                             │
│ [ ] Build sucesso                                                          │
│     npm run build                                                          │
│     Sem erros                                                              │
│     dist/ criado com sucesso                                               │
│                                                                             │
│ [ ] Testes passando                                                        │
│     npm run test:integration                                               │
│     100% de sucesso                                                        │
│                                                                             │
│ [ ] Lint limpo                                                             │
│     npm run lint                                                           │
│     Sem erros críticos                                                     │
│                                                                             │
│ [ ] Bundle size aceitável                                                  │
│     npm run build → Verificar tamanho em dist/                             │
│     Sem aumento drástico                                                   │
│                                                                             │
│ [ ] Build preview testado                                                  │
│     npm run preview                                                        │
│     Abrir http://localhost:4173                                            │
│     Funcionalidade básica OK                                               │
│                                                                             │
│ [ ] Documentação atualizada                                                │
│     README técnico                                                         │
│     Guia de uso                                                            │
│     Troubleshooting                                                        │
│     Changelog                                                              │
│                                                                             │
│ [ ] Changelogs preparado                                                   │
│     CHANGELOG.md atualizado                                                │
│     Versão 1.0 de Base do Sistema documentada                              │
│                                                                             │
│ [ ] Plano de rollback preparado                                            │
│     Se necessário voltar: como reverter?                                   │
│     Backups do banco feitos?                                               │
│                                                                             │
│ [ ] Equipe notificada                                                      │
│     Slack/Email: Deploy de Base do Sistema em [data] [hora]               │
│     Estimated downtime: ~5 minutos (se aplicável)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

PÓS-DEPLOYMENT CHECKLIST

┌─────────────────────────────────────────────────────────────────────────────┐
│ 7. VALIDAÇÃO PÓS-DEPLOY                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ [ ] Página carrega sem erros                                               │
│     /clinica/base-sistema/servicos                                         │
│     /clinica/base-sistema/profissionais                                    │
│     etc (todos os 12 componentes)                                          │
│                                                                             │
│ [ ] Login funciona                                                         │
│     Conseguir fazer login com admin                                        │
│                                                                             │
│ [ ] CRUD básico funciona                                                   │
│     [ ] Criar novo serviço → OK                                            │
│     [ ] Listar serviços → OK                                               │
│     [ ] Editar serviço → OK                                                │
│     [ ] Deletar serviço → OK                                               │
│                                                                             │
│ [ ] Validações funcionam                                                   │
│     Tentar nome vazio → erro                                               │
│     Tentar email inválido → erro                                           │
│                                                                             │
│ [ ] Soft delete funciona                                                   │
│     Deletar item → desaparece da lista                                     │
│     Verificar deleted_at no BD                                             │
│                                                                             │
│ [ ] Clinic isolamento funciona                                             │
│     Trocar clínica → dados diferentes aparecem                             │
│     Outra clínica não consegue acessar dados dessa clínica                 │
│                                                                             │
│ [ ] Responsividade funciona                                                │
│     Abrir em mobile (DevTools)                                             │
│     Tabelas scrolláveis OK                                                 │
│     Botões funcionam OK                                                    │
│                                                                             │
│ [ ] Console sem erros vermelhos                                            │
│     F12 → Console → Nenhuma mensagem de erro                               │
│                                                                             │
│ [ ] Performance aceitável                                                  │
│     Página carrega em < 3 segundos                                         │
│     Sem lag ao interagir                                                   │
│                                                                             │
│ [ ] Monitoring/Logging ativo                                               │
│     Logs being coletados no servidor                                       │
│     Alertas configurados para erros                                        │
│                                                                             │
│ [ ] Backup confirmado                                                      │
│     Supabase backup foi feito                                              │
│     Backup accessível se necessário restaurar                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 8. SMOKE TESTS (Testes Rápidos)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Test 1: Criar Serviço                                                      │
│   1. Acesse /clinica/base-sistema/servicos                                 │
│   2. Clique "+ Novo Serviço"                                               │
│   3. Preencha: Nome = "Teste Smoke", Desc = "Test"                        │
│   4. Clique "Salvar"                                                       │
│   [ ] Sucesso: Serviço aparece na tabela                                  │
│                                                                             │
│ Test 2: Editar Serviço                                                    │
│   1. Clique em "Editar" no serviço criado                                 │
│   2. Altere nome para "Teste Smoke v2"                                     │
│   3. Clique "Salvar"                                                       │
│   [ ] Sucesso: Nome atualizado na tabela                                  │
│                                                                             │
│ Test 3: Deletar Serviço                                                   │
│   1. Clique em "Deletar" no serviço                                        │
│   2. Confirme exclusão                                                     │
│   [ ] Sucesso: Serviço desaparece da tabela                               │
│                                                                             │
│ Test 4: Criar Profissional                                                 │
│   1. Acesse /clinica/base-sistema/profissionais                            │
│   2. Clique "+ Novo Profissional"                                          │
│   3. Preencha:                                                             │
│      - Nome: "Dr. Teste"                                                   │
│      - Email: "teste@example.com"                                          │
│      - Telefone: "11999999999"                                             │
│   4. Clique "Salvar"                                                       │
│   [ ] Sucesso: Profissional aparece na tabela                             │
│                                                                             │
│ Test 5: Validação Email                                                   │
│   1. Tente criar profissional com email inválido: "invalido"              │
│   2. Clique "Salvar"                                                       │
│   [ ] Sucesso: Erro "Email deve ser válido" aparece                      │
│                                                                             │
│ Test 6: Criar Relacionamento                                               │
│   1. Acesse /clinica/base-sistema/professional-services                    │
│   2. Clique "+ Novo"                                                       │
│   3. Selecione: Profissional = "Dr. Teste", Serviço = "Teste Smoke v2"   │
│   4. Clique "Salvar"                                                       │
│   [ ] Sucesso: Atribuição aparece na tabela                               │
│                                                                             │
│ Test 7: Prevenir Duplicata                                                 │
│   1. Tente criar mesmo relacionamento novamente                            │
│   2. Clique "Salvar"                                                       │
│   [ ] Sucesso: Erro "Essa combinação já existe" aparece                  │
│                                                                             │
│ Test 8: Responsividade                                                    │
│   1. Abra DevTools (F12)                                                   │
│   2. Clique ícone de dispositivo (mobile)                                  │
│   3. Selecione iPhone 12                                                   │
│   4. Recarregue página                                                     │
│   [ ] Sucesso: Layout adapta, botões funcionam                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

APROVAÇÃO FINAL

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│ QA Lead Sign-off: _______________________________   Data: ___/___/______   │
│                                                                             │
│ DevOps/Deploy Lead: _____________________________   Data: ___/___/______   │
│                                                                             │
│ Product Owner: __________________________________   Data: ___/___/______   │
│                                                                             │
│                                                                             │
│ ✅ APROVADO PARA DEPLOY EM PRODUÇÃO                                      │
│                                                                             │
│ Deploy realizado em: ___/___/______ às ___:___ (GMT-3)                    │
│                                                                             │
│ Deployed by: ____________________________                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

RECURSOS ÚTEIS

📖 Documentação:
  - README Técnico: 📖_BASE_SISTEMA_README_TECNICO.md
  - Guia de Uso: 📚_BASE_SISTEMA_GUIA_USO.md
  - API Docs: 📚_BASE_SISTEMA_API_DOCS.py
  - Troubleshooting: 📚_BASE_SISTEMA_TROUBLESHOOTING.md

🔗 Links:
  - Supabase Console: https://app.supabase.com
  - Sentry (error tracking): https://sentry.io
  - Datadog (monitoring): https://datadog.com
  - Slack channel: #base-do-sistema

📞 Contatos:
  - Tech Lead: [Nome + telefone]
  - DevOps: [Nome + telefone]
  - QA Lead: [Nome + telefone]
  - On-call: [Escalation]

═════════════════════════════════════════════════════════════════════════════════

Data de Criação: 15 de Janeiro de 2026
Versão: 1.0
Status: ✅ Pronto para Produção
