# 🔧 Configuração MeMed + Certificado Digital

## 📋 Pré-requisitos

Para integrar a plataforma MeMed com certificado digital ICP-Brasil, você precisa ter:

1. **Conta MeMed** - Cadastro em https://www.memed.com.br
2. **API Key MeMed** - Gerar em Dashboard > Integrações > API
3. **Certificado Digital ICP-Brasil** - A1 (.pfx) ou A3 (Token)
4. **CRM do Profissional** - Registro profissional válido

---

## 🔑 Variáveis de Ambiente

Adicione ao arquivo `.env`:

```env
# MeMed API
VITE_MEMED_API_URL=https://api.memed.com.br/v1
VITE_MEMED_API_KEY=sua-api-key-aqui
VITE_MEMED_ENV=test  # ou 'production'

# Certificado Digital (opcional - para produção)
VITE_MEMED_CERT_PATH=/path/to/certificado.pfx
```

---

## 📝 Setup Passo-a-Passo

### Passo 1: Obter API Key do MeMed

1. Acessar https://dashboard.memed.com.br/settings/api
2. Criar nova chave de API
3. Copiar a chave completa
4. Adicionar ao `.env` como `VITE_MEMED_API_KEY`

### Passo 2: Usar em Modo Teste (Recomendado Inicialmente)

O módulo `memedApi.js` detecta automaticamente `VITE_MEMED_ENV=test` e simula respostas.

```javascript
// Em src/lib/memedApi.js linha ~30:
const MEMED_CONFIG = {
  environment: import.meta.env.VITE_MEMED_ENV || "test", // ✅ Usa 'test' como default
};
```

### Passo 3: Testar Criação de Receita

```javascript
// No componente ReceitaDigitalModal.jsx:
import { createPrescription } from "@/lib/memedApi";

const receitaData = {
  patientName: "João Silva",
  patientCPF: "123.456.789-00",
  patientDOB: "1990-01-15",
  professionalName: "Dr. Maria",
  professionalCRM: "123456",
  medicamentos: [
    {
      codigo: "7891058000108",
      nome: "Amoxicilina 500mg",
      dose: "1 comprimido",
      frequencia: "3x ao dia",
      duracao_dias: 7,
      instrucoes: "Tomar com água"
    }
  ],
  observacoes: "Alérgico a penicilina",
};

try {
  const response = await createPrescription(receitaData);
  console.log("✅ Receita criada:", response);
  // response.qr_code conterá o URL do código QR
} catch (error) {
  console.error("❌ Erro:", error);
}
```

---

## 🔐 Certificado Digital (Produção)

### Tipos de Certificado

#### **A1 (Arquivo .pfx)**
- ✅ Melhor para integração automatizada
- ✅ Armazenável no servidor
- ⚠️ Expiração: até 1 ano
- 💰 Custo: R$ 200-500/ano

Fornecedores:
- Serasa Experian
- Certisign
- ICP-Brasil

#### **A3 (Token/Smart Card)**
- ✅ Maior segurança (requer presença física)
- ✅ Expiração: até 3 anos
- ⚠️ Requer leitor USB
- 💰 Custo: R$ 300-700/ano + leitor

---

## 📦 Integração com Banco de Dados

### Tabela para Armazenar Certificados

```sql
CREATE TABLE IF NOT EXISTS digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  certificate_type VARCHAR(10) NOT NULL, -- 'A1' ou 'A3'
  certificate_hash VARCHAR(255) UNIQUE NOT NULL,
  cn VARCHAR(255) NOT NULL, -- Common Name do certificado
  expires_at TIMESTAMPTZ NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_type CHECK (certificate_type IN ('A1', 'A3'))
);

-- Índice para busca rápida
CREATE INDEX idx_certificates_professional ON digital_certificates(professional_id);
```

### Tabela para Armazenar Receitas

```sql
CREATE TABLE IF NOT EXISTS receipt_prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  
  -- Dados da receita
  medications JSONB NOT NULL, -- Array de medicamentos com detalhes
  observations TEXT,
  
  -- MeMed
  memed_id VARCHAR(100) UNIQUE,
  memed_status VARCHAR(50) DEFAULT 'pendente', -- pendente, assinada, compartilhada, expirada
  validation_code VARCHAR(50) UNIQUE,
  qr_code_url TEXT,
  
  -- Assinatura e certificado
  certificate_id UUID REFERENCES digital_certificates(id),
  signed_at TIMESTAMPTZ,
  signature_hash VARCHAR(255),
  
  -- Compartilhamento
  shared_at TIMESTAMPTZ,
  shared_with_pharmacy BOOLEAN DEFAULT false,
  shared_with_patient BOOLEAN DEFAULT false,
  
  -- Controle
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  CONSTRAINT valid_memed_status CHECK (
    memed_status IN ('pendente', 'assinada', 'compartilhada', 'expirada', 'erro')
  )
);

CREATE INDEX idx_prescriptions_patient ON receipt_prescriptions(patient_id);
CREATE INDEX idx_prescriptions_professional ON receipt_prescriptions(professional_id);
CREATE INDEX idx_prescriptions_memed_id ON receipt_prescriptions(memed_id);
```

---

## 🚀 Fluxo Completo de Receita Digital

```
┌─────────────────────────────────────────────────────┐
│ 1. Profissional abre "Nova Receita Digital"         │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 2. Preenche dados (medicamentos, dosagem, etc)      │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 3. Seleciona certificado digital A1/A3             │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 4. Clica "Assinar com Certificado"                  │
│    - API MeMed recebe dados                        │
│    - Valida profissional/paciente                  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 5. MeMed retorna:                                    │
│    - Receita ID único                              │
│    - QR Code (PNG/URL)                             │
│    - Validation Code                               │
│    - Signature Hash (prova de assinatura)          │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 6. Sistema armazena em receipt_prescriptions        │
│    - Associa ao paciente                           │
│    - Armazena QR Code                              │
│    - Marca como "assinada"                         │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│ 7. Exibir receita para paciente com QR Code         │
│    - Opção: "Compartilhar com Farmácia"            │
│    - Opção: "Enviar por Email"                     │
│    - Opção: "Baixar PDF"                           │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testes com Modo Simulado

### Teste Local Sem API Key

O código já suporta modo simulado! Basta deixar `VITE_MEMED_ENV=test`:

```javascript
// memedApi.js detecta automaticamente
if (MEMED_CONFIG.environment === "test") {
  return simulateMemedResponse(payload); // Resposta simulada
}
```

**Benefícios:**
- ✅ Desenvolvimento sem API Key
- ✅ QR Code fictício gerado automaticamente
- ✅ Testar fluxo completo localmente
- ✅ Trocar para produção depois

---

## ⚙️ Configuração Avançada

### Usando Token A3 (Smart Card)

Para usar certificado A3 (token USB):

```javascript
// Em ReceitaDigitalModal.jsx
const [tokenInfo, setTokenInfo] = useState(null);

// Antes de assinar, obter info do token
async function detectToken() {
  try {
    const certs = await navigator.credentials?.get({
      mediation: "optional",
      signal: AbortSignal.timeout(5000)
    });
    setTokenInfo(certs);
  } catch (error) {
    console.error("Token não detectado:", error);
  }
}
```

### Renovação Automática de Certificado

```javascript
// Verificar expiração antes de usar
async function checkCertificateExpiration(certificateId) {
  const cert = await validateCertificate(certificateId);
  
  if (cert.days_until_expiration < 30) {
    // Alertar profissional para renovar
    toast({
      title: "⚠️ Certificado vencendo em " + cert.days_until_expiration + " dias",
      description: "Renove seu certificado digital",
      variant: "warning"
    });
  }
}
```

---

## 📊 Monitoramento

### Verificar Status do MeMed

```javascript
import { getMemedStatus } from "@/lib/memedApi";

const status = getMemedStatus();
console.log(status);
// {
//   configured: true,
//   environment: "test",
//   hasApiKey: true,
//   messageIfNotConfigured: "✅ MeMed configurado"
// }
```

### Logging de Receitas

```javascript
// Em ReceitasDigitaisTab.jsx
console.log('📋 Receita armazenada em BD:', {
  memed_id: receita.memed_id,
  qr_code: receita.qr_code_url,
  certificate_used: receita.certificate_id,
  signed_at: receita.signed_at,
});
```

---

## 🛠️ Troubleshooting

| Problema | Solução |
|----------|---------|
| "API Key inválida" | Verificar `VITE_MEMED_API_KEY` no `.env` |
| "Certificado expirado" | Renovar em fornecedor ICP-Brasil |
| "Erro ao compartilhar" | Verificar se paciente tem email cadastrado |
| "QR Code não funciona" | Testar URL em função `getPrescriptionQRCode()` |
| "Token não detectado" | Inserir Token USB e aguardar leitor |

---

## 📞 Suporte

- **MeMed Docs:** https://docs.memed.com.br
- **MeMed Support:** https://support.memed.com.br
- **ICP-Brasil:** https://www.gov.br/cidadania/pt-br/acesso-a-informacao/icp-brasil

---

## ✅ Checklist de Implementação

- [ ] Criar conta MeMed
- [ ] Gerar API Key
- [ ] Adicionar variáveis ao `.env`
- [ ] Testar modo simulado (sem certificado)
- [ ] Comprar certificado A1 ou A3
- [ ] Implementar upload de certificado
- [ ] Testar criação de receita em produção
- [ ] Implementar compartilhamento com farmácia
- [ ] Adicionar notificação ao paciente
- [ ] Documentar para profissionais

