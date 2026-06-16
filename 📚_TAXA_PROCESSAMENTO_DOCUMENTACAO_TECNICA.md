# 📚 Documentação Técnica - Sistema de Taxas de Processamento de Cartão

## 1. Visão Geral

O sistema de Taxas de Processamento permite que clínicas configurem diferentes taxas de processamento de cartão por:
- **Operadora**: (Stone, PagBank, PagSeguro, Mercado Pago, Rede, Cielo)
- **Bandeira**: (Visa, Mastercard, Elo, Amex, Hipercard, Discover)
- **Forma de Recebimento**: (D+0, D+1, D+30, Payment Day)

## 2. Arquitetura

### 2.1 Banco de Dados

#### Tabela: `card_processors`
```sql
CREATE TABLE card_processors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  settlement_day INT NOT NULL CHECK (settlement_day BETWEEN 1 AND 31),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, name)
);
```

**Índices:**
- `clinic_id` (isolamento por clínica)
- `is_active WHERE is_active = true` (queries otimizadas)

**RLS Policy:**
```sql
clinic_id = (SELECT clinic_id FROM users WHERE id = auth.uid())
```

#### Tabela: `card_processor_fees`
```sql
CREATE TABLE card_processor_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  card_processor_id UUID NOT NULL REFERENCES card_processors(id),
  card_brand VARCHAR(50) NOT NULL,
  settlement_type VARCHAR(50) NOT NULL,
  fee_percent DECIMAL(5,2) NOT NULL CHECK (fee_percent BETWEEN 0 AND 100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(clinic_id, card_processor_id, card_brand, settlement_type)
);
```

**Índices:**
- `clinic_id` (isolamento)
- `card_processor_id` (queries por operadora)
- `is_active WHERE is_active = true`

### 2.2 API Layer (`src/lib/`)

#### `cardProcessorsApi.js`
Funções para gerenciar operadoras de cartão:

```javascript
// Listar todas as operadoras ativas de uma clínica
listCardProcessors(clinicId: string): Promise<Processor[]>

// Obter uma operadora específica
getCardProcessor(processorId: string): Promise<Processor>

// Criar nova operadora
createCardProcessor(clinicId: string, data: {
  name: string,
  settlement_day: number (1-31),
  notes?: string
}): Promise<Processor>

// Atualizar operadora
updateCardProcessor(processorId: string, data: Partial<Processor>): Promise<void>

// Deletar operadora (soft delete)
deleteCardProcessor(processorId: string): Promise<void>
```

**Validações:**
- `name`: Convertido para UPPERCASE, máximo 100 caracteres
- `settlement_day`: Clamped entre 1-31
- Clinic isolation via `clinic_id` no formulário

#### `processorFeesApi.js`
Funções para gerenciar taxas por operadora:

```javascript
// Listar taxas (com filtro opcional por operadora)
listProcessorFees(clinicId: string, processorId?: string): Promise<Fee[]>

// Obter taxa específica
getProcessorFee(feeId: string): Promise<Fee>

// Buscar por combinação (operadora + bandeira + forma)
getProcessorFeeByCombo(
  clinicId: string,
  processorId: string,
  cardBrand: string,
  settlementType: string
): Promise<Fee>

// Criar nova taxa
createProcessorFee(clinicId: string, data: {
  processorId: string,
  cardBrand: string,
  settlementType: string,
  feePercent: number (0-100)
}): Promise<Fee>

// Atualizar taxa
updateProcessorFee(feeId: string, data: Partial<Fee>): Promise<void>

// Deletar taxa (soft delete)
deleteProcessorFee(feeId: string): Promise<void>
```

**Validações:**
- `cardBrand`: Convertido para UPPERCASE
- `feePercent`: Validado entre 0 e 100
- Unicidade: Uma taxa por combinação de operadora + bandeira + forma

### 2.3 UI Layer (`src/pages/clinica/financeiro/`)

#### `CartasOperadorasPage.jsx`
Página CRUD para gerenciar operadoras de cartão.

**Componentes:**
- Form: Inputs para nome, dia de crédito, observações
- List: Tabela com operadoras cadastradas
- Actions: Edit (preenche form) e Delete (soft delete com confirmação)

**Estados:**
- `processors`: Array de operadoras
- `editingId`: ID da operadora em edição
- `loading`: Estado de carregamento
- `error/success`: Mensagens de feedback

#### `CartasProcessadorTaxasPage.jsx`
Página CRUD para gerenciar taxas por operadora.

**Layout (3 colunas):**
1. **Left Panel (Form)**: Seleciona operadora, bandeira, forma, taxa %
2. **Right Panel (List)**: Exibe todas as taxas com edit/delete
3. **Right Panel (Summary)**: Estatísticas das taxas

**Estados:**
- `processors`: Operadoras carregadas
- `fees`: Taxas configuradas (filtradas por operadora)
- `loadingProcessors/loadingFees`: Estados de carregamento
- `processorId, cardBrand, settlementType, feePercent`: Dados do form

**Validações no Form:**
- Todos os campos obrigatórios
- Taxa entre 0-100%
- Evita duplicação (UNIQUE no BD)

### 2.4 Routes & Navigation

**Em `AppRoutes.jsx`:**
```javascript
<Route path="financeiro/cartoes-operadoras" element={<CartasOperadorasPage />} />
<Route path="financeiro/cartoes-taxas-operadoras" element={<CartasProcessadorTaxasPage />} />
```

**Em `constants/menu.js`:**
```javascript
// Financeiro > Estrutura
{
  id: 'financeiro.cartoes-operadoras',
  label: 'Operadoras',
  path: '/clinica/financeiro/cartoes-operadoras',
  roles: ['admin', 'gestor'],
}
{
  id: 'financeiro.cartoes-taxas-operadoras',
  label: 'Taxas por Operadora',
  path: '/clinica/financeiro/cartoes-taxas-operadoras',
  roles: ['admin', 'gestor'],
}
```

## 3. Fluxo de Dados

```
Usuário (UI)
    ↓
CartasOperadorasPage / CartasProcessadorTaxasPage (React)
    ↓
cardProcessorsApi / processorFeesApi (Service Layer)
    ↓
Supabase Client (supabase.js)
    ↓
PostgreSQL (card_processors / card_processor_fees)
    ↓
RLS Policy (clinic isolation via auth.uid())
```

## 4. Isolamento por Clínica

**Mecanismo:**
- Todas as queries filtram por `clinic_id`
- RLS Policy verifica `auth.uid()` contra tabela `users`
- Nenhuma clínica pode ver dados de outra

**Implementação:**
```javascript
// Exemplo em cardProcessorsApi.js
const { data, error } = await supabase
  .from('card_processors')
  .select('*')
  .eq('clinic_id', clinicId)  // ← Filtro explícito
  .eq('is_active', true)
  .order('name');
```

## 5. Tratamento de Erros

**Padrão de erro:**
```javascript
try {
  // operação
} catch (err) {
  console.error('❌ [functionName] Error:', err);
  throw new Error(err.message || 'Mensagem genérica');
}
```

**Erros comuns:**
- `RLS policy violation`: Auth não configurado corretamente
- `Unique constraint violation`: Taxa duplicada
- `Invalid input`: Dados não validados

## 6. Dados Iniciais

**Seed Data (144 taxas):**
- 6 operadoras × 6 bandeiras × 4 formas = 144 combinações
- Taxas padrão:
  - D+0: 3.99%
  - D+1: 2.99%
  - D+30: 1.99%
  - Payment Day: 2.49%

## 7. Testes

**Arquivos de teste:**
- `src/lib/__tests__/cardProcessorsApi.test.js`
- `src/lib/__tests__/processorFeesApi.test.js`

**Cobertura:**
- Listar operadoras/taxas
- Criar com validação
- Atualizar
- Soft delete
- Tratamento de erros

**Executar testes:**
```bash
npm run test
```

## 8. Performance

**Otimizações:**
- Índices em `clinic_id`, `card_processor_id`, `is_active`
- Queries filtram por `is_active = true` por padrão
- Paginação implícita (sem limite explícito atual)

**Possíveis melhorias:**
- Adicionar paginação em listas grandes
- Cachear lista de operadoras por clínica
- Lazy load de taxas (infinito scroll)

## 9. Segurança

**Implementado:**
- ✅ RLS policies por clínica
- ✅ Validação de entrada (ranges, tipos)
- ✅ Soft delete (não remove dados, marca `is_active = false`)
- ✅ Normalização de dados (UPPERCASE para brands)

**Recomendações:**
- ⚠️ Adicionar audit trail de mudanças
- ⚠️ Implementar approval workflow para novas taxas
- ⚠️ Log todas as alterações com timestamp e user_id

## 10. Roadmap Futuro

- [ ] Importação CSV de taxas
- [ ] Histórico de alterações por taxa
- [ ] Integração com cálculo automático de receivable
- [ ] Relatórios de comparação entre operadoras
- [ ] Alertas para taxas acima de limite configurado
- [ ] Versionamento de tabelas de taxa (historical)
