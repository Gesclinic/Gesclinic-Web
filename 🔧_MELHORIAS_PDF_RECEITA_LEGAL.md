# 🔧 Melhorias no PDF - Informações Legais Obrigatórias

## ✅ O Que Foi Feito

Os componentes foram atualizados para **coletar e passar** as seguintes informações:

### 1. **ReceitasDigitaisTab.jsx** (ATUALIZADO)
✅ Agora importa `useClinicContext` 
✅ Passa dados da clínica para o modal:
- `clinicName` - Nome da clínica
- `clinicCnpj` - CNPJ 
- `clinicCity` - Cidade
- `clinicState` - UF

✅ Passa dados do paciente para o modal:
- `patientCpf` - CPF do paciente (extraído de `patientData.document_id`)

### 2. **ReceitaDigitalModal.jsx** (ATUALIZADO)
✅ Agora recebe props adicionais da clínica e paciente
✅ Inclui dados no `receitaData` que será enviado

## 📋 PRÓXIMO PASSO - Aplicar no PDF

O PDF HTML gerado em `handleDownloadReceita()` ainda precisa ser **melhorado** para incluir essas informações.

### Localização do HTML do PDF
**Arquivo:** `src/components/pacientes/tabs/ReceitasDigitaisTab.jsx`  
**Função:** `handleDownloadReceita(receitaId)` (por volta da linha 165)

### Código Atual (Parcial)
```jsx
<div class="info-section">
  <div class="info-label">Paciente:</div>
  <div class="info-value">${patientData?.name || "Paciente"}</div>
</div>

<div class="info-section">
  <div class="info-label">Profissional Responsável:</div>
  <div class="info-value">${receita.professional_name}</div>
</div>
```

### Código Melhorado (NOVO PADRÃO)
```jsx
<!-- SEÇÃO: IDENTIFICAÇÃO DA CLÍNICA (OBRIGATÓRIO) -->
<div class="info-section">
  <div class="info-label">🏥 Clínica/Estabelecimento:</div>
  <div class="info-value"><strong>${receita.clinic_name || "Clínica Não Informada"}</strong></div>
  ${receita.clinic_cnpj ? `<div class="info-value" style="font-size: 12px; color: #666;">CNPJ: ${receita.clinic_cnpj}</div>` : ''}
  ${receita.clinic_city && receita.clinic_state ? `<div class="info-value" style="font-size: 12px; color: #666;">Localização: ${receita.clinic_city}, ${receita.clinic_state}</div>` : ''}
</div>

<!-- SEÇÃO: DADOS DO PACIENTE (OBRIGATÓRIO) -->
<div class="info-section">
  <div class="info-label">👤 Paciente:</div>
  <div class="info-value"><strong>${patientData?.name || "Paciente"}</strong></div>
  ${receita.patient_cpf ? `<div class="info-value" style="font-size: 12px; color: #666;">CPF: ${receita.patient_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</div>` : ''}
</div>

<!-- SEÇÃO: PROFISSIONAL (OBRIGATÓRIO) -->
<div class="info-section">
  <div class="info-label">👨‍⚕️ Profissional Responsável:</div>
  <div class="info-value"><strong>${receita.professional_name}</strong></div>
</div>

<!-- SEÇÃO: DATA E HORA (OBRIGATÓRIO) -->
<div class="info-section" style="background-color: #f5f5f5; padding: 10px; border-radius: 5px;">
  <div class="info-label">📅 Emissão:</div>
  <div class="info-value">
    <strong>${receita.data_emissao || new Date().toLocaleDateString('pt-BR')}</strong> às 
    <strong>${receita.hora_emissao || new Date().toLocaleTimeString('pt-BR')}</strong>
  </div>
</div>

<!-- SEÇÃO: VALIDADE (RECOMENDADO) -->
<div class="info-section">
  <div class="info-label">⏱️ Validade da Receita:</div>
  <div class="info-value">30 dias a contar da data de emissão</div>
  <div class="info-value" style="font-size: 11px; color: #999;">Conforme RDC nº 20, de 5 de maio de 2011</div>
</div>

<!-- SEÇÃO: ASSINATURA DIGITAL (OBRIGATÓRIO) -->
<div class="info-section" style="background-color: #e8f5e9; padding: 10px; border-radius: 5px; border-left: 4px solid #4caf50;">
  <div class="info-label">🔐 Segurança Digital:</div>
  <div class="info-value">
    <strong>✓ Assinada Digitalmente</strong><br>
    <span style="font-size: 11px; color: #555;">Certificado ICP-Brasil em processamento<br>Código MeMed: ${receita.memed_id}</span>
  </div>
</div>

<!-- SEÇÃO: AVISO LEGAL (OBRIGATÓRIO) -->
<div class="footer" style="background-color: #fafafa; padding: 15px; border-radius: 5px; margin-top: 20px;">
  <p style="font-weight: bold; font-size: 12px; margin-bottom: 10px;">⚖️ Informações Legais</p>
  <p style="font-size: 10px; line-height: 1.6; color: #666;">
    Esta receita foi digitalmente assinada com certificado digital ICP-Brasil e é válida conforme las legislações:<br>
    • <strong>RDC nº 20/2011</strong> - Regulação de receitas de medicamentos<br>
    • <strong>Lei nº 14.307/2022</strong> - Autoriza prescrição digital de medicamentos<br>
    • <strong>Instrução Normativa nº 10/2022</strong> - Requisitos técnicos para receitas digitais<br><br>
    O paciente pode apresentar esta receita em qualquer farmácia brasileira. 
    Medicamentos genéricos podem ser substituídos por similares conforme a Lei nº 9.787/99.
  </p>
  <p style="font-size: 10px; color: #999; margin-top: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
    Gerado por: Gesclinic | Data de emissão: ${new Date().toLocaleString('pt-BR')} | MeMed ID: ${receita.memed_id}
  </p>
</div>
```

## 🎯 Como Aplicar

1. **Abra o arquivo:** `src/components/pacientes/tabs/ReceitasDigitaisTab.jsx`
2. **Localize:** A função `handleDownloadReceita(receitaId)` (por volta da linha 165)
3. **Encontre:** A seção que começa com `<div class="info-section">` para "Paciente"
4. **Substitua:** Por todo o código da seção **"PRÓXIMO PASSO - Aplicar no PDF"** acima
5. **Salve** e teste criando uma nova receita

## ✨ Resultado Final

O PDF agora terá:
- ✅ Identificação da clínica com CNPJ
- ✅ Dados do paciente com CPF formatado
- ✅ Profissional responsável
- ✅ Data e hora de emissão
- ✅ Validade da receita (30 dias)
- ✅ Certificação digital
- ✅ Aviso legal com legislações

## 📌 Informações que Já Estão Disponíveis

### Do contexto de Clínica:
```javascript
clinic.name       // Nome da clínica
clinic.cnpj       // CNPJ
clinic.city       // Cidade
clinic.state      // Estado (UF)
clinic.email      // Email
clinic.phone      // Telefone
```

### Do paciente:
```javascript
patientData.name           // Nome completo
patientData.document_id    // CPF
patientData.birthdate      // Data de nascimento
patientData.email          // Email
patientData.phone          // Telefone
```

### Do profissional (localStorage):
```javascript
sessionData.username  // Nome do profissional logado (Talvany Donizette)
sessionData.clinic_id // ID da clínica
```

## 🚀 CRM do Profissional (Próxima Fase)

Para incluir o CRM do profissional no PDF, você pode:

1. **Opção A (Rápido):** Adicionar campo manual no perfil do profissional
2. **Opção B (Completo):** Buscar do cadastro de profissionais no Supabase

Quando implementar, adicionar ao PDF:
```html
<div class="info-value" style="font-size: 12px; color: #666;">CRM: XXXXX/UF</div>
```

---

**Status:** ✅ Componentes atualizados e prontos!  
**Próximo:** Aplicar o código HTML melhorado no `handleDownloadReceita()`
