# ✅ Checklist de Produção - Pré-Deploy

## 🎯 Objetivo

Garantir que cada release está **pronta, segura e testada** antes de ir para produção.

**Tempo estimado**: 30-45 minutos

---

## 📋 Fase 1: Qualidade de Código (10 min)

```
□ Rodar linter
  npm run lint
  └─ Nenhum erro ou warning crítico

□ Verificar formatação
  npm run format:check
  └─ Sem problemas de formatação

□ Remover console.log
  grep -r "console\." src/ | grep -v "console.error\|console.warn"
  └─ Nenhum console.log deixado

□ Revisar commits
  git log develop..release/v1.0.0
  └─ Mensagens claras e descritivas

□ Revisar mudanças
  git diff develop..release/v1.0.0 --stat
  └─ Quantidade razoável de arquivos (não > 50)
```

---

## 🧪 Fase 2: Testes Automatizados (5 min)

```
□ Testes unitários
  npm run test
  └─ ✅ Todos passam (0 failures)

□ Cobertura de testes
  npm run test:coverage
  └─ > 70% de cobertura (mínimo)

□ Testes E2E (se houver)
  npm run test:e2e
  └─ ✅ Todos passam

□ Build produção
  npm run build
  └─ ✅ Sem erros
  └─ dist/ criado com ~2-5 MB (razoável)

□ Verificar bundle size
  npm run build -- --stats
  └─ Sem módulos desnecessários
  └─ Tamanho gzip < 500 KB (ideal)
```

---

## 🔒 Fase 3: Segurança (10 min)

```
□ RLS Policies
  Supabase Dashboard → Authentication → Policies
  └─ ✅ Todas as policies habilitadas
  └─ ✅ Sem políticas genéricas (sempre filtrar por clinic_id)

□ SQL Injection
  grep -r "SELECT\|INSERT\|UPDATE\|DELETE" src/lib/ | grep -v ".supabase"
  └─ Nenhuma query direta (usar RPC ou ORM)

□ Auth UID
  grep -r "user_id" src/ | grep -v "clinic_id\|professional_id"
  └─ Usar auth.uid() ao invés de user_id

□ Secrets/API Keys
  cat .env | grep -E "VITE_|SUPABASE"
  └─ ✅ Nenhuma key em código
  └─ ✅ Apenas em .env
  └─ ✅ .env não commitado (ver .gitignore)

□ CORS Headers
  Vercel → Project Settings → Functions
  └─ ✅ CORS configurado corretamente

□ Rate Limiting
  Supabase → Project Settings → API
  └─ ✅ Rate limiting ativo
```

---

## 📊 Fase 4: Funcionalidades Principais (15 min)

### Build de Produção

```bash
# Limpar e buildar
npm run clean:win  # Windows ou npm run clean
npm install
npm run build
npm run preview

# Abrir http://localhost:4173
```

### Testes Funcionais

```
AUTENTICAÇÃO
□ Login funciona
  └─ Email/senha válida → Dashboard
  └─ Email/senha inválida → Erro claro

□ Logout funciona
  └─ Clica logout → Página login
  └─ Não pode acessar dashboard sem login

□ Tokens
  └─ DevTools → Application → Cookies
  └─ Token presente
  └─ Expiration: futuro

AGENDA
□ Listar agendamentos
  └─ Carrega em < 3s
  └─ Mostra lista de agendamentos
  └─ Sem erro de RLS

□ Criar agendamento
  └─ Modal abre
  └─ Preencher dados
  └─ Salvar → Aparece na lista
  └─ Refresh página → Ainda está lá

□ Editar agendamento
  └─ Modal edição abre
  └─ Modificar dados
  └─ Salvar → Atualiza na lista

□ Deletar agendamento
  └─ Confirmar deleção
  └─ Remove da lista
  └─ Refresh → Confirmado deletado

□ Filtros funcionam
  └─ Filtrar por profissional
  └─ Filtrar por data
  └─ Filtrar por status

FINANCEIRO
□ AP Bills carregam
  └─ Listar bills em < 3s
  └─ Dados corretos
  └─ Sem erro de RLS

□ Invoices carregam
  └─ Listar invoices
  └─ Dados corretos

□ Fluxo de Caixa
  └─ Gráfico carrega
  └─ Dados fazem sentido
  └─ Sem erros

PACIENTES
□ Listar pacientes
  └─ Carrega lista
  └─ Busca funciona
  └─ Filtros funcionam

□ Detalhes paciente
  └─ Abre página detalhes
  └─ Mostra dados corretos
  └─ Sem erro de RLS

PERMISSÕES (Role-Based Access)
□ Plano Básico
  └─ ✅ Agenda
  └─ ✅ Pacientes
  └─ ✅ Faturamento
  └─ ❌ Estoque (bloqueado)
  └─ ❌ Financeiro (bloqueado)

□ Plano Profissional
  └─ ✅ Tudo do Básico
  └─ ✅ Estoque
  └─ ✅ Financeiro
  └─ ✅ Convênios
  └─ ❌ Multiunidades (bloqueado)

□ Plano Enterprise
  └─ ✅ Tudo
  └─ ✅ Multiunidades
  └─ ✅ Seguradoras
  └─ ✅ Repasse Médico
```

### Performance

```
□ Lazy Loading
  DevTools → Network
  └─ Chunks carregam sob demanda
  └─ Primeira página < 2s
  └─ Navegação entre módulos < 1s

□ Cache
  DevTools → Network → Disable cache
  └─ Primeira vez: ~3s
  └─ Com cache: ~500ms

□ Database
  Supabase Studio → SQL Editor
  └─ SELECT COUNT(*) FROM appointments
  └─ Query rápida (< 100ms)

□ API Calls
  DevTools → Network
  └─ Requisições em paralelo (não sequencial)
  └─ Tempo resposta < 500ms
  └─ Nenhuma requisição falhando
```

---

## 🔐 Fase 5: RLS & Dados (10 min)

### Isolamento de Dados

```
□ Usuário A não vê dados de Usuário B
  1. Login com clínica A
  2. Anotar ID de agendamento
  3. Logout
  4. Login com clínica B
  5. Verificar que agendamento A não aparece

□ Profissional só vê seus agendamentos
  1. Login como profissional A
  2. Deve ver apenas agendamentos do prof A
  3. Não deve ver agendamentos de prof B

□ RLS sem bypass
  DevTools → Network → Supabase calls
  └─ Authorization header presente
  └─ User ID no token
  └─ Sem "Prefer: bypass-rls"
```

### Verificação de RLS

```sql
-- Supabase Studio → SQL Editor
-- Verificar que policies existem:

SELECT * FROM pg_catalog.pg_policies 
WHERE tablename = 'appointments';

-- Deve retornar policies para:
-- - SELECT (filtrar por clinic_id)
-- - INSERT (validar clinic_id)
-- - UPDATE (validar propriedade)
-- - DELETE (validar propriedade)
```

---

## 📦 Fase 6: Versionamento & Documentação (5 min)

```
□ package.json atualizado
  grep "version" package.json
  └─ Versão = v1.0.0 (match com tag)

□ CHANGELOG.md atualizado
  head -30 CHANGELOG.md
  └─ Seção [1.0.0] existir
  └─ Listar todas as mudanças
  └─ Data de release correta

□ README.md atualizado
  head -50 README.md
  └─ Versão atual mencionada
  └─ Breaking changes documentados

□ API docs atualizadas
  docs/ ou /api-docs
  └─ Novo endpoint documentado (se houver)
  └─ Mudanças no endpoint listadas (se houver)

□ Git tags
  git tag -l | grep v1
  └─ Tag v1.0.0 existir
  └─ git show v1.0.0
  └─ Anotação presente
```

---

## 🗄️ Fase 7: Database & Migrations (5 min)

```
□ Migrations aplicadas
  Supabase Studio → SQL Editor
  └─ Rodar: SELECT * FROM _schema_migrations
  └─ Todas as migrations esperadas presentes

□ Tables estrutura
  Supabase Studio → Table Editor
  └─ Todas as tabelas presentes
  └─ Colunas corretas
  └─ Types corretos

□ Triggers funcionam
  Supabase Studio → Webhooks & Triggers
  └─ Todos os triggers listados
  └─ Habilitados (toggle ON)
  └─ Teste trigger → Funciona

□ Functions funcionam
  Supabase Studio → SQL Editor
  └─ SELECT * FROM _functions
  └─ Todas as funções listadas
  └─ Testar uma: SELECT * FROM sua_funcao()

□ Backups recentes
  Supabase → Backups
  └─ Último backup: hoje ou ontem
  └─ Tamanho: razoável
```

---

## 🌍 Fase 8: Environment & Deployment (5 min)

```
□ Environment Production
  Vercel → Deployments → Settings
  └─ VITE_SUPABASE_URL (prod)
  └─ VITE_SUPABASE_ANON_KEY (prod)
  └─ VITE_STRIPE_PUBLIC_KEY (prod)
  └─ Sem dados de staging/dev

□ Environment Staging
  Vercel → Preview Deployments → Settings
  └─ VITE_SUPABASE_URL (staging)
  └─ VITE_SUPABASE_ANON_KEY (staging)
  └─ Diferente de production

□ GitHub Actions
  .github/workflows/
  └─ Deploy workflow existir
  └─ Trigger em push main
  └─ Sucesso no último run

□ Vercel Deployment
  vercel.com → seu-projeto
  └─ Último deployment sucesso
  └─ Status: Ready (verde)
  └─ Build time < 5 min
```

---

## 🔗 Fase 9: Integração Stripe (se aplicável) - 5 min

```
□ Stripe Keys
  .env
  └─ VITE_STRIPE_PUBLIC_KEY = pk_test_... (não é Secret Key)
  └─ Não commitado (verificar .gitignore)

□ Checkout funciona
  npm run preview
  http://localhost:4173/checkout
  └─ Planos carregam
  └─ Preços corretos (R$99, R$249, R$489)
  └─ Clicar em plano → Redirecionado para Stripe
  └─ Modal de confirmação de Stripe aparece

□ Webhooks
  Stripe Dashboard → Webhooks
  └─ Endpoint configurado
  └─ Eventos: payment_intent.succeeded
  └─ Último evento: sucesso

□ Customer
  Stripe Dashboard → Customers
  └─ Clinica como customer
  └─ Subscription ativa
  └─ Plano correto
```

---

## 📋 Fase 10: Infraestrutura & Monitoring (5 min)

```
□ Supabase Status
  supabase.com/status
  └─ Nenhum incident ativo
  └─ Todos os serviços: Operational

□ Vercel Status
  vercel.com/status
  └─ Nenhum incident ativo

□ Monitoring
  Vercel → Analytics
  └─ Sem picos anormais de erro
  └─ Performance gráfico normal

□ Alertas configurados
  Vercel → Settings → Notifications
  └─ Build failed → Email
  └─ Deploy error → Email
  └─ High error rate → Email
```

---

## ✅ Fase 11: Aprovação Final

```
□ Responsável técnico aprova
  ✍️ [  ] Por: ________________  Data: ________

□ Responsável negócio aprova
  ✍️ [  ] Por: ________________  Data: ________

□ Nenhum bloqueante crítico
  □ Sim, tudo OK → Prosseguir com deploy
  □ Não, problemas → Voltar à correção
```

---

## 🚀 Conclusão

Se ✅ todos os checkboxes estão marcados:

```
✅ APROVADO PARA PRODUÇÃO

Próximo: Execute 🚀_RELEASE_PRODUCAO.md
Passo 10: Deploy Vercel será automático
```

Se ❌ algum checkbox não passou:

```
❌ NÃO APROVADO

Voltar e corrigir o problema
Pode reexecutar este checklist depois
```

---

## 📊 Resumo Rápido

| Fase | Tempo | Status |
|------|-------|--------|
| 1. Qualidade | 10 min | ⬜ |
| 2. Testes | 5 min | ⬜ |
| 3. Segurança | 10 min | ⬜ |
| 4. Funcionalidades | 15 min | ⬜ |
| 5. RLS & Dados | 10 min | ⬜ |
| 6. Versioning | 5 min | ⬜ |
| 7. Database | 5 min | ⬜ |
| 8. Deployment | 5 min | ⬜ |
| 9. Stripe | 5 min | ⬜ |
| 10. Infraestrutura | 5 min | ⬜ |
| 11. Aprovação | 5 min | ⬜ |
| **TOTAL** | **75 min** | ⬜ |

---

## 🔗 Próximos Documentos

- 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Branches
- 🔢 [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md) - Versionamento
- 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup local
- 🚀 [RELEASE_PRODUCAO.md](🚀_RELEASE_PRODUCAO.md) - Deploy produção
- 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
- ↩️ [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md) - Recuperação
