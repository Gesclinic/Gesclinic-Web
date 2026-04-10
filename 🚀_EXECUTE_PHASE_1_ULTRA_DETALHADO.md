🚀 EXECUTE PHASE 1 - INSTRUÇÕES PASSO A PASSO
==============================================

## ⏱️ TEMPO TOTAL: 5 MINUTOS

---

## PASSO 1: Abrir o Arquivo SQL

### 1.1 No VS Code
```
Pressione: Ctrl + P
Digite: supabase/migrations/20260118_add_tiss_mandatory_fields.sql
Pressione: Enter
```

**Resultado esperado:**
- Arquivo abre no editor
- Você vê ~50 linhas de SQL
- Começa com: "-- Migration: Adicionar Campos Obrigatórios para TISS XML"

### 1.2 Copiar TODO o SQL
```
Ctrl + A  (seleciona tudo)
Ctrl + C  (copia)
```

**Confirmação:**
- O texto fica destacado/selecionado
- Copiado para a área de transferência

---

## PASSO 2: Acessar Supabase Console

### 2.1 Abrir Dashboard
```
URL: https://supabase.com/dashboard
```

**Se for necessário:**
- Faça login com sua conta Supabase
- Selecione seu projeto (Gesclinic Web ou similiar)

**Resultado esperado:**
- Você vê o dashboard do Supabase
- Menu esquerdo com opções (SQL Editor, Database, etc)

### 2.2 Abrir SQL Editor
```
Menu Esquerdo → "SQL Editor"
OU
Clique em botão grande "New Query"
```

**Resultado esperado:**
- Abre um editor SQL em branco
- Título diz "New Query" ou similar

---

## PASSO 3: Colar e Executar SQL

### 3.1 Colar o SQL
```
No editor SQL, faça:
Ctrl + V  (cola o SQL que copiou)
```

**Resultado esperado:**
- O SQL aparece no editor
- Você vê as linhas de código que copiou

### 3.2 Executar
```
Keyboard: Ctrl + Enter
OU
Botão: Clique no botão "Run" (azul, no canto superior direito)
```

**Resultado esperado:**
- Aparece uma mensagem de execução
- Status muda para "Executing..."

### 3.3 Aguardar Sucesso
```
Aguarde ~2-3 segundos
```

**Resultado esperado (SUCESSO):**
```
✅ "Command completed successfully"
OU
✅ Sem mensagens de erro (vermelho)
```

**Resultado esperado (ERRO):**
```
❌ Mensagem em vermelho
❌ "ERROR", "duplicate", "already exists", etc
```

---

## PASSO 4: Confirmar Criação dos Campos

### 4.1 Verificar no Database
```
Menu Esquerdo → "Database" 
OU
Menu Esquerdo → "Editor" → Selecione sua tabela
```

### 4.2 Verificar cada tabela

**Tabela: services**
```
Procure por estes campos novos:
  ✓ tuss_code (VARCHAR 10)
  ✓ type_service (VARCHAR 50)
  ✓ guide_type (VARCHAR 50)
  ✓ unit_measure (VARCHAR 20)
  ✓ cost_value (DECIMAL 12,2)
```

**Tabela: professionals**
```
Procure por estes campos novos:
  ✓ cbo_code (VARCHAR 6)
  ✓ cns_code (VARCHAR 20)
  ✓ council_type (VARCHAR 50)
  ✓ council_number (VARCHAR 20)
  ✓ council_state (VARCHAR 2)
```

**Tabela: health_insurances**
```
Procure por estes campos novos:
  ✓ registration_ans (VARCHAR 20)
  ✓ tiss_pattern (BOOLEAN)
  ✓ guide_format (VARCHAR 50)
```

**Tabela: professional_payers**
```
Procure por este campo novo:
  ✓ credential_number (VARCHAR 50)
```

---

## ✅ CONFIRMAÇÃO DE SUCESSO

### 5.1 Checklist Visual
```
☑ SQL executou sem erros vermelhos
☑ Mensagem de sucesso apareceu
☑ 13 campos adicionados nas 4 tabelas
☑ Indices criados (4 índices)
☑ Nenhum campo foi rejeitado
```

### 5.2 Próximo Passo
```
Avise aqui: "Phase 1 foi executado com sucesso!"

Então faremos Phase 5 (Testes Integrados)
```

---

## 🆘 TROUBLESHOOTING

### Problema: "Error: already exists"
```
Solução:
  → Os campos já foram criados antes
  → Execução foi bem-sucedida na verdade
  → Prossiga para Phase 5
```

### Problema: "Error: permission denied"
```
Solução:
  → Você não tem permissão no Supabase
  → Faça login ou peça ao admin do projeto
```

### Problema: "Error: syntax error"
```
Solução:
  → Certifique-se de copiar TODO o SQL
  → Não deixe partes fora
  → Tente de novo: Ctrl+A, Ctrl+C, Ctrl+V
```

### Problema: "Nenhuma mensagem aparece"
```
Solução:
  → Clique no botão "Run" novamente
  → Aguarde alguns segundos
  → Verifique se há mensagens de sucesso
```

---

## ⏱️ TIMELINE ESPERADA

```
00:00 - Você começa
00:30 - Arquivo aberto e SQL copiado
01:30 - SQL colado em Supabase
02:00 - SQL executado e sucesso confirmado
05:00 - Total (com margem)

Se tomar mais tempo:
  → Verifique as instruções acima
  → Tente novamente
  → Ou avise se houver erro
```

---

## AFTER PHASE 1: O QUE ACONTECE

Uma vez que Phase 1 for executado com sucesso:

```
1. ✅ Database terá 13 novos campos TISS
2. ✅ Forms (Phase 3) poderão salvar dados
3. ✅ APIs (Phase 2) poderão validar dados
4. ✅ Validações em cascata (Phase 4) funcionarão
5. 🚀 Phase 5 (Testes) poderá começar

Estimado para tudo: 1-2 horas
```

---

## RESUMO DO ARQUIVO SQL

Aqui está o que será executado:

```sql
-- Adiciona 5 campos na tabela SERVICES
ALTER TABLE services
ADD COLUMN tuss_code VARCHAR(10),
ADD COLUMN type_service VARCHAR(50),
ADD COLUMN guide_type VARCHAR(50),
ADD COLUMN unit_measure VARCHAR(20),
ADD COLUMN cost_value DECIMAL(12,2);

-- Cria índice para busca rápida
CREATE INDEX idx_services_tuss_code 
ON services(clinic_id, tuss_code) 
WHERE active = TRUE;

-- Adiciona 5 campos na tabela PROFESSIONALS
ALTER TABLE professionals
ADD COLUMN cbo_code VARCHAR(6),
ADD COLUMN cns_code VARCHAR(20),
ADD COLUMN council_type VARCHAR(50),
ADD COLUMN council_number VARCHAR(20),
ADD COLUMN council_state VARCHAR(2);

-- Cria índice para busca rápida
CREATE INDEX idx_professionals_cbo_code 
ON professionals(clinic_id, cbo_code);

-- Adiciona 3 campos na tabela HEALTH_INSURANCES
ALTER TABLE health_insurances
ADD COLUMN registration_ans VARCHAR(20),
ADD COLUMN tiss_pattern BOOLEAN DEFAULT TRUE,
ADD COLUMN guide_format VARCHAR(50);

-- Cria índice para busca rápida
CREATE INDEX idx_health_insurances_ans 
ON health_insurances(clinic_id, registration_ans);

-- Adiciona 1 campo na tabela PROFESSIONAL_PAYERS
ALTER TABLE professional_payers
ADD COLUMN credential_number VARCHAR(50);

-- Total: 13 campos + 4 índices
```

---

## CHECKLIST FINAL

- [ ] Abri o arquivo SQL em VS Code
- [ ] Copiei TODO o SQL (Ctrl+A, Ctrl+C)
- [ ] Acessei https://supabase.com/dashboard
- [ ] Abri SQL Editor
- [ ] Colei o SQL (Ctrl+V)
- [ ] Executei (Ctrl+Enter ou botão Run)
- [ ] Recebi mensagem de sucesso ✅
- [ ] Verifiquei que os 13 campos foram criados
- [ ] Verifiquei que os 4 índices foram criados
- [ ] Pronto para Phase 5!

---

## COMANDO RÁPIDO (Se preferir via terminal)

Se tiver acesso via CLI do Supabase:

```bash
# Não é necessário, mas se quiser:
# supabase db push
# supabase migration up 20260118_add_tiss_mandatory_fields

# Mais fácil é pelo Console Web (passos acima)
```

---

**⚠️ IMPORTANTE:** Não pule este passo! Phase 1 é **BLOCKER** para todas as outras fases funcionarem.

Após completar, avise: **"Phase 1 executado com sucesso!"**

Então faremos Phase 5 (Testes Integrados) em ~1-2 horas.

---

**Tempo:** 5 minutos  
**Dificuldade:** Muito Fácil  
**Status:** 🚀 Pronto para começar!
