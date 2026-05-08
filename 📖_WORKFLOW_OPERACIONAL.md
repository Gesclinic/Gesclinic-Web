# 📖 Workflow Operacional Completo - Guia Executivo

## 🎯 Objetivo

Este documento orienta **toda a operação de desenvolvimento, teste e produção** do Gesclinic Web de forma profissional e segura.

---

## 📊 Arquitetura de Ambientes

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  DESENVOLVIMENTO         HOMOLOGAÇÃO       PRODUÇÃO       │
│  ─────────────          ─────────         ────────        │
│                                                            │
│  Local Dev              Staging            Production      │
│  npm run dev            vercel preview      vercel prod    │
│  localhost:3000         develop branch      main branch    │
│  Supabase DEV           Supabase DEV        Supabase PROD  │
│  Stripe Teste           Stripe Teste        Stripe Live    │
│  RLS Testada            RLS Testada         RLS Ativa      │
│                                                            │
│  Infraestrutura:                                           │
│  • GitHub (source)      • GitHub (source)  • GitHub (src) │
│  • Vercel Preview       • Vercel Preview   • Vercel Prod  │
│  • Supabase Dev DB      • Supabase Dev DB  • Supabase     │
│                                                            │
│  Deploy Trigger:        Deploy Trigger:    Deploy:        │
│  Manual (local)         Push develop       Push main/tag  │
│                         Auto webhook       Auto webhook   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Ciclo Completo: Do Conceito à Produção

### Fase 1: Planejamento (Dia 0)

```
1. Issue criada no GitHub
   ├─ Descrição clara
   ├─ Critério de aceitação
   └─ Labels: feature, bug, hotfix

2. Planejamento no Sprint (se usar agile)
   ├─ Story points
   ├─ Prioridade
   └─ Assignee

3. Comunicar ao time
   └─ "Nova feature: Relatório XYZ"
```

### Fase 2: Desenvolvimento (Dias 1-3)

```
1. Criar feature branch
   git checkout -b feature/relatorio-xyz

2. Desenvolvimento
   └─ Código, commits regulares, push diário

3. Testes locais
   ├─ npm run test
   ├─ npm run lint
   ├─ DevTools F12
   └─ RLS testing

4. Comunicar progresso
   └─ "70% concluído"
```

### Fase 3: Code Review (Dia 4)

```
1. Push final
   git push origin feature/relatorio-xyz

2. Criar Pull Request
   ├─ Base: develop
   ├─ Compare: feature/relatorio-xyz
   ├─ Descrição detalhada
   └─ Link para issue #123

3. Aguardar revisão
   ├─ Revisor(a) verifica código
   ├─ Testes correm automaticamente
   └─ Comentários/sugestões

4. Implementar feedback
   ├─ Ajustar código
   ├─ Novo commit
   └─ Push novamente

5. Aprovação
   └─ Revisor(a) clica "Approve"
```

### Fase 4: Staging/Homologação (Dia 5)

```
1. Merge em develop
   ├─ GitHub: Squash and merge
   └─ Feature branch deletada

2. Vercel automático
   ├─ Deploy em develop branch
   ├─ URL: https://develop.gesclinic.vercel.app
   └─ Pronto em 2-5 min

3. Testes em Staging
   ├─ QA testa a feature
   ├─ Testar com dados reais
   ├─ Compatibilidade
   └─ Performance

4. Feedback
   ├─ Se OK: "Aprovado para produção"
   ├─ Se não: "Volta para revisão"
   └─ Volta à feature branch
```

### Fase 5: Release (Dia 6)

```
1. Acumular features
   └─ Múltiplas features em develop

2. Criar release branch
   git checkout -b release/v1.1.0

3. Atualizar versionamento
   ├─ npm version minor
   ├─ Atualizar CHANGELOG.md
   └─ Commit

4. PR para main
   ├─ Base: main
   ├─ Compare: release/v1.1.0
   └─ Review final

5. Code review de release
   ├─ Checklist completo
   ├─ Testes finais
   └─ Aprovação
```

### Fase 6: Produção (Dia 7)

```
1. Merge em main
   ├─ GitHub: Squash or merge
   └─ Release branch deletada

2. Criar tag
   ├─ git tag -a v1.1.0 -m "Release v1.1.0"
   └─ git push origin v1.1.0

3. Vercel automático
   ├─ Deploy em main branch
   ├─ URL: https://gesclinic.vercel.app (PRODUÇÃO)
   └─ Pronto em 2-5 min

4. Validação pós-deploy
   ├─ Testes críticos
   ├─ Verificar RLS
   ├─ Monitorar por 30 min
   └─ Alertar time

5. Comunicação
   └─ "v1.1.0 em produção!"
```

### Fase 7: Suporte (Contínuo)

```
1. Monitorar erros
   ├─ Vercel Analytics
   ├─ Supabase Logs
   └─ Cliente reports

2. Hotfixes rápidos (se necessário)
   ├─ git checkout main
   ├─ git checkout -b hotfix/v1.1.1-descricao
   ├─ Corrigir problema
   ├─ npm version patch
   ├─ Merge em main + develop
   └─ Deploy automático

3. Post-mortem
   └─ Aprender com problemas
```

---

## 🌳 Estrutura de Branches Esperada

```bash
# Em qualquer momento, deve ter:

git branch -a

# Esperado:
  develop                              # ← Base para features
* feature/relatorio-xyz                # ← Trabalho ativo
  feature/outra-feature                # ← Outro dev
  hotfix/v1.0.1-seguranca              # ← Correção urgente
  remotes/origin/main                  # ← Produção
  remotes/origin/develop               # ← Homologação
  remotes/origin/feature/relatorio-xyz
  remotes/origin/feature/outra-feature
```

---

## 📈 Estados do Repositório

### Estado Ideal

```
main branch
  ├─ Sempre em produção
  ├─ Última tag: v1.0.0
  ├─ Sem PRs pendentes
  └─ Verificado e testado

develop branch
  ├─ Pronto para próximo release
  ├─ Todas features testadas
  ├─ 1-2 PRs em review
  ├─ Deploy automático
  └─ Pronto para clientes testarem

feature/* branches
  ├─ Cada feature em sua branch
  ├─ 1-3 features simultâneas
  ├─ Atualizadas com develop
  └─ PRs abertas
```

### Estado de Alerta

```
❌ main com bug em produção
   → Hotfix imediato!

❌ develop com conflitos não resolvidos
   → Resolve antes de mais PRs

❌ Feature branch com 100+ commits
   → Squash ou rebase

❌ PR aberta há > 3 dias sem review
   → Chamar revisor

❌ Commit sem mensagem descritiva
   → Será recusado em review

❌ Código com console.log
   → Será recusado em review

❌ Build falhando
   → Não faz deploy
```

---

## 📋 Responsabilidades por Papel

### 👨‍💻 Desenvolvedor

```
✅ Criar branch com nome descritivo
✅ Fazer commits regulares
✅ Passar em testes locais
✅ Sem console.log
✅ Código formatado
✅ Criar PR descritiva
✅ Responder comentários de review
✅ Mergeá depois de aprovação
✅ Acompanhar em staging
✅ Comunicar problemas
```

### 👨‍🔬 Code Reviewer

```
✅ Revisar PR em < 24h
✅ Verificar lógica
✅ Verificar RLS
✅ Verificar performance
✅ Sugerir melhorias
✅ Aprovar se OK
✅ Rejeitar se não OK
✅ Confirmar merge
✅ Deletar branch
```

### 👨‍🔧 Tech Lead / DevOps

```
✅ Monitorar pipelines
✅ Gerenciar releases
✅ Hotfixes urgentes
✅ Rollback se necessário
✅ Comunicações ao cliente
✅ Backups
✅ Segurança
✅ Performance
✅ Escalabilidade
```

### 👨‍🧪 QA / Tester

```
✅ Testar em staging
✅ Verificar critério aceitação
✅ Testar casos extremos
✅ Testar em diferentes navegadores
✅ Testar performance
✅ Testar RLS/segurança
✅ Aprovar para produção
✅ Testar em produção após deploy
✅ Reportar bugs
```

---

## 🔐 Checklist de Segurança por Fase

### Desenvolvimento
```
□ Sem hardcoded secrets
□ Sem SQL injection
□ Sem XSS vulnerabilities
□ Validação de input
□ Authentication checks
□ RLS testado
```

### Code Review
```
□ Revisor verifica segurança
□ Sem console.log
□ Código legível
□ Sem mudanças desnecessárias
□ Performance OK
□ Testes adicionados
```

### Staging
```
□ QA testa completo
□ Sem bugs óbvios
□ RLS funcionando
□ Performance OK
□ Compatibilidade OK
□ Pronto para produção
```

### Produção
```
□ Monitorar 30 min
□ Alertas configurados
□ Rollback planejado
□ Backup recente
□ No incidents
□ Cliente informado
```

---

## ⏱️ SLAs (Tempos de Resposta)

```
CODE REVIEW
Code review iniciado: < 4 horas após PR
Code review completo: < 24 horas
Feedback do revisor: < 2 horas

DEPLOYMENT
Deploy staging: < 5 minutos (automático)
Deploy produção: < 5 minutos (automático)
Validação pós-deploy: < 15 minutos

HOTFIX
Descoberta: Real-time
Análise: < 30 min
Deploy: < 1 hora

BUG REPORT
Critical (produção fora): < 1 hora fix + deploy
High (feature não funciona): < 24 horas
Medium (feature com problema): < 3 dias
Low (minor bug): < 1 semana
```

---

## 📊 Dashboard de Status

Verificar regularmente:

```
GITHUB
├─ Open PRs: deve ter 1-3
├─ PR age: max 2 dias
├─ Branch protection: ativo
└─ CI/CD: green

VERCEL
├─ Production deployment: last 2 hours OK
├─ Staging deployment: last deployment OK
├─ Error rate: < 1%
└─ Performance: OK

SUPABASE
├─ Database: online
├─ Auth: online
├─ Backups: recente
└─ Performance: OK

STRIPE (se aplicável)
├─ No errors: últimas 24h
├─ Charges: OK
└─ Webhooks: entregues
```

---

## 🚨 Procedimento de Emergência

### Se Produção Cair

```
T+0 min
 1. Detectar problema
 2. Abrir sala de crise (Slack)
 3. Ativar pessoas chave

T+5 min
 1. Investigar rapidamente
 2. Decidir: Rollback ou Fix?
 3. Se rollback: Vercel → Rollback
 4. Se fix: hotfix rápido

T+10 min
 1. Aplicar solução
 2. Validar que funciona
 3. Comunicar status

T+15 min
 1. Todos os sistemas OK
 2. Comunicar ao cliente
 3. Criar incident report

T+1 hora
 1. Post-mortem inicial
 2. Ações preventivas
 3. Documentação

T+24 horas
 1. Post-mortem completo
 2. Implementar ações
 3. Compartilhar aprendizado
```

---

## 📞 Escalação

```
Nível 1: Tech Lead (< 2 horas)
Nível 2: CTO (< 30 min se Nível 1 não responde)
Nível 3: CEO (crítico, produção fora)

Contatos:
Tech Lead: [telefone]
CTO: [telefone]
DevOps: [Slack]

On-call: [Escala de pager]
```

---

## 📚 Documentação Relacionada

Todos os documentos:

1. 📌 [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) - Estratégia de branches
2. 🔢 [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md) - Versionamento
3. 🛠️ [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md) - Setup local
4. 🚀 [RELEASE_PRODUCAO.md](🚀_RELEASE_PRODUCAO.md) - Deploy em produção
5. ✅ [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md) - Antes de deployar
6. 🔧 [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md) - Copy/Paste
7. ↩️ [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md) - Recuperação rápida
8. 📖 [WORKFLOW_OPERACIONAL.md](📖_WORKFLOW_OPERACIONAL.md) - Este documento

---

## 🎯 Quick Links por Situação

### "Preciso começar a trabalhar"
→ Ler [DESENVOLVIMENTO_LOCAL.md](🛠️_DESENVOLVIMENTO_LOCAL.md)

### "Como fazer um commit?"
→ Ler [COMANDOS_GIT_PRONTOS.md](🔧_COMANDOS_GIT_PRONTOS.md)

### "Vou criar uma nova feature"
→ Ler [GIT_FLOW.md](🔄_GIT_FLOW_ESTRATEGIA.md) seção "Novo Desenvolvimento"

### "Como fazer release?"
→ Ler [RELEASE_PRODUCAO.md](🚀_RELEASE_PRODUCAO.md)

### "Antes de deployar para produção"
→ Usar [CHECKLIST_PRODUCAO.md](✅_CHECKLIST_PRODUCAO.md)

### "Erramos e preciso reverter!"
→ Ler [ROLLBACK_GUIDE.md](↩️_ROLLBACK_GUIDE.md)

### "Como numerar versões?"
→ Ler [SEMANTIC_VERSIONING.md](🔢_SEMANTIC_VERSIONING.md)

---

## 🏆 Métricas de Sucesso

Monitorar regularmente:

```
QUALIDADE
├─ Bugs em produção: 0 por semana (ideal)
├─ Tempo build: < 5 min
├─ Test coverage: > 80%
└─ Code review turnaround: < 24h

VELOCIDADE
├─ Features por sprint: 5-8
├─ Deploy frequency: 1-3 por dia
├─ Lead time: < 5 dias
└─ MTTR (tempo recuperação): < 1 hora

SEGURANÇA
├─ Security issues: 0
├─ RLS violations: 0
├─ Data breaches: 0
└─ Compliance: 100%

SATISFAÇÃO
├─ Customer feedback: positivo
├─ Uptime: 99.9%
├─ Team satisfaction: > 8/10
└─ Incident frequency: decrescente
```

---

## 🎉 Conclusão

Este workflow profissional garante:

✅ **Código de qualidade** com code review obrigatório
✅ **Segurança** com RLS testada e checklist
✅ **Velocidade** com deploy automático
✅ **Confiabilidade** com staging antes de produção
✅ **Recuperação** com rollback rápido
✅ **Aprendizado** com post-mortems
✅ **Documentação** clara para todo time

**O resultado**: Um sistema em produção robusto, seguro e confiável!

---

## 📝 Histórico de Atualizações

```
2026-05-07: Versão inicial criada
2026-05-10: Adicionado procedimento emergência
2026-05-15: Atualizado SLAs
```

---

## 🔗 Versão Resumida (1 página)

Para imprimir e colar na parede do escritório:

```
GESCLINIC WEB - WORKFLOW RÁPIDO

Feature:
1. git checkout -b feature/nome
2. Trabalhar + commits
3. git push + PR para develop
4. Code review (< 24h)
5. Merge em develop
6. QA testa (staging)
7. Aprovação

Release:
1. git checkout -b release/v1.0.0
2. npm version minor
3. PR para main + merge
4. git tag -a v1.0.0
5. Vercel deploy automático
6. ✅ Produção!

Hotfix:
1. git checkout -b hotfix/v1.0.1-fix
2. npm version patch
3. Merge main + develop
4. ✅ 30 min

Rollback:
1. https://vercel.com → Deployments
2. 3 dots → Rollback
3. ✅ 2 min
```
