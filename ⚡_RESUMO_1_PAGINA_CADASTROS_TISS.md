# 🎯 RESUMO EXECUTIVO - CADASTROS BASE DO SISTEMA (1 página)

**Data:** 18 de janeiro de 2026 | **Status:** 🟢 Pronto para implementação | **Tempo:** 2-3 dias

---

## 🔴 CRÍTICO - O QUE FALTA PARA TISS XML

| Cadastro | Campo | Tipo | Exemplo | Sem isto = GLOSA |
|----------|-------|------|---------|---|
| **SERVIÇO** | `tuss_code` | VARCHAR(10) | `0101010100` | ❌ 100% |
|  | `type_service` | ENUM | Consulta/Exame | ❌ 100% |
| **PROFISSIONAL** | `cbo_code` | VARCHAR(6) | `225101` | ❌ 100% |
|  | `council_type` | ENUM | CRM/CREFITO | ❌ 100% |
|  | `council_number` | VARCHAR(20) | `123456` | ❌ 100% |
| **CONVÊNIO** | `registration_ans` | VARCHAR(20) | `342856` | ❌ 100% |
|  | `tiss_pattern` | BOOLEAN | TRUE | ❌ 100% |
| **PROF×CONVÊNIO** | `credential_number` | VARCHAR(50) | `UNIMED123` | ❌ GLOSA GARANTIDA |
| **PREÇO** | `base_price` | DECIMAL | `150.00` | ❌ Não fatua |

---

## 🟡 IMPORTANTE - VÍNCULOS OBRIGATÓRIOS

```
Sem estes vínculos:
  ❌ Agenda bloqueia
  ⚠️ Faturamento erra
  ❌ TISS gera glosa

1. professional_services (Prof faz qual Serviço?)
2. professional_payers (Prof atende qual Convênio?)
3. service_prices (Quanto custa cada Serviço em cada Convênio?)
4. revenue_rules (Como Prof recebe? % ou valor fixo?)
```

---

## 📋 AÇÕES IMEDIATAS (Hoje)

```
[ ] 1. Verificar que campos existem no BD
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'services';
    
[ ] 2. Executar Migrations faltantes
    ALTER TABLE services ADD COLUMN tuss_code VARCHAR(10);
    
[ ] 3. Atualizar Forms (adicionar campos obrigatórios)
    ServicesPage.jsx → input TUSS Code
    ProfessionalsPage.jsx → input CBO Code + Council
    ConveniosPage.jsx → input ANS
    
[ ] 4. Adicionar Validações nas APIs
    servicesApi.js → if (!tuss_code) throw error
    professionalsApi.js → if (!cbo_code) throw error
    healthInsurancesApi.js → if (!ans) throw error
    
[ ] 5. Testar Fluxo Completo
    Serviço → Prof → Convênio → Agendamento → Guia TISS
```

---

## 💰 IMPACTO FINANCEIRO

```
Se implementar AGORA:
  ✅ Agenda funciona sem conflitos
  ✅ Faturamento calcula preços corretos
  ✅ TISS XML sai validado
  ✅ Nenhuma glosa por dados incompletos

Se NÃO implementar:
  ❌ Operadora glosa 100% das guias
  ❌ Clínica perde TODA a receita
  ❌ Profissional não recebe repasse
  ❌ Sistema fica inconsistente
```

---

## 🚀 IMPLEMENTAÇÃO (2-3 dias)

| Dia | Tarefa | Tempo | Status |
|-----|--------|-------|--------|
| 1️⃣ | Migrations SQL + APIs | 2h | ⏳ |
| 1️⃣ | Forms (CRUD Pages) | 2h | ⏳ |
| 2️⃣ | Validações em cascata | 2h | ⏳ |
| 2️⃣ | Testes e2e | 2h | ⏳ |
| 3️⃣ | Integração TISS | 2h | ⏳ |
| 3️⃣ | Documentação | 1h | ⏳ |

---

## 📖 DOCUMENTAÇÃO COMPLETA

| Arquivo | Conteúdo |
|---------|----------|
| [🎯_GUIA_CADASTROS_ESTRUTURA_COMPLETA_TISS.md](🎯_GUIA_CADASTROS_ESTRUTURA_COMPLETA_TISS.md) | ✅ Guia Técnico Detalhado (Todos os campos + dependências) |
| [📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md](📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md) | ✅ Checklist Prático (Passo a passo de implementação) |
| [🔄_FLUXO_TECNICO_CADASTROS_AGENDAMENTO_TISS.md](🔄_FLUXO_TECNICO_CADASTROS_AGENDAMENTO_TISS.md) | ✅ Fluxo Visual (Do cadastro ao TISS XML) |

---

## ✅ VALIDAÇÃO RÁPIDA (SQL)

Copiar e colar no Supabase Console:

```sql
-- Quais campos TISS estão faltando?
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('services', 'professionals', 'health_insurances')
AND column_name IN ('tuss_code', 'cbo_code', 'registration_ans');

-- Se não retornar todas as combinações = FALTA ADICIONAR

-- Quais serviços estão incompletos?
SELECT id, name, tuss_code, type_service 
FROM services 
WHERE clinic_id = 'SEU_CLINIC_ID'
AND (tuss_code IS NULL OR type_service IS NULL);

-- Quais profissionais estão incompletos?
SELECT id, name, cbo_code, council_type 
FROM professionals 
WHERE clinic_id = 'SEU_CLINIC_ID'
AND (cbo_code IS NULL OR council_type IS NULL);

-- Quais vínculo prof×conv faltam credential?
SELECT pp.id, p.name, hi.name, pp.credential_number
FROM professional_payers pp
JOIN professionals p ON pp.professional_id = p.id
JOIN health_insurances hi ON pp.health_insurance_id = hi.id
WHERE pp.clinic_id = 'SEU_CLINIC_ID'
AND pp.credential_number IS NULL;
```

---

## 🎯 3 REGRAS DE OURO

1. **TUSS + CBO + ANS = OBRIGATÓRIO**
   - Sem isto = GLOSA
   - Sem credential = GLOSA GARANTIDA
   - Sem preço = NÃO FATUA

2. **Vínculos validam em cascata**
   - Agenda valida profissional_services
   - TISS valida professional_payers
   - Faturamento valida revenue_rules

3. **Se faltar algo = ERRO CLARO**
   - Não permitir agendamento
   - Não permitir guia
   - Mensagem específica do erro

---

**Próxima leitura:** [🎯_GUIA_CADASTROS_ESTRUTURA_COMPLETA_TISS.md](🎯_GUIA_CADASTROS_ESTRUTURA_COMPLETA_TISS.md)  
**Depois:** [📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md](📋_CHECKLIST_CAMPOS_OBRIGATORIOS_TISS.md)  
**Por fim:** [🔄_FLUXO_TECNICO_CADASTROS_AGENDAMENTO_TISS.md](🔄_FLUXO_TECNICO_CADASTROS_AGENDAMENTO_TISS.md)
