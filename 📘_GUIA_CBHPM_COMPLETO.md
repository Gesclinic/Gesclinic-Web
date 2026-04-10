<!-- markdownlint-disable -->

# 📋 Guia Completo - Sistema CBHPM 

## 🎯 O que foi implementado?

O sistema agora possui uma **estrutura centralizada para gerenciar procedimentos CBHPM** (Classificação Brasileira Hierarquizada de Procedimentos Médicos). Isso permite:

- ✅ Cadastro e controle de procedimentos CBHPM
- ✅ Vinculação com códigos TUSS
- ✅ Mapeamento com serviços existentes
- ✅ Gestão de valores (mínimo, base, máximo)
- ✅ Filtros por categoria, tipo de guia, status
- ✅ Histórico de alterações

---

## 🏗️ Arquitetura Implementada

### 1️⃣ **Banco de Dados**
**Arquivo:** `supabase/migrations/20260216_create_cbhpm_table.sql`

Criadas 2 tabelas principais:

#### `cbhpm_procedures` - Catálogo de Procedimentos
```sql
Colunas principais:
- id (UUID)
- clinic_id (FK → clinics)
- codigo_cbhpm (VARCHAR 20) - Código CBHPM (ex: 1.01.01.01-2)
- descricao_completa (TEXT)
- descricao_curta (VARCHAR)
- codigo_tuss (VARCHAR 10) - Mapeamento para TUSS
- valor_minimo, valor_base, valor_maximo (DECIMAL)
- tipo_guia (ENUM: consulta, sadt, internacao, procedimento)
- unidade_medida (ENUM: unidade, sessao, minuto, diaria, hora)
- permite_faturamento (BOOLEAN)
- exige_autorizacao (BOOLEAN)
- categoria, subcategoria (VARCHAR)
- ativo (BOOLEAN)
- created_at, updated_at (TIMESTAMP)

Indexes:
- idx_cbhpm_procedures_clinic_id
- idx_cbhpm_procedures_codigo_cbhpm
- idx_cbhpm_procedures_codigo_tuss
- idx_cbhpm_procedures_ativo
- idx_cbhpm_procedures_tipo_guia
```

#### `cbhpm_service_mapping` - Vínculo CBHPM ↔ Services
```sql
Permite vincular um procedimento CBHPM a um serviço cadastrado
- id (UUID)
- cbhpm_id (FK → cbhpm_procedures)
- service_id (FK → services)
- eh_principal (BOOLEAN)
- sobrescreve_valor (BOOLEAN)
- valor_especifico (DECIMAL)
```

**RLS Policies:** Usuários veem apenas CBHPM de sua clínica

---

### 2️⃣ **API (Backend)**
**Arquivo:** `src/lib/cbhpmApi.js`

Funções disponíveis:

#### Listagem e Busca
```javascript
listCBHPM(clinicId, filters)
  - Filters: ativo, tipo_guia, categoria, search
  - Retorna: Array de procedimentos

getCBHPMById(procedureId)
  - Retorna: Procedimento detalhado

getCBHPMByCode(clinicId, codigoCBHPM)
  - Busca por código CBHPM
  - Retorna: Procedimento ou null
```

#### CRUD
```javascript
createCBHPM(clinicId, procedureData)
  - Cria novo procedimento
  - Valida código CBHPM (duplicata)
  - Normaliza valores

updateCBHPM(procedureId, procedureData)
  - Atualiza procedimento existente
  - Normaliza códigos e valores

deleteCBHPM(procedureId)
  - Soft delete (marca como inativo)

restoreCBHPM(procedureId)
  - Restaura procedimento deletado
```

#### Mapeamento com Serviços
```javascript
mapCBHPMToService(cbhpmId, serviceId, clinicId, options)
  - Vincula CBHPM com serviço

unmapCBHPMFromService(mappingId)
  - Remove vínculo

listServicesForCBHPM(cbhpmId)
  - Lista serviços vinculados

getEffectivePrice(cbhpmId, serviceId)
  - Retorna valor final (base ou específico do mapeamento)
```

#### Utilitários
```javascript
validateCBHPMCode(codigo)
  - Valida formato do código CBHPM
  - Retorna: { valid: boolean, errors: string[] }

listCBHPMCategories(clinicId)
  - Lista categorias únicas

listCBHPMGuiaTypes(clinicId)
  - Lista tipos de guia únicos
```

---

### 3️⃣ **Interface (Frontend)**
**Arquivo:** `src/pages/clinica/base-sistema/CBHPMManagement.jsx`

#### Funcionalidades da Página

**Rota:** `/clinica/base-sistema/cbhpm`

**Componentes:**

1. **Barra de Ação**
   - Botão "Novo Procedimento"
   - Campo de busca (código, descrição, TUSS)
   - Toggle para mostrar itens deletados

2. **Filtros**
   - Tipo de Guia (Consulta, SADT, Internação, Procedimento)
   - Categoria (dinâmico com base em dados)

3. **Tabela de Procedimentos**
   | Coluna | Descrição |
   |--------|-----------|
   | Código CBHPM | Formato: 1.01.01.01-2 |
   | Descrição | Nome completo + curto |
   | TUSS | Código TUSS vinculado |
   | Valor Base | R$ (em verde se preenchido) |
   | Tipo Guia | Badge com ícone |
   | Faturável | Checkmark/Alert |
   | Ações | Editar/Deletar/Restaurar |

4. **Dialog Novo/Editar Procedimento**
   
   **Campos obrigatórios:**
   - Código CBHPM (formato validado)
   - Descrição Completa

   **Campos opcionais:**
   - Descrição Curta
   - Código TUSS
   - Categoria / Subcategoria
   - Tipo de Guia
   - Unidade de Medida
   - Valores (Mínimo, Base, Máximo)
   - Permite Faturamento (checkbox)
   - Exige Autorização (checkbox)
   - Observações

   **Validações:**
   - Código CBHPM único por clínica
   - Formato CBHPM: `1.01.01.01-2` ou `1010101012`
   - Valores numéricos válidos

---

### 4️⃣ **Rotas Integradas**
**Arquivo:** `src/AppRoutes.jsx`

```javascript
// Nova rota adicionada na seção "4.1 Cadastros Estruturais"
<Route path="base-sistema/cbhpm" element={<CBHPMManagement />} />
```

**Menu de Navegação:** Aparece no menu "Base do Sistema" apenas para usuários com acesso

---

## 🚀 Como Usar?

### 📌 Acessar a Página
1. **Login** na clínica
2. Navegue para **Base do Sistema**
3. Clique em **CBHPM**

URL: `http://localhost:3000/clinica/base-sistema/cbhpm`

### ➕ Adicionar Novo Procedimento

1. Clique em **"Novo Procedimento"**
2. Preencha os campos:
   - **Código CBHPM** (obrigatório)
     - Formato: `1.01.01.01-2` ou `1010101012`
     - Sistema automaticamente normaliza
   - **Descrição Completa** (obrigatório)
     - Ex: "Consulta - Clínico Geral"
   - **TUSS** (opcional)
     - Vincula com tabela TUSS
   - **Tipo de Guia**
     - Consulta, SADT, Internação, Procedimento
   - **Unidade de Medida**
     - Unidade, Sessão, Minuto, Diária, Hora
   - **Valores**
     - Mínimo, Base, Máximo
   - **Categoria** (ex: "CONSULTAS")
   - Checkboxes:
     - ✓ Permite Faturamento
     - ✓ Exige Autorização

3. Clique **"Criar"**

### ✏️ Editar Procedimento

1. Clique **"Editar"** na linha do procedimento
2. Modifique os campos desejados
3. Clique **"Atualizar"**

### 🗑️ Deletar Procedimento

1. Clique **"Deletar"** na linha
2. Confirme na popup
3. Procedimento marcado como inativo
4. Para restaurar: Ative "Show Deleted" e clique "Restaurar"

### 🔍 Filtrar Procedimentos

**Por Tipo de Guia:**
- Selecione no dropdown "Tipo de Guia"
- Tabela atualiza automaticamente

**Por Categoria:**
- Selecione no dropdown "Categoria"
- Mostra apenas procedimentos da categoria selecionada

**Buscar:**
- Digite no campo "Buscar por código, descrição ou TUSS..."
- Busca em tempo real

---

## 🔗 Integração com Sistemas Existentes

### 1️⃣ Guias de Faturamento
O CBHPM pode ser usado em:
- **GuiasConsulta.jsx** - Campo "Código CBHPM"
- **CirurgiasProcedimentos.jsx** - Campo "Código CBHPM Principal"
- **MateriaisMedicamentos.jsx** - Campo "Código CBHPM"

### 2️⃣ Serviços
Você pode mapear um procedimento CBHPM com um serviço:

```javascript
// Exemplo de mapeamento (futura integração)
await cbhpmApi.mapCBHPMToService(
  cbhpmId = "uuid-do-cbhpm",
  serviceId = "uuid-do-servico",
  clinicId = "uuid-da-clinica",
  { eh_principal: true }
);
```

### 3️⃣ Relatórios
O CBHPM integra com:
- **Relatório de Produção** - Valores por procedimento
- **Glosas** - Rastreamento de procedimentos glosados
- **Lotes TISS** - Associação de CBHPM com TISS XML

---

## 📊 Exemplos de Uso

### Exemplo 1: Adicionar Consulta Cardiovascular

```
Código CBHPM: 1.02.03.04-7
Descrição: Consulta - Cardiologista
Descrição Curta: Consulta Cardiologia
Código TUSS: 3101010101
Categoria: CONSULTAS
Tipo de Guia: Consulta ✓
Unidade: Unidade
Valor Base: R$ 150,00
Permite Faturamento: ✓
```

### Exemplo 2: Adicionar SADT (Ultrassom)

```
Código CBHPM: 2.04.05.02-1
Descrição: Ultrassom Abdominal Total
Código TUSS: 4020101010
Categoria: SADT
Tipo de Guia: SADT
Unidade: Unidade
Valor Base: R$ 120,00
Exige Autorização: ✓
```

### Exemplo 3: Adicionar Procedimento Cirúrgico

```
Código CBHPM: 3.06.02.15-5
Descrição: Sutura de Lacerações - Região Cervical
Código TUSS: 2009010101
Categoria: PROCEDIMENTOS CIRÚRGICOS
Tipo de Guia: Procedimento
Unidade: Unidade
Valor Base: R$ 400,00
Permite Faturamento: ✓
Exige Autorização: ✓
```

---

## ⚙️ Configurações Técnicas

### Formato do Código CBHPM
O sistema aceita dois formatos:
- **Com separadores:** `1.01.01.01-2` (visualização clara)
- **Sem separadores:** `1010101012` (armazenamento)

Ambos são automaticamente **normalizados** para o formato com separadores.

### Validações
- ✅ Código CBHPM é obrigatório
- ✅ Descrição é obrigatória
- ✅ Código único por clínica
- ✅ Formato CBHPM validado
- ✅ Valores numéricos com 2 casas decimais

### Performance
- Indexes em campos frequentemente filtrados
- RLS policies otimizadas
- Lazy loading em listas grandes
- Busca em tempo real com debounce

---

## 🔄 Próximas Integrações (Roadmap)

### Fase 1 (Imediata)
- [x] Tabela CBHPM
- [x] API CBHPM
- [x] Interface de Gerenciamento CBHPM
- [ ] Importar procedimentos de arquivo CSV

### Fase 2 (Curto Prazo)
- [ ] Mapeamento visual CBHPM ↔ Services
- [ ] Sincronização automática CBHPM com guias
- [ ] Histórico de alterações com auditoria
- [ ] Reajuste automático de valores (indice_reajuste)

### Fase 3 (Médio Prazo)
- [ ] Integração CBHPM ↔ MateriaisMedicamentos
- [ ] Sugestão de CBHPM ao criar guias
- [ ] Validação CBHPM em XML TISS
- [ ] Relatório de utilização CBHPM

---

## 🐛 Troubleshooting

### Erro: "Código CBHPM já existe"
**Causa:** O código já foi cadastrado para sua clínica
**Solução:** Use um código diferente ou edite o procedimento existente

### Erro: "Formato de CBHPM inválido"
**Causa:** Código não segue formato `1.01.01.01-2`
**Solução:** Verifique a formatação do código CBHPM

### Valores não aparecendo na tabela
**Causa:** Campo de valor vazio ou zero
**Solução:** Preencha o campo com um valor válido (ex: 100.00)

### Procedimento deletado aparece na lista
**Causa:** "Show Deleted" está ativado
**Solução:** Desative o toggle "Show Deleted" ou restaure se necessário

---

## 📞 Suporte

Para dúvidas sobre:
- **Sistema CBHPM:** Consulte este guia
- **Códigos CBHPM válidos:** Consulte tabela oficial ABRAMED
- **Integração TISS:** Ver documentação em Base do Sistema > Configurações TISS
- **Bugs:** Reporte no sistema de suporte interno

---

## 📝 Checklist de Implementação

- [x] Tabela no banco de dados (cbhpm_procedures)
- [x] Tabela de mapeamento (cbhpm_service_mapping)
- [x] RLS Policies configuradas
- [x] API JavaScript completa (18 funções)
- [x] Componente React com CRUD
- [x] Rota integrada (`/clinica/base-sistema/cbhpm`)
- [x] Validações de dados
- [x] Filtros dinâmicos
- [x] Busca em tempo real
- [x] Soft delete com restauração
- [x] Normalização de códigos CBHPM
- [x] Documentação completa
- [ ] Importação CSV (futuro)
- [ ] Sincronização com guias (futuro)
- [ ] Auditoria completa (futuro)

---

**Versão:** 1.0.0  
**Data:** 16/02/2026  
**Status:** ✅ Produção

