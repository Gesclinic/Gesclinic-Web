# 📸 CAPTURA DE FOTO - RESUMO VISUAL

## ✅ Implementação Completa

```
┌─────────────────────────────────────────────────────────────┐
│  CADASTRO NOVO PACIENTE                                     │
│  /clinica/pacientes/novo                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Etapa 1: Dados Essenciais                                  │
│                                                              │
│  □ Nome Completo        *  ┌──────────────────────────────┐ │
│  □ CPF                   *  │ João da Silva                │ │
│  □ Data de Nascimento    *  └──────────────────────────────┘ │
│  □ Sexo                  *  ○ Masculino ○ Feminino          │
│  □ Celular               *  (11) 99999-9999                  │
│  □ Telefone              *  (11) 3333-4444                   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📸 Foto do Paciente                                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  ┌────────────────────────────────────────────────┐ │   │
│  │  │                                                │ │   │
│  │  │        [ 📷 Abrir Câmera ]                   │ │   │
│  │  │        [ 📁 Selecionar Arquivo ]             │ │   │
│  │  │                                                │ │   │
│  │  └────────────────────────────────────────────────┘ │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [ Cancelar ]  [ ✓ Salvar Apenas ]  [ → Continuar ]│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎥 Fluxo da Câmera

```
┌─────────────────────────────────────────────────────────────┐
│  CÂMERA ATIVA                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │          [   Vídeo ao vivo aqui  ]                 │   │
│  │          [   Seu rosto/documento   ]                 │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [ 🔄 Trocar Câmera ]     [ ✕ Cancelar ]          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  [ 📷 Capturar Foto ]                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## ✓ Foto Capturada

```
┌─────────────────────────────────────────────────────────────┐
│  FOTO CAPTURADA                                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                                                      │   │
│  │       [    Preview da Foto    ]                    │   │
│  │       [    Foto do Paciente    ]                    │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ✓ Foto capturada com sucesso!                              │
│                                                              │
│  [ 🔄 Remover Foto ]                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🗂️ Edição de Dados Completos

```
┌─────────────────────────────────────────────────────────────┐
│  DADOS CADASTRAIS COMPLETOS                                 │
│  /clinica/pacientes/:id/dados                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  📸 Foto do Paciente                                │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │                                                      │   │
│  │  Foto Atual          Atualizar Foto                │   │
│  │  ┌────────────────┐  ┌─────────────────────────┐   │   │
│  │  │                │  │  [📷] [📁]              │   │   │
│  │  │    [Imagem]    │  │                         │   │   │
│  │  │                │  └─────────────────────────┘   │   │
│  │  └────────────────┘                                │   │
│  │                                                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  👤 Dados Pessoais                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Nome Completo:      [___________________________]          │
│  CPF:                [___________________________]          │
│  Data de Nascimento: [___________]  Sexo: [_______]        │
│  ...                                                        │
│                                                              │
│  [ ✓ Salvar ] [ ← Voltar ]                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Arquitetura Técnica

```
COMPONENTES
├── PhotoCapture.jsx
│   ├── startCamera() → Ativa webcam
│   ├── capturePhoto() → Canvas → Data URL
│   ├── uploadPatientPhoto() → Supabase Storage
│   └── handleFileSelect() → File input → Data URL
│
├── PatientCadastroPage.jsx
│   ├── formData.photo ← PhotoCapture
│   ├── handleSave()
│   └── createPatientWithPhoto()
│
└── PatientDadosPage.jsx
    ├── PhotoCapture (edição)
    ├── uploadPatientPhoto()
    └── updatePatientPhoto()

API (patientsApi.js)
├── uploadPatientPhoto(clinicId, patientId, photoDataUrl)
│   ├── Fetch → Blob
│   ├── Storage.upload() → fileName
│   └── getPublicUrl() → photoUrl
│
├── updatePatientPhoto(patientId, photoUrl)
│   └── Update patients.photo_url
│
└── createPatientWithPhoto(clinicId, data, photo)
    ├── Insert patient
    ├── uploadPatientPhoto()
    └── updatePatientPhoto()

STORAGE (Supabase)
└── patient-photos/
    └── patients/{clinicId}/{patientId}/
        └── photo_TIMESTAMP.jpg
            └── URL pública
```

## 🔄 Fluxo de Dados

```
User Input
    ↓
[Câmera ou Arquivo] → Video Stream ou File Object
    ↓
[Canvas ou FileReader] → Data URL (base64)
    ↓
[formData.photo] → State do componente
    ↓
[Ao Salvar] → createPatientWithPhoto()
    ↓
[uploadPatientPhoto()] → Supabase Storage
    ↓
[getPublicUrl()] → photoUrl
    ↓
[updatePatientPhoto()] → Salva URL no BD
    ↓
[patients.photo_url] ← Exibido em visualizações
```

## 💾 Banco de Dados

```
TABLE: patients
├── id (UUID)
├── clinic_id (UUID FK)
├── name (TEXT)
├── document_id (TEXT)
├── birthdate (DATE)
├── gender (CHAR)
├── cell_phone (TEXT)
├── phone (TEXT)
│
├── photo_url ← NOVO
│   └── URL pública do Supabase Storage
│
├── ... outros campos
```

## 📊 Recursos

| Recurso | Status | Descrição |
|---------|--------|-----------|
| Câmera (webcam) | ✅ | Acesso via getUserMedia() |
| Câmera (arquivo) | ✅ | Upload de galeria |
| Câmera (alternância) | ✅ | Frontal ↔ Traseira |
| Compressão | ✅ | JPEG 95% qualidade |
| Storage | ✅ | Supabase + URL pública |
| BD | ✅ | Coluna photo_url |
| Segurança | ✅ | RLS policies |
| Fallback | ✅ | Paciente criado se foto falhar |

## 🚀 Próximas Fases

```
Fase 1: ✅ CONCLUÍDA
├── Captura de foto (câmera)
├── Upload de arquivo
├── Armazenamento (Storage)
└── Exibição em perfil

Fase 2: 🔄 PLANEJADA
├── Edição de foto (recortar/girar)
├── Galeria de múltiplas fotos
├── Histórico de fotos
└── Comparação antes/depois

Fase 3: 📋 FUTURO
├── Reconhecimento facial
├── Verificação de identidade
├── Filtros em câmera
└── Documentos (RG/CNH)
```

---

**✨ Ferramenta liberada e pronta para uso!**
