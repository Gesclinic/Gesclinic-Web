# 📋 NOVA ESTRUTURA TRIBUTÁRIA - COMEÇAR DO ZERO

**Status:** 🔴 Em Planejamento  
**Data:** 21/05/2026

---

## 🎯 OBJETIVO CORRETO

Implementar estrutura de tributação que reflete:
- **Equiparação Hospitalar** (já existe) - Reduz base de cálculo IRP/CSLL para clínicas certificadas
- **Equiparação ISS** (novo) - Tributação de SERVIÇOS específicos por ISS em vez de PIS/COFINS federais
- **TI vs TIRF** - Tipo de retenção na fonte por convênio
- **Categorias de Serviços (Anexo 2)** - Lei 13.985/2020 define serviços equipáveis

---

## 🏗️ ARQUITETURA PROPOSTA

### 1️⃣ ABA "EQUIPARAÇÃO" (Novo em Convênios)

**Objetivo:** Informar QUAIS categorias de serviços (Anexo 2) estão equipáveis

```
┌─────────────────────────────────────────────────┐
│ ⚖️ EQUIPARAÇÃO - CATEGORIAS (Anexo 2)          │
├─────────────────────────────────────────────────┤
│ Este convênio trabalha com quais categorias     │
│ de serviços equipáveis (Lei 13.985/2020)?      │
│                                                  │
│ ☐ 01 - Consultoria técnica, administrativo    │
│ ☐ 02 - Pesquisa e desenvolvimento             │
│ ☐ 03 - Análise de dados e programação         │
│ ☐ 04 - Serviços de TI e telecomunicações      │
│ ☐ 05 - Educação profissional (não-acadêmica)  │
│ ☐ 06 - Auditoria e consultoria contábil       │
│ ☐ 07 - Assessoria técnica especializada       │
│ ☐ 08 - Pesquisa clínica/científica            │
│ ☐ 09 - Análise laboratorial especializada     │
│ ☐ 10 - Consultoria em saúde ocupacional       │
│                                                  │
│ Marque as categorias que se enquadram em       │
│ equiparação para este convênio                 │
└─────────────────────────────────────────────────┘
```

### 2️⃣ ABA "TRIBUTOS" (Reformulada)

**Objetivo:** Informar TI/TIRF e percentuais por categoria

```
┌──────────────────────────────────────────────────┐
│ 💰 TRIBUTOS - TIPO E RETENÇÃO                   │
├──────────────────────────────────────────────────┤
│                                                   │
│ TIPO DE TRIBUTAÇÃO:                             │
│ ◯ TI  (Tributação Integrada)                    │
│ ◯ TIRF (Tributação Integrada + Retenção Fonte) │
│                                                   │
│ PERCENTUAIS POR CATEGORIA:                      │
│ ┌──────────────────────┬────────────┬─────────┐ │
│ │ Categoria            │ Base       │ % Total │ │
│ ├──────────────────────┼────────────┼─────────┤ │
│ │ Consultoria          │ 100%       │ 11.7%   │ │
│ │ TI                   │ 100%       │ 11.7%   │ │
│ │ Pesquisa             │ 100%       │ 11.7%   │ │
│ │ Outras não equip.    │ 100%       │ 18-20%  │ │
│ │ Equiparadas ISS      │ 100%       │ 5.5%    │ │
│ └──────────────────────┴────────────┴─────────┘ │
│                                                   │
│ 📌 Os percentuais variam por categoria          │
│    e tipo de retenção (TI vs TIRF)             │
└──────────────────────────────────────────────────┘
```

### 3️⃣ TABELA DE PREÇOS (Atualizada)

**Mostrar:** Categoria + Tipo de Retenção + Tributação

```
┌─────┬──────────┬────────────┬─────────┬──────────┬──────────┐
│ TUS │ Serviço  │ Convênio   │ Plano   │Categoria │Tributação│
├─────┼──────────┼────────────┼─────────┼──────────┼──────────┤
│ 123 │ Consulta │ Plan Saúde │ Gold    │ Médica   │ISSQN 5%  │
│ 456 │ Teste TI │ Plan Saúde │ Gold    │ TI       │ISS 2%    │
│ 789 │ Análise  │ Plan Saúde │ Silver  │ Pesquisa │ISS 2%    │
└─────┴──────────┴────────────┴─────────┴──────────┴──────────┘
```

---

## 📊 BANCO DE DADOS

### Tabelas Necessárias

```
┌─────────────────────────────────────────────────┐
│ 1. NEW: equipacao_categorias_anexo2             │
├─────────────────────────────────────────────────┤
│ • id (UUID PK)                                   │
│ • code (TEXT) - "01", "02", etc                 │
│ • nome (TEXT) - "Consultoria técnica"           │
│ • descricao (TEXT)                              │
│ • legislacao (TEXT) - "Lei 13.985/2020"         │
│ • created_at                                     │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 2. NEW: health_insurance_equipacao              │
├─────────────────────────────────────────────────┤
│ • id (UUID PK)                                   │
│ • health_insurance_id (UUID FK)                 │
│ • categoria_id (UUID FK → equipacao_categorias) │
│ • tipo_tributacao ('TI'|'TIRF')                 │
│ • percentual_pis (DECIMAL)                      │
│ • percentual_cofins (DECIMAL)                   │
│ • percentual_total (DECIMAL computed)           │
│ • created_at / updated_at                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 3. UPDATE: services                             │
├─────────────────────────────────────────────────┤
│ ADD:                                             │
│ • service_category_anexo2_id (UUID FK)          │
│ • eh_equiparavel (BOOLEAN DEFAULT FALSE)        │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 4. UPDATE: service_prices                       │
├─────────────────────────────────────────────────┤
│ Sem mudanças (herda categoria do serviço)       │
└─────────────────────────────────────────────────┘
```

---

## 🎨 INTERFACE

### Abaem ConveniosPage

```
[ Básico ] [ Serviços ] [ Endereços ] [ Tributos ] [ Equiparação ]

                        ☑ Equiparação Ativa
                        
                 Selecione categorias de serviços
                 que estão em equiparação:
                 
                 ☑ Consultoria Técnica
                 ☐ TI e Telecomunicações
                 ☐ Pesquisa e Desenvolvimento
                 ☑ Auditoria e Consultoria
                 ☐ ...
```

---

## 🔄 FLUXO DE DADOS

```
USUARIO EDITA CONVÊNIO
    ↓
ABA "EQUIPARAÇÃO"
  ├─ Seleciona categorias (checkboxes)
  └─ Salva em health_insurance_equipacao (M:M)
    ↓
ABA "TRIBUTOS"
  ├─ Define TI ou TIRF
  ├─ Define percentuais por categoria
  └─ Salva em health_insurance_equipacao
    ↓
TABELA DE PREÇOS
  ├─ Mostra categoria do serviço
  ├─ Mostra tipo tributação (TI/TIRF)
  └─ Calcula alíquota baseado em categoria
    ↓
RECEBIMENTO
  ├─ Busca categoria do serviço
  ├─ Busca percentuais do convênio
  ├─ Aplica alíquota correta
  └─ Salva com tributação correta
```

---

## 📝 PRÓXIMOS PASSOS

### PASSO 1: Criar Tabelas no Supabase (SQL)
- [ ] equipacao_categorias_anexo2 (com 10 categorias iniciais)
- [ ] health_insurance_equipacao (M:M com percentuais)
- [ ] Alterar services (adicionar categoria + eh_equiparavel)

### PASSO 2: Atualizar APIs
- [ ] Criar equipacaoApi.js (listar categorias)
- [ ] Adicionar em healthInsurancesApi getEquipacaoByConvenio()
- [ ] Adicionar em healthInsurancesApi saveEquipacao()

### PASSO 3: UI - Nova Aba "Equiparação"
- [ ] Ler categorias disponíveis
- [ ] Mostrar checkboxes para cada categoria
- [ ] Salvar seleção em M:M table

### PASSO 4: UI - Reformular Aba "Tributos"
- [ ] Remover checkbox equiparação anterior
- [ ] Adicionar radiobuttons TI/TIRF
- [ ] Mostrar tabela de percentuais por categoria
- [ ] Permitir editar percentuais

### PASSO 5: UI - Atualizar Tabela de Preços
- [ ] Adicionar coluna "Categoria"
- [ ] Adicionar coluna "Tributação"
- [ ] Mostrar percentual associado

### PASSO 6: Testes
- [ ] Criar convênio com equipação
- [ ] Selecionar categorias
- [ ] Verificar cálculos

---

## 💡 DIFERENÇAS vs VERSÃO ANTERIOR

| Aspecto | Anterior ❌ | Novo ✅ |
|---------|-----------|--------|
| Foco | ISSQN → ISS | Equiparação por Categoria |
| Campo | `has_issqn_equiparation` BOOL | `categoria_anexo2_id` FK |
| Scope | Simples checkbox | Complexo: TI/TIRF + % |
| Legislação | Lei 13.985/2020 | Anexo 2 da Lei |
| Percentuais | Não configurava | Configurável por categoria |
| Tabelas | 3 campos simples | 2 tabelas novas + ligações |

---

## 🎯 ENTREGA FINAL

✅ Nova aba "Equiparação" funcional  
✅ Aba "Tributos" com TI/TIRF  
✅ Tabela de Preços mostrando categorias  
✅ 100% documentado  
✅ Testado e validado  

**Timeline:** ~4-6 horas

---
