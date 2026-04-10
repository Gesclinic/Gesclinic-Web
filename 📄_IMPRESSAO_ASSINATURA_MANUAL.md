# 📄 Impressão de Receita Digital para Assinatura Manual

## ✅ Nova Funcionalidade Implementada

Adicionado **botão "Imprimir para Assinatura Manual"** no Passo 3 do modal de Nova Receita.

### 🎯 Objetivo

Permitir que o profissional **imprima a receita em branco** (sem assinatura digital) e **assine manualmente** quando preferir uma abordagem tradicional.

## 📋 Como Funciona

### Passo 1: Criar Receita
1. Menu → Pacientes → Selecione um paciente
2. Aba **Receitas Digitais** → **+ Nova Receita**
3. Preencha medicamento, dose, frequência, duração
4. Clique **Próximo** (2x)

### Passo 2 (Novo): Escolher Método de Assinatura
No Passo 3 do modal agora há **2 botões**:

#### 📄 **"Imprimir para Assinatura Manual"** (NOVO)
- ✅ **Não requer** certificado digital selecionado
- ✅ Abre janela de impressão automaticamente
- ✅ Documento vem com **áreas em branco** para preenchimento manual
- ✅ Inclui linha para assinatura do profissional
- ✅ Inclui campo para CRM/UF
- ✅ Salva a receita no sistema

#### 🔐 **"Assinar com Certificado"** (ORIGINAL)
- ✅ Requer marca do checkbox "Usar certificado digital A1"
- ✅ Assinatura digital automática
- ✅ Gera QR Code MeMed
- ✅ Pronto para envio direto para farmácias

## 📋 Como é o Documento para Impressão?

### Conteúdo do PDF Impresso:
```
═══════════════════════════════════════════════════════════════
                      RECEITA DIGITAL
              Documento para Assinatura Manual

⚠️ ATENÇÃO: Este documento deve ser assinado manualmente pelo profissional

🏥 Clínica/Estabelecimento:
   Clínica XYZ
   CNPJ: XX.XXX.XXX/0001-XX
   Localização: São Paulo, SP

👤 Paciente:
   Marcia Gonzalez Martins Medeiros
   CPF: 123.456.789-00

👨‍⚕️ Profissional Responsável:
   Talvany Donizette
   CRM: _____________________ / UF: _____   [← Espaço para preenchimento]

💊 Medicamentos Prescritos:
   • Atorvastatina 20mg
     Dose: 1 comprimido
     Frequência: Uma vez ao dia
     Duração: 89 dias

📝 Observações:
   [Texto de observações se houver]

═══════════════════════════════════════════════════════════════
                    ASSINATURA E CARIMBO

   ________________                    ________________
   Assinatura do Profissional          Data


═══════════════════════════════════════════════════════════════
ℹ️ Informações Importantes:
   • Válida por 30 dias a contar da data de emissão
   • Conforme RDC nº 20/2011 e Lei nº 14.307/2022
   • Apresentar em qualquer farmácia brasileira
   • Medicamentos genéricos podem ser substituídos (Lei nº 9.787/99)

Gerado por Gesclinic - 01/03/2026
```

## 🖨️ Fluxo de Impressão

1. **Click em "Imprimir para Assinatura Manual"**
   ↓
2. **Sistema prepara o documento HTML**
   ↓
3. **Abre automaticamente janela de impressão do navegador**
   ↓
4. **Profissional clica "Imprimir"**
   ↓
5. **Documento pronto para assinatura manual**
   ↓
6. **Receita fica salva no sistema** (com flag `modo_assinatura: "manual"`)

## ✨ Características do Documento

### ✅ Campos Preenchidos Automaticamente:
- Dados da clínica (nome, CNPJ, cidade, UF)
- Dados do paciente (nome,  CPF)
- Nome do profissional
- Medicamentos + dosagem + frequência + duração
- Observações (se houver)
- Data e hora de emissão
- Informações legais

### ✅ Campos Deixados em Branco para Preenchimento Manual:
- **CRM/UF do profissional** - Espaço `_____________________ / _____`
- **Linha de assinatura** - Área grande para assinatura
- **Data de assinatura** - Campo para data

### ✅ Design Pronto para Impressão:
- Sem cores de fundo (economiza tinta)
- Sem elementos de certificado digital
- Sem QR Code
- Sem informações de assinatura digital
- Layout simples e claro
- Bordas e separadores para facilitar leitura

## 🔄 Comparação: Manual vs Digital

| Aspecto | Manual | Digital |
|---------|--------|---------|
| **Botão Clicado** | 📄 Imprimir para Assinatura Manual | 🔐 Assinar com Certificado |
| **Requer Certificado** | ❌ Não | ✅ Sim (checkbox obrigatório) |
| **Assinatura** | ✍️ Manuscrita | 🔐 Certificado Digital |
| **QR Code** | ❌ Não | ✅ Sim |
| **Formato** | 📄 Impresso | 🌐 Digital + PDF |
| **Envio Direto** | ❌ Manual na farmácia | ✅ Via MeMed |
| **Tempo Preparo** | ⚡ Instantâneo | ⏳ ~2 segundos |
| **Campo CRM** | ✍️ Manual | ✅ Automático |

## 📌 Quando Usar Cada Opção?

### Use **"Imprimir para Assinatura Manual"** quando:
- ✅ Profissional não tem certificado digital A1/A3
- ✅ Prefere método tradicional de assinatura
- ✅ Precisa manter cópia física assinada
- ✅ Sistema de certificado ainda está em configuração

### Use **"Assinar com Certificado"** quando:
- ✅ Profissional tem certificado digital ICP-Brasil
- ✅ Quer enviar direto para farmácia via MeMed
- ✅ Prefere fluxo totalmente digital
- ✅ Quer QR Code para validação

## 🔍 Detalhes Técnicos

### Props Passados:
- `patientCpf` - CPF do paciente
- `clinicName` - Nome da clínica
- `clinicCnpj` - CNPJ da clínica
- `clinicCity` - Cidade
- `clinicState` - Estado (UF)

### Dados Capturados:
- `medicamentos` - Array de fármacos com dosagem
- `observacoes` - Observações clínicas
- `data_emissao` - Data no formato pt-BR
- `hora_emissao` - Hora no formato pt-BR
- `modo_assinatura` - "manual" (para identificar tipo)

### Arquivo Modificado:
- **ReceitaDigitalModal.jsx**
  - ✅ Nova função `handleImprimirParaAssinatura()`
  - ✅ HTML para impressão com espaços em branco
  - ✅ Nova "Janela de impressão do navegador
  - ✅ Segundo botão no Passo 3

## 🎨 UX Improvements

1. **Dois botões lado a lado:**
   - Laranja (esquerda): Imprimir para Manual
   - Verde (direita): Assinar com Certificado

2. **Banner de aviso:**
   - Amarelo destacado: "ATENÇÃO: Este documento deve ser assinado manualmente"

3. **Feedback ao usuário:**
   - Toast message: "✅ Documento pronto para impressão!"
   - Receita salva automaticamente

4. **Impressão automática:**
   - Dialog de impressão abre automaticamente
   - Pronto para papel A4
   - Otimizado para impressoras padrão

## 🧪 Como Testar

### Cenário 1: Imprimir para Assinatura Manual
```
1. Pacientes → Marcia Gonzalez Martins Medeiros
2. Aba "Receitas Digitais"
3. "+ Nova Receita"
4. Passo 1: Adiciona "Losartana 50mg" + dose + frequência + duração
5. Clica "Próximo"
6. Passo 2: Adiciona observações (opcional)
7. Clica "Próximo"
8. Passo 3: Clica "*📄 Imprimir para Assinatura Manual"
   ↓ Resultado: Abre janela de impressão
   ✅ Documento mostra "ATENÇÃO: Para Assinatura Manual"
   ✅ Campo CRM vazio para preenchimento
   ✅ Linha de assinatura em branco
```

### Cenário 2: Assinar com Certificado (Original)
```
1. Mesmos passos 1-7
2. Passo 3: Marca checkbox "Usar certificado digital A1"
3. Clica "🔐 Assinar com Certificado"
   ↓ Resultado: Recebe QR Code e MeMed ID
   ✅ Receita com assinatura digital
```

## 📊 Benefícios

✅ **Flexibilidade** - Permite 2 métodos de assinatura
✅ **Conformidade** - Mantém registros mesmo sem certificado
✅ **Usabilidade** - Interface intuitiva
✅ **Impressão** - Otimizada para papel físico
✅ **Rastreabilidade** - Ambos os métodos salvos no sistema
✅ **Tempo** - Impressão instantânea, sem aguardar certificação

## 🚀 Próximos Passos

1. **Validar impressão** em diferentes navegadores
2. **Testar com impressoras** padrão
3. **Adicionar opção de salvar como PDF** (além de imprimir)
4. **Integrar com assinatura eletrônica** (carimbo digital)
5. **Relatório de receitas** (manual vs digital)

---

**Status:** ✅ **IMPLEMENTADO E PRONTO PARA TESTAR**

**Data:** 01/03/2026
