# 📋 INCLUIR TODOS OS SERVIÇOS - INSTRUÇÕES COMPLETAS

## 📊 O QUE SERÁ INSERIDO

✅ **187 Procedimentos CBHPM Completos:**

### Por Categoria:
- 🏥 **25 Consultas** - Todas as especialidades (Clínica Geral, Cardio, Derma, Orto, Oftalmologia, Ginecologia, Urologia, Pediatria, Pneumologia, Gastroenterologia, Reumatologia, Neurologia, Psiquiatria, Endocrinologia, ORL, Cirurgia Geral, Proctologia, Oftalmologia Clínica, Infectologia, Oncologia, Cardio Pediátrica, Neonatologia, Alergia, Fisiatra, Geriatria)

- 🔬 **35 SADT/Exames** - Eletrocardiografia, Ecocardiografia, Ultrassonografia (6 tipos), Radiografia (5 tipos), Tomografia (5 tipos), Ressonância Magnética (4 tipos), EEG, Eletromiografia, Testes Pulmonares

- 🔧 **40 Procedimentos** - Sutura, Infiltrações, Biópsias, Dermatologia (4), Ortopedia (4), Enfermagem (4), Ginecologia/Obstetrícia (4), Urologia (2), Gastroenterologia (3), Pneumologia (1), Punções/Drenagens (3)

- 🏨 **15 Internações** - Diárias (4 tipos: Enfermaria, Apartamento, ICU, UTI), Taxas Operatórias (4 tipos), Sala de Recuperação, Anestesia (3 tipos), Oxigenoterapia, Hemodiálise, Diálise Peritoneal

- 💊 **20 Procedimentos Laboratório** - Hemograma, Bioquímica, Coagulação, Sorologia (5), Testes Rápidos (4), Dosagens, Culturas (3), Microscopia/Parasitologia (2)

- 💉 **12 Imunizações/Vacinas** - BCG, Pentavalente, Meningocócica, Pneumocócica, Rotavírus, Febre Amarela, Gripe, COVID-19, HPV, Tétano, Hepatite A, Hepatite B

- 🔄 **20 Outros Procedimentos** - Eletroforese, Testes de Alergia (2), Testes Cardíacos (2), Mielografia, Vertebroplastia, Cifoplastia, Psicologia (2), Fisioterapia (2)

---

## 🚀 COMO EXECUTAR NO SUPABASE

### **PASSO 1: Inserir CBHPM (187 procedimentos)**

1. Abra seu browser em: **https://app.supabase.com**
2. Selecione seu projeto **Gesclinic**
3. Vá até: **SQL Editor** → **New Query**
4. Copie TODO o conteúdo do arquivo:
   ```
   SQL_TODOS_SERVICOS_COMPLETO.sql
   ```
5. Cole na caixa de SQL no Supabase
6. Clique em **▶️ Run** ou pressione **Ctrl+Enter**
7. Aguarde a mensagem de sucesso:
   ```
   ✅ 187 procedimentos inseridos com sucesso!
   total_procedimentos | categorias
   187                 | 7
   ```

---

### **PASSO 2: Criar Serviços (automático do CBHPM)**

1. Na mesma aba **SQL Editor**, clique em **+ New Query**
2. Copie TODO o conteúdo do arquivo:
   ```
   SQL_CRIAR_SERVICOS_COMPLETO.sql
   ```
3. Cole na caixa de SQL
4. Clique em **▶️ Run**
5. Aguarde a mensagem:
   ```
   ✅ 187 serviços criados automaticamente!
   total_servicos | categorias_servicos
   187            | 5
   ```

---

## ✔️ VERIFICAR SE FUNCIONOU

Execute estas queries no Supabase SQL Editor para confirmar:

### **Verificar CBHPM:**
```sql
SELECT 
  COUNT(*) as total_cbhpm,
  COUNT(DISTINCT categoria) as numero_categorias,
  STRING_AGG(DISTINCT categoria, ' | ' ORDER BY categoria) as categorias
FROM cbhpm_procedures 
WHERE clinic_id = (SELECT id FROM clinics WHERE active = true LIMIT 1)
AND ativo = true;
```

**Resultado esperado:**
```
total_cbhpm | numero_categorias | categorias
187         | 7                 | Consultas | Internações | Outros | Procedimentos | SADT
```

### **Verificar Serviços:**
```sql
SELECT 
  COUNT(*) as total_servicos,
  COUNT(DISTINCT service_category) as numero_categorias,
  STRING_AGG(DISTINCT service_category, ' | ' ORDER BY service_category) as categorias
FROM services 
WHERE clinic_id = (SELECT id FROM clinics WHERE active = true LIMIT 1)
AND active = true;
```

**Resultado esperado:**
```
total_servicos | numero_categorias | categorias
187            | 5                 | consultation | exam | hospitalization | other | procedure
```

### **Listar Alguns Exemplos:**
```sql
SELECT 
  name,
  tuss_code,
  base_value,
  service_category,
  default_duration_minutes
FROM services 
WHERE clinic_id = (SELECT id FROM clinics WHERE active = true LIMIT 1)
AND active = true
ORDER BY service_category, name
LIMIT 20;
```

---

## 📱 ONDE APARECEM ESSES SERVIÇOS

Após executar, os serviços aparecerão em:

### 1. **📋 Base do Sistema > Serviços**
- Lista de todos os 187 serviços
- Editar duração, valores, etc
- URL: `/clinica/base-sistema/servicos`

### 2. **📅 Agenda > Criar Consulta**
- Dropdown com todos os serviços
- Ao agendar: selecionar um dos 187
- URL: `/clinica/agenda`

### 3. **👨‍⚕️ Base do Sistema > Profissionais**
- Associar serviços a cada profissional
- Cada profissional pode fazer múltiplos serviços
- URL: `/clinica/base-sistema/professionals`

### 4. **💰 Financeiro > Valores**
- Configurar preços por convênio
- Usar os 187 serviços para faturamento
- URL: `/clinica/financeiro/valores`

### 5. **🏥 CBHPM (Base > CBHPM)**
- Todos os 187 códigos CBHPM
- Filtrar por categoria, TUSS, etc
- URL: `/clinica/base-sistema/cbhpm`

---

## 🎯 PRÓXIMOS PASSOS (Opcionais)

Después de insertar los servicios:

### 1. **Associar Serviços a Profissionais**
```
Base > Profissionais > Editar > Seleção serviços
```

### 2. **Configurar Preços por Convênio**
```
Financeiro > Valores > Novo Preço
```

### 3. **Testar Agendamento**
```
Agenda > Novo Agendamento > Selecionar serviço > Salvar
```

### 4. **Gerar Guias TISS**
```
Faturamento > Tipos de Guia > Usar TISS Code
```

---

## ⚠️ POSSÍVEIS ERROS E SOLUÇÕES

### **Erro: "clinic_id não encontrado"**
**Solução:** Verifique se existe uma clínica cadastrada:
```sql
SELECT id, name FROM clinics WHERE active = true;
```

### **Erro: "TUSS Code duplicado"**
**Solução:** Remova serviços antigos:
```sql
DELETE FROM services 
WHERE clinic_id = (SELECT id FROM clinics WHERE active = true LIMIT 1)
AND created_at < NOW() - INTERVAL '1 day';
```

### **Erro: "Foreign key violation"**
**Solução:** Restaure a integridade:
```sql
DELETE FROM cbhpm_procedures WHERE clinic_id IS NULL;
DELETE FROM services WHERE clinic_id IS NULL;
```

---

## 📞 RESUMO FINAL

| Item | Valor |
|------|-------|
| **Total de Serviços** | 187 |
| **Categorias CBHPM** | 7 (Consultas, SADT, Procedimentos, Internações, Outros, Imunizações, Laboratório) |
| **Categorias Serviços** | 5 (Consultation, Exam, Procedure, Hospitalization, Other) |
| **TUSS Codes** | 187 (todos com código TUSS válido) |
| **Valores Base** | R$ 15 a R$ 3.000 |
| **Durações** | 15 a 120 minutos |
| **Status** | ✅ Ativo |

---

## ✅ CHECKLIST DE EXECUÇÃO

- [ ] Copiar arquivo `SQL_TODOS_SERVICOS_COMPLETO.sql`
- [ ] Executar no Supabase SQL Editor
- [ ] Copiar arquivo `SQL_CRIAR_SERVICOS_COMPLETO.sql`
- [ ] Executar no Supabase SQL Editor
- [ ] Verificar contagem: 187 procedimentos + 187 serviços
- [ ] Acessar **Base > Serviços** e conferir lista
- [ ] Acessar **Agenda** e verificar dropdown
- [ ] Testar criar novo agendamento com serviço
- [ ] ✅ Pronto!

---

**Estimado: 5 minutos de execução** ⏱️
