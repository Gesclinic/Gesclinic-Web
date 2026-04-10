# ⚡ RESUMO EXECUTIVO - O MÍNIMO QUE VOCÊ PRECISA SABER

**Data:** 18 de Janeiro de 2026  
**Leitura:** 3 minutos  
**Ação:** Comece pela Etapa 1 do Roadmap

---

## 🎯 O PROBLEMA

```
Atualmente:
  ❌ Serviços SEM código TUSS → XML rejeita
  ❌ Profissionais SEM CBO → XML inválido
  ❌ Convênios SEM código ANS → Faturamento falha
  ❌ Sem relações entre cadastros → Dados inconsistentes
  ❌ Agenda não valida nada → Erros cascata

Resultado:
  🔴 Não pode faturar via XML TISS
  🔴 Sistema pronto para 70%, faltam 30% críticos
```

---

## ✅ A SOLUÇÃO (Sequência)

```
PASSO 1: CAMPO TUSS EM SERVIÇOS (5 min)
├─ Adicionar: codigo_tuss VARCHAR(10) [OBRIGATÓRIO para XML]
├─ Exemplo: "010101" (6 dígitos)
├─ Impacto: Sem isso, XML é rejeitado
└─ Status: Crítico ★★★★★

PASSO 2: CBO EM PROFISSIONAIS (5 min)
├─ Adicionar: cbo VARCHAR(10) [OBRIGATÓRIO para XML]
├─ Exemplo: "225101" (Médico)
├─ Impacto: Sem isso, XML é inválido
└─ Status: Crítico ★★★★★

PASSO 3: ANS EM CONVÊNIOS (5 min)
├─ Adicionar: codigo_ans VARCHAR(5) [OBRIGATÓRIO para faturamento]
├─ Exemplo: "00123"
├─ Impacto: Sem isso, convênio não funciona
└─ Status: Crítico ★★★★★

PASSO 4: RELAÇÕES (15 min)
├─ Criar: professional_services (quem faz o quê)
├─ Criar: professional_payers (quem cobra onde)
├─ Criar: service_prices (quanto custa em cada convênio)
├─ Impacto: Agenda validada, repasse correto
└─ Status: Crítico ★★★★★

PASSO 5: SALAS (5 min)
├─ Criar: rooms (consultórios, salas de exame)
├─ Impacto: Agenda com local definido
└─ Status: Importante ★★★☆☆

RESULTADO:
  ✅ Serviços com TUSS
  ✅ Profissionais com CBO
  ✅ Convênios com ANS
  ✅ Relações validadas
  ✅ Pronto para XML TISS
  ✅ Pronto para faturamento
```

---

## 📊 TABELA: O QUE CADA CADASTRO PRECISA

| Cadastro | Campo Obrigatório | Tipo | Por Quê | Valor Exemplo |
|----------|-------------------|------|--------|---------------|
| **Serviço** | codigo_tuss | TEXT | XML precisa | "010101" |
| **Serviço** | tipo_guia | ENUM | Qual guia | "consulta" |
| **Profissional** | cbo | TEXT | XML precisa | "225101" |
| **Profissional** | conselho | TEXT | XML precisa | "CRM" |
| **Profissional** | numero_conselho | TEXT | XML precisa | "12345/SP" |
| **Convênio** | codigo_ans | TEXT | XML precisa | "00123" |
| **Convênio** | cnpj | TEXT | XML precisa | "12.345.678/0001-90" |
| **Convênio** | versao_tiss | TEXT | XML precisa | "3.02.00" |
| **Paciente** | document_id (CPF) | TEXT | XML precisa | "123.456.789-10" |
| **Clínica** | cnpj | TEXT | XML precisa | "98.765.432/0001-10" |

---

## 🔗 AS RELAÇÕES QUE FALTAM

```
┌─────────────────────────────────────────────┐
│  3 RELAÇÕES CRÍTICAS PARA IMPLEMENTAR       │
└─────────────────────────────────────────────┘

1️⃣ professional_services
   ├─ PERGUNTA: "Profissional X pode fazer Serviço Y?"
   ├─ SOLUÇÃO: Tabela de relacionamento
   ├─ IMPACTO: Agenda só permite serviços que profissional faz
   └─ TABELA:
        professional_id → profissional
        service_id → serviço
        valor_especifico (opcional)
        tempo_especifico (opcional)

2️⃣ professional_payers
   ├─ PERGUNTA: "Profissional X cobra no Convênio Y? Quanto?"
   ├─ SOLUÇÃO: Tabela com percentual de repasse
   ├─ IMPACTO: Repasse calculado corretamente
   └─ TABELA:
        professional_id → profissional
        payer_id → convênio
        percentual_repasse (30%, por exemplo)

3️⃣ service_prices
   ├─ PERGUNTA: "Quanto o Convênio Y paga pelo Serviço X?"
   ├─ SOLUÇÃO: Tabela de valores negociados
   ├─ IMPACTO: Fatura com valor correto, sem glosa
   └─ TABELA:
        service_id → serviço
        payer_id → convênio
        valor_negociado (R$ 120, por exemplo)
        percentual_coparticipacao (20%, por exemplo)
```

---

## 🎬 COMO EXECUTAR (Resumido)

```
PASSO A PASSO RÁPIDO:

1. Supabase → SQL Editor
   └─ Cole SCRIPT 1 (adiciona campos)
   └─ Execute
   └─ Tempo: 30 segundos

2. Supabase → SQL Editor
   └─ Cole SCRIPT 2 (cria tabelas)
   └─ Execute
   └─ Tempo: 20 segundos

3. VS Code → src/lib/
   └─ Crie servicesApi.js
   └─ Crie professionalsApi.js (atualizar)
   └─ Crie servicePricesApi.js
   └─ Crie professional_services api
   └─ Crie professional_payers api
   └─ Tempo: 1 hora

4. VS Code → src/pages/clinica/cadastros/
   └─ Crie ServicosCatalogo.jsx
   └─ Crie ProfissionaisCadastro.jsx
   └─ Crie ConveniosCadastro.jsx
   └─ Crie SalasCadastro.jsx
   └─ Crie ConfiguracaoPrices.jsx
   └─ Tempo: 2-3 horas

5. Teste
   └─ Crie serviço COM codigo_tuss
   └─ Crie profissional COM cbo
   └─ Crie convênio COM codigo_ans
   └─ Vincule profissional com serviço
   └─ Vincule profissional com convênio
   └─ Defina preço
   └─ Agora: Agenda validada, pode faturar
   └─ Tempo: 30 minutos

TEMPO TOTAL: 6-8 horas
```

---

## ⚠️ O QUE NÃO FAZER

```
❌ Não ignore os campos obrigatórios
   → Isso causa glosa (rejeição do faturamento)

❌ Não hardcode valores
   → Use service_prices (tabela de preços)

❌ Não permita agenda sem validação
   → Sempre validar professional_services

❌ Não misture dados de convênios
   → Cada convênio tem seus próprios valores

❌ Não esqueça de testar
   → Gere 1 guia XML, valide com ANS antes de usar
```

---

## 🎯 RESULTADO ESPERADO

Após implementar:

```
✅ Serviços têm código TUSS → XML válido
✅ Profissionais têm CBO → XML válido
✅ Convênios têm ANS → Faturamento funciona
✅ Agenda valida profissional × serviço × convênio
✅ Preços corretos por convênio
✅ Repasse calculado automaticamente
✅ Zero glosas por dados faltantes
✅ Pronto para gerar guias TISS
✅ Pronto para enviar para ANS
✅ Pronto para produção
```

---

## 📖 LEIA DEPOIS (Ordem)

1. **Este arquivo** ← Você está aqui (3 min)
2. `🎯_GUIDE_CADASTROS_ESTRUTURA_TISS.md` (15 min) ← Entender tudo
3. `📋_QUICK_REFERENCE_CAMPOS_OBRIGATORIOS.md` (5 min) ← Tabelas de referência
4. `🔧_IMPLEMENTACAO_SQL_MIGRACAO.md` (executar no Supabase)
5. `🚀_ROADMAP_VISUAL_IMPLEMENTACAO.md` (etapas de implementação)

---

## 💡 DICA FINAL

> **"Base do Sistema é o núcleo. Sem estrutura, agenda quebra, faturamento falha, XML é rejeitado."**

Então:
- ✅ Comece pela Base do Sistema (este guia)
- ✅ Execute migrações SQL primeiro
- ✅ Depois crie APIs e componentes
- ✅ Finalmente teste integração com Agenda

**Resultado: Sistema 100% estruturado para XML TISS em 6-8 horas.**

---

## ⚡ PRÓXIMO PASSO

```
👉 Abra: 🎯_GUIDE_CADASTROS_ESTRUTURA_TISS.md
   └─ Leia seção "SEQUÊNCIA LÓGICA PARA IMPLEMENTAÇÃO"
   └─ Entenda a hierarquia de dependências
   └─ Comece a Etapa 1 do Roadmap

👉 Após: Abra Supabase e execute os scripts SQL
   └─ SCRIPT 1: Campos faltantes
   └─ SCRIPT 2: Tabelas faltantes
   └─ SCRIPT 3: Índices

👉 Depois: Crie componentes React seguindo o Roadmap

PRONTO!
```

---

**STATUS:** ✅ PRONTO PARA IMPLEMENTAR  
**DATA:** 18/01/2026  
**TEMPO:** 6-8 horas até sistema completo  
**RESPONSÁVEL:** Você + este guia
