# Guia de Importação - Excel para Plano de Contas

## 📋 Visão Geral

O sistema agora permite **importar dados em massa** através de arquivos Excel (.xlsx) para:
- ✅ **Plano de Contas** (Chart of Accounts)
- ✅ **Contas a Pagar** (Bills)

## 🚀 Como Usar

### 1. Acessar o Formulário de Importação

1. Acesse: `/clinica/financeiro/plano-contas`
2. Clique no botão **"Importar Excel"** (canto superior direito)
3. Será aberto um dialog de importação

### 2. Baixar o Template

1. Na janela de importação, clique em **"⬇️ Baixar Template"**
2. Um arquivo Excel será baixado com a estrutura correta

### 3. Preencher o Template

#### **Para Plano de Contas:**

| Coluna | Tipo | Obrigatório | Descrição | Exemplo |
|--------|------|-------------|-----------|---------|
| **Código** | Texto | ✅ Sim | Código hierárquico da conta | `1`, `1.1`, `1.1.1` |
| **Nome** | Texto | ✅ Sim | Nome da conta | `Ativo`, `Caixa` |
| **Tipo** | Texto | ✅ Sim | Tipo contábil | `ATIVO`, `PASSIVO`, `RECEITA`, `DESPESA`, `PATRIMONIO` |
| **Natureza** | Texto | ✅ Sim | Natureza da conta | `CREDORA`, `DEVEDORA` |
| **Descrição** | Texto | ❌ Não | Descrição adicional | `Ativo geral da empresa` |

**Exemplo de dados:**

```
Código | Nome | Tipo | Natureza | Descrição
1      | ATIVO | ATIVO | DEVEDORA | Ativo geral
1.1    | Ativo Circulante | ATIVO | DEVEDORA | Ativo de curto prazo
1.1.1  | Caixa | ATIVO | DEVEDORA | Dinheiro em caixa
2      | PASSIVO | PASSIVO | CREDORA | Passivo geral
3      | RECEITA | RECEITA | CREDORA | Receita de serviços
4      | DESPESA | DESPESA | DEVEDORA | Despesa operacional
```

#### **Para Contas a Pagar:**

| Coluna | Tipo | Obrigatório | Descrição | Exemplo |
|--------|------|-------------|-----------|---------|
| **Data** | Data | ✅ Sim | Data de vencimento | `2026-05-12` ou `12/05/2026` |
| **Fornecedor** | Texto | ✅ Sim | Nome do fornecedor | `Fornecedor A` |
| **Valor** | Número | ✅ Sim | Valor da conta | `1500.00` ou `1500,00` |
| **Categoria** | Texto | ❌ Não | Categoria de despesa | `Serviços`, `Suprimentos` |
| **Descrição** | Texto | ❌ Não | Descrição da despesa | `Consultoria contábil` |

### 4. Validações Automáticas

O sistema valida automaticamente:

✅ **Plano de Contas:**
- Campos obrigatórios: Código, Nome, Tipo, Natureza
- Tipos válidos: `RECEITA`, `DESPESA`, `ATIVO`, `PASSIVO`, `PATRIMONIO`
- Natureza válida: `CREDORA`, `DEVEDORA`
- Código deve ser único por clínica

✅ **Contas a Pagar:**
- Campos obrigatórios: Data, Fornecedor, Valor
- Data em formato `YYYY-MM-DD`, `DD/MM/YYYY` ou `DD-MM-YYYY`
- Valor deve ser número positivo
- Aceita valores com `.` ou `,` como separador decimal

### 5. Enviar Arquivo

1. Clique na área de upload ou arraste o arquivo
2. Selecione seu arquivo Excel preenchido
3. Clique em **"Importar"**

### 6. Acompanhar o Progresso

- Uma barra de progresso mostrará o andamento
- Após conclusão, será exibido:
  - ✅ **Sucesso:** Número de registros importados
  - ❌ **Erro:** Detalhes do problema (linha e motivo)

---

## 📊 Estrutura do Excel

### Formatação Recomendada

```
┌─────────────────────────────────────────────────────────┐
│ Plano de Contas - Importação                           │
├──────┬──────────┬──────┬──────────┬────────────────────┤
│ Código │ Nome     │ Tipo │ Natureza │ Descrição        │
├──────┼──────────┼──────┼──────────┼────────────────────┤
│ 1    │ ATIVO    │ ATIVO│ DEVEDORA │ Ativo geral       │
│ 1.1  │ Caixa    │ ATIVO│ DEVEDORA │ Caixa e bancos    │
│ 2    │ PASSIVO  │PASSIVO│CREDORA  │ Passivo geral     │
└──────┴──────────┴──────┴──────────┴────────────────────┘
```

### Dicas Importantes

1. **Primeira linha = Cabeçalho:**
   - Não remova a primeira linha com os nomes das colunas
   - Nomes das colunas devem estar em português

2. **Caracteres especiais:**
   - Evite caracteres especiais no código (use apenas números e pontos)
   - Acentuação é permitida em nomes e descrições

3. **Dados duplicados:**
   - O sistema rejeitará códigos duplicados
   - Cada código deve ser único por clínica

4. **Linhas em branco:**
   - Não deixe linhas em branco no meio dos dados
   - Use apenas dados contínuos

---

## ⚠️ Tratamento de Erros

### Erro: "Nenhum dado válido encontrado"

**Causa:** Arquivo vazio ou formato incorreto
**Solução:**
- Verifique se as colunas têm os nomes corretos
- Garanta que existem dados além do cabeçalho
- Tente baixar novamente o template

### Erro: "Tipo inválido: ABC"

**Causa:** Tipo de conta não é um dos permitidos
**Solução:**
- Use apenas: `RECEITA`, `DESPESA`, `ATIVO`, `PASSIVO`, `PATRIMONIO`
- Verifique capitalização (maiúsculas)

### Erro: "Natureza inválida: XYZ"

**Causa:** Natureza não é `CREDORA` ou `DEVEDORA`
**Solução:**
- Use apenas: `CREDORA` ou `DEVEDORA`
- Verifique a capitalização

### Erro: "Data inválida: 13-13-2026"

**Causa:** Formato de data incorreto ou data inexistente
**Solução:**
- Use formatos: `YYYY-MM-DD`, `DD/MM/YYYY` ou `DD-MM-YYYY`
- Verifique se a data é válida (ex: mês 13 não existe)

### Erro: "Valor inválido: abc123"

**Causa:** Campo de valor contém texto ou é negativo
**Solução:**
- Use apenas números
- Valores devem ser positivos
- Separador decimal pode ser `.` ou `,`

---

## 📈 Fluxo de Importação

```
┌─────────────────────┐
│  Selecionar Arquivo │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   Parser Excel      │
│  (validação básica) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Validar Dados      │
│  (regras negócio)   │
└──────────┬──────────┘
           │
           ├─ ❌ Erro → Mostrar detalhes
           │
           ├─ ✅ Sucesso
           ▼
┌─────────────────────┐
│  Importar BD        │
│  (linha por linha)  │
└──────────┬──────────┘
           │
           ├─ ✅ Sucesso → Mostrar resumo
           │
           ├─ ❌ Erro → Rollback + detalhes
```

---

## 💡 Melhores Práticas

### ✅ Faça:

1. **Validar dados antes de importar:**
   - Verifique para duplicatas
   - Confirme tipos e naturezas

2. **Usar backup:**
   - Guarde uma cópia do arquivo original
   - Teste com dados pequenos primeiro

3. **Documentar estrutura:**
   - Mantenha um template padrão
   - Use comentários nas células quando necessário

4. **Importar em lotes:**
   - Divida grandes volumes em arquivos menores
   - Facilita identificação de erros

### ❌ Evite:

1. ❌ Deixar campos obrigatórios em branco
2. ❌ Usar valores inválidos para tipos/natureza
3. ❌ Importar dados não verificados
4. ❌ Modificar arquivo template sem necessidade

---

## 🔧 Troubleshooting

| Problema | Solução |
|----------|---------|
| Browser trava | Reduzir tamanho do arquivo (max 10MB) |
| Importação lenta | Desativar antivírus temporariamente |
| Dados não aparecem | Recarregar página (F5) |
| Erro "CORS" | Verificar permissões de rede |

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique este guia
2. Teste com o template oficial
3. Contate o suporte técnico

**Email:** suporte@gesclinic.com.br
**WhatsApp:** +55 11 99999-9999
