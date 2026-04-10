# 🎯 Solução: Salvar Número de Matrícula/Carteirinha nas Guias TISS

## ❌ Problema Identificado

O formulário de **Validação de Cobertura (Padrão TISS)** não estava salvando o campo **"Matrícula / Nº Carteirinha"** nem os outros dados preenchidos.

**Causa:** O componente tinha apenas `console.log()` no `handleSubmit` sem chamar API para persistir os dados.

---

## ✅ Solução Implementada

### 1. **Nova API: `/src/lib/guiasApi.js`**

Criamos uma API completa para gerenciar guias:

```javascript
// Criar nova guia com número de carteirinha
await criarGuia(clinicId, {
  paciente_nome: 'Maria Silva',
  numero_carteirinha: '123456789', // ✓ AGORA SALVA
  convenio: 'Unimed',
  plano: 'Empresarial',
  tipo_guia: 'SP',
  codigo_cbhpm: '40101012',
  valor: 150.00,
  profissional: 'Dr. João',
  observacoes: 'Consulta urgente'
});
```

**Funcionalidades:**
- ✅ `criarGuia()` - Criar nova guia
- ✅ `atualizarGuia()` - Editar guia existente  
- ✅ `listarGuias()` - Buscar guias da clínica
- ✅ `deletarGuia()` - Remover guia
- ✅ `atualizarStatusGuia()` - Alterar status
- ✅ `gerarNumeroGuia()` - Gerar números únicos

### 2. **Tabela Supabase: `billing_guides`**

Migração SQL cria tabela com campos:

```sql
CREATE TABLE billing_guides (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL,
  numero_guia VARCHAR(50) UNIQUE,     -- Ex: GC001-2025-001
  tipo_guia VARCHAR(20),               -- SP, SADT, Internação
  status VARCHAR(30),
  paciente_nome VARCHAR(255),
  numero_carteirinha VARCHAR(100),    -- ✓ NOVO CAMPO
  convenio VARCHAR(255),
  plano VARCHAR(255),
  profissional VARCHAR(255),
  codigo_cbhpm VARCHAR(20),
  valor DECIMAL(10, 2),
  xml_path VARCHAR(500),
  data_criacao TIMESTAMP,
  data_atualizacao TIMESTAMP
);
```

### 3. **Componente Atualizado: `GuiasConsulta.jsx`**

O `handleSubmit` agora:

1. **Valida dados obrigatórios:**
   ```javascript
   if (!formData.numero_carteirinha.trim()) {
     throw new Error('Número de carteirinha é obrigatório');
   }
   ```

2. **Chama API para salvar:**
   ```javascript
   if (editingGuia) {
     await atualizarGuia(editingGuia.id, formData);
   } else {
     const novaGuia = await criarGuia(clinicId, formData);
   }
   ```

3. **Carrega dados reais:**
   ```javascript
   const data = await listarGuias(clinicId);
   setGuias(data);
   ```

---

## 🚀 Como Aplicar

### Passo 1: Aplicar Migração SQL

**Opção A: Via Supabase Studio**
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá para **SQL Editor**
4. Novo Query → Cole o SQL abaixo:

```sql
-- Criar tabela billing_guides para armazenar guias de consulta, internação e SADT
CREATE TABLE IF NOT EXISTS billing_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Informações básicas da guia
  numero_guia VARCHAR(50) UNIQUE NOT NULL,
  tipo_guia VARCHAR(20) NOT NULL DEFAULT 'SP',
  status VARCHAR(30) NOT NULL DEFAULT 'Aguardando XML',
  
  -- Dados do paciente
  paciente_nome VARCHAR(255) NOT NULL,
  numero_carteirinha VARCHAR(100) NOT NULL,
  
  -- Dados do convênio/plano
  convenio VARCHAR(255),
  plano VARCHAR(255),
  
  -- Dados do serviço
  profissional VARCHAR(255),
  codigo_cbhpm VARCHAR(20),
  valor DECIMAL(10, 2) DEFAULT 0,
  
  -- Observações e metadados
  observacoes TEXT,
  xml_path VARCHAR(500),
  
  -- Timestamps
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_envio TIMESTAMP WITH TIME ZONE,
  data_processamento TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT numero_carteirinha_not_empty CHECK (length(trim(numero_carteirinha)) > 0)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_billing_guides_clinic_id ON billing_guides(clinic_id);
CREATE INDEX IF NOT EXISTS idx_billing_guides_numero_guia ON billing_guides(numero_guia);
CREATE INDEX IF NOT EXISTS idx_billing_guides_status ON billing_guides(status);
CREATE INDEX IF NOT EXISTS idx_billing_guides_paciente ON billing_guides(paciente_nome);
CREATE INDEX IF NOT EXISTS idx_billing_guides_numero_carteirinha ON billing_guides(numero_carteirinha);

-- Habilitar RLS
ALTER TABLE billing_guides ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view guides from their clinic" 
ON billing_guides FOR SELECT
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id::text = auth.uid()::text));

CREATE POLICY "Users can insert guides in their clinic" 
ON billing_guides FOR INSERT
WITH CHECK (clinic_id IN (SELECT clinic_id FROM users WHERE id::text = auth.uid()::text));

CREATE POLICY "Users can update guides from their clinic" 
ON billing_guides FOR UPDATE
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id::text = auth.uid()::text));

CREATE POLICY "Users can delete guides from their clinic" 
ON billing_guides FOR DELETE
USING (clinic_id IN (SELECT clinic_id FROM users WHERE id::text = auth.uid()::text));
```

5. Clique em **Run** ou **Ctrl+Enter**

---

**Opção B: Via PowerShell**
```powershell
.\scripts\apply_billing_guides_migration.ps1
```

### Passo 2: Testar no Frontend

1. Abra a aplicação: `npm run dev`
2. Vá para: **Faturamento → Guias TISS → Guias de Consulta**
3. Clique em **+ Nova Guia**
4. Preencha os campos:
   - Nome do Paciente: Maria Silva Santos
   - **Número da Carteirinha: 123456789** ← Campo crítico
   - Convênio: Unimed
   - Plano: Empresarial
   - Profissional: Dr. João
   - Código CBHPM: 40101012
   - Valor: 150,00

5. Clique em **Criar Guia**
6. ✅ Deve exibir toast: "Guia criada com sucesso. Matrícula/Carteirinha: 123456789"

### Passo 3: Verificar Dados Salvos

No Supabase Studio:

```sql
SELECT * FROM billing_guides 
ORDER BY data_criacao DESC 
LIMIT 1;
```

Deve retornar:
```
numero_carteirinha: "123456789" ✅
paciente_nome: "Maria Silva Santos"
convenio: "Unimed"
status: "Aguardando XML"
```

---

## 📊 Arquivos Modificados

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/lib/guiasApi.js` | ✨ NOVO | API completa para gerenciar guias |
| `src/pages/clinica/faturamento/tiss/GuiasConsulta.jsx` | 🔧 MODIFICADO | handleSubmit agora chama API |
| `supabase/migrations/2026-02-21_create_billing_guides_table.sql` | ✨ NOVO | Migração SQL para tabela |
| `scripts/apply_billing_guides_migration.ps1` | ✨ NOVO | Script para aplicar migração |

---

## 🧪 Teste Completo

### Cenário 1: Criar Nova Guia
```
1. ✅ Preencher todos os campos (incluindo Carteirinha)
2. ✅ Clicar "Criar Guia"
3. ✅ Salvar em `billing_guides.numero_carteirinha`
4. ✅ Recarregar página → dados aparecem na tabela
```

### Cenário 2: Editar Guia
```
1. ✅ Clicar "Editar" em guia existente
2. ✅ Alterar numero_carteirinha
3. ✅ Clicar "Atualizar Guia"
4. ✅ Dados atualizados no banco
```

### Cenário 3: Validação
```
1. ✅ Tentar salvar sem preenchher Carteirinha
2. ✅ Exibir erro: "Número de carteirinha é obrigatório"
3. ✅ Desabilitar botão "Criar/Atualizar"
```

---

## 🔐 Segurança

- ✅ **RLS habilitado:** Usuários vêem apenas guias da sua clínica
- ✅ **Validação:** Campo carteirinha é obrigatório e não aceita vazio
- ✅ **Constraint:** `numero_carteirinha NOT NULL`
- ✅ **Índices:** Performance otimizada

---

## 📝 Logs de Depuração

Ao criar/atualizar guias, você verá logs como:

```
📝 Criando guia: {
  clinic_id: "uuid...",
  paciente_nome: "Maria Silva",
  numero_carteirinha: "123456789",
  convenio: "Unimed",
  ...
}
✅ Guia criada com sucesso: { id: "uuid...", ... }
```

---

## ❓ FAQ

**P: Por que o campo carteirinha não era salvo?**
R: O `handleSubmit` tinha apenas `console.log()` e não chamava nenhuma API.

**P: Preciso migrar dados existentes?**
R: Não, é uma nova tabela. Guias antigas podem ser importadas depois.

**P: O campo é realmente obrigatório?**
R: Sim, está marcado como `NOT NULL` no banco de dados.

**P: Posso editar guias depois de criadas?**
R: Sim, cada guia tem botão "Editar" que chama `atualizarGuia()`.

---

## 🎉 Resultado Esperado

✅ **Antes:** Número de carteirinha não era salvo
✅ **Depois:** Número de carteirinha é persistido no Supabase

A guia agora está **100% funcional** para captura e armazenamento de dados TISS!
