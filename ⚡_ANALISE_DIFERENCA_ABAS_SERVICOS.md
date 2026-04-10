# 📊 COMPARAÇÃO: Aba Serviços (Profissional) vs Cadastros Básicos > Serviços

## 🔍 CAMPOS NA PÁGINA DE SERVIÇOS (Cadastros Básicos) - QUE NÃO ESTÃO NA ABA DO PROFISSIONAL

### **INFORMAÇÕES BÁSICAS DO SERVIÇO**
- [✅] Nome → mostrado no modal
- [✅] Código CBHPM/TUSS → mostrado no modal
- [✅] Categoria → mostrado no modal
- [✅] Duração Padrão → mostrado no modal
- [✅] Faturável → mostrado no modal
- [❌] **Descrição** ← **NÃO aparece na aba**
- [❌] **Tipo de Cobrança** ← **NÃO aparece na aba**
- [❌] **Permite encaixe de pacientes** ← **NÃO aparece na aba**
- [❌] **Exige autorização do convênio** ← **NÃO aparece na aba**

### **SEÇÃO TISS** (Dados Obrigatórios para Faturamento)
- [❌] **Código TUSS** (campo separado, diferente de CBHPM) ← **NÃO aparece**
- [❌] **Tipo de Serviço** ← **NÃO aparece**
- [❌] **Tipo de Guia** ← **NÃO aparece**
- [❌] **Unidade de Medida** ← **NÃO aparece**
- [❌] **Valor de Custo (R$)** ← **NÃO aparece**

---

## 🎯 CAMPOS NA ABA DO PROFISSIONAL - QUE NÃO ESTÃO EM SERVIÇOS

### **Específicos da Relação Profissional-Serviço**
- [✅] **Duração Customizada (em minutos)** - Permite override da duração padrão por profissional
- [✅] **Nível de Competência** - (Junior/Padrão/Especialista) - Classificação do profissional para este serviço
- [✅] **Ativo** - Flag para ativar/desativar este serviço APENAS para este profissional

---

## 📋 RESUMO

### ✅ O QUE ESTÁ CORRETO
- A aba de Profissional mostra um **resumo visual** do serviço para referência rápida
- Os campos editáveis são **específicos da relação** profissional-serviço
- A página de Serviços tem a **configuração completa** do serviço

### ⚠️ CAMPOS QUE PODERIAM SER ADICIONADOS NA ABA (Opcional)

Se desejar mais completude na aba de Profissional, poderiam ser adicionados (em visualização):

1. **Descrição do Serviço** - Para contexto completo
2. **Tipo de Cobrança** - Referência do modelo de cobrança
3. **Permissões** (Encaixe, Autorização) - Referência das regras do serviço
4. **Código TUSS separado** - Se diferente de CBHPM
5. **Custo do Serviço** - Para referência de margem

Mas eles seriam **apenas informativos**, pois o profissional não deve poder editar essas configurações (que são do serviço, não da atribuição).

---

## 🏗️ ESTRUTURA IDEAL

**PÁGINA: Cadastros Básicos > Serviços**
- Edita: Todas as características do serviço (TISS, cobrança, custos, etc.)
- Não edita: Atribuições a profissionais

**ABA: Profissional > Serviços**
- Edita: Customizações específicas dessa relação (duração override, competência, ativo)
- Mostra: Resumo do serviço para referência
- Não edita: Configurações gerais do serviço (essas ficam em Cadastros Básicos)

---

## ✨ RECOMENDAÇÃO

O layout atual está **logicamente correto**. A aba de Profissional tem o que é necessário para gerenciar a relação profissional-serviço. 

Se quiser expandir, adicione campos informativos (Descrição, Tipo de Cobrança, etc.) no card azul do topo, mas deixe-os como **leitura apenas** para manter a separação de responsabilidades.
