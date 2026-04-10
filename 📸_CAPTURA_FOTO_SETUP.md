# 📸 CAPTURA DE FOTO - SETUP SUPABASE

## ✅ Implementação Completa

A ferramenta de captura de foto foi integrada ao cadastro de pacientes!

## 🔧 SETUP SUPABASE STORAGE

Execute as seguintes etapas no Supabase:

### 1️⃣ Criar Bucket
```sql
-- No Supabase SQL Editor, execute:
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;
```

### 2️⃣ Configurar Permissões (RLS Policies)
```sql
-- Permitir upload de fotos
CREATE POLICY "Allow authenticated users to upload patient photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir leitura pública
CREATE POLICY "Allow public read access to patient photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'patient-photos');

-- Permitir exclusão
CREATE POLICY "Allow authenticated users to delete their photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-photos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

## 🎯 Funcionalidades

### PhotoCapture Component
- ✅ Captura via câmera (frontal/traseira)
- ✅ Upload de arquivo (galeria)
- ✅ Preview em tempo real
- ✅ Alternar câmera em dispositivos móveis
- ✅ Tratamento de erros

### Integração
- ✅ Adicionar foto ao cadastro de novo paciente
- ✅ Upload automático ao Supabase Storage
- ✅ Salvar URL da foto no banco de dados
- ✅ Fallback se foto falhar (paciente criado mesmo assim)

## 📁 Arquivos Modificados

1. **src/components/PhotoCapture.jsx** (NOVO)
   - Componente reutilizável para captura/upload
   
2. **src/lib/patientsApi.js**
   - `uploadPatientPhoto()` - Upload para storage
   - `updatePatientPhoto()` - Atualizar URL no BD
   - `createPatientWithPhoto()` - Criar paciente com foto
   
3. **src/pages/clinica/pacientes/PatientCadastroPage.jsx**
   - Integrado PhotoCapture no formulário
   - Campo `photo` adicionado ao formData

## 🚀 Uso

1. **Novo Paciente**
   - Acesse: `/clinica/pacientes/novo`
   - Preencha dados essenciais
   - Clique "Abrir Câmera" ou "Selecionar Arquivo"
   - Tire a foto ou selecione da galeria
   - Clique "Salvar" ou "Continuar Cadastro"

2. **Câmera**
   - Botão "Abrir Câmera" ativa a webcam
   - "Trocar Câmera" alterna entre frontal/traseira (mobile)
   - "Capturar Foto" salva a imagem

3. **Galeria**
   - "Selecionar Arquivo" abre seletor de arquivos
   - Formatos: JPEG, PNG, GIF, etc

## 🔐 Segurança

- ✅ Fotos armazenadas em `/patients/{clinicId}/{patientId}/`
- ✅ URL pública (apenas leitura)
- ✅ Compressão automática (95% qualidade JPEG)
- ✅ Limite de 1MB por imagem (navegador)

## 📝 Notas

- Se o upload de foto falhar, o paciente é criado mesmo assim
- Foto é opcional (não bloqueia o cadastro)
- Compatível com todos os navegadores modernos
- Melhor experiência em dispositivos móveis com câmera

## ✨ Próximas Integrações

- [ ] Editar foto em "Dados Cadastrais"
- [ ] Galeria de fotos do paciente
- [ ] Foto no prontuário
- [ ] Reconhecimento facial (futuro)
