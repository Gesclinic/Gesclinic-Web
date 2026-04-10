# ✅ CHECKLIST - CAPTURA DE FOTO DO PACIENTE

## 🚀 Setup Supabase (PRIMEIRA VEZ)

- [ ] **Passo 1: Criar Bucket**
  1. Acesse https://app.supabase.com/
  2. Selecione seu projeto
  3. Vá em **Storage** (à esquerda)
  4. Clique **"Create bucket"**
  5. Nome: `patient-photos`
  6. Marque como **Public** ✓
  7. Clique **"Create bucket"**

- [ ] **Passo 2: Executar SQL**
  1. Acesse **SQL Editor** (à esquerda)
  2. Clique **"New query"**
  3. Cole o conteúdo de: `supabase/migrations/2026-02-02_setup_patient_photos.sql`
  4. Clique **"Run"**
  5. Espere "Query executed successfully"

- [ ] **Passo 3: Verificar RLS Policies**
  1. Vá em **Storage** → `patient-photos`
  2. Clique em **Policies** (abas)
  3. Deve ter 4 policies:
     - `Allow authenticated to upload`
     - `Allow public read`
     - `Allow authenticated to update`
     - `Allow authenticated to delete`

## 💻 Código (JÁ IMPLEMENTADO)

- [x] **PhotoCapture.jsx** (novo componente)
  - `src/components/PhotoCapture.jsx` criado
  - Captura de câmera funcionando
  - Upload de arquivo funcionando
  - Preview em tempo real

- [x] **patientsApi.js** (funções atualizadas)
  - `uploadPatientPhoto()` - Upload para Storage
  - `updatePatientPhoto()` - Atualiza foto no BD
  - `createPatientWithPhoto()` - Cria paciente com foto

- [x] **PatientCadastroPage.jsx** (integrado)
  - Import de PhotoCapture
  - Campo `photo` no formData
  - Chamada a `createPatientWithPhoto()`

- [x] **PatientDadosPage.jsx** (integrado)
  - Import de PhotoCapture
  - Seção "Foto do Paciente"
  - Exibe foto atual
  - Permite atualizar foto

## 🧪 Testes Funcionais

- [ ] **Novo Paciente com Câmera**
  1. Acesse `localhost:3000/clinica/pacientes/novo`
  2. Preencha: Nome, CPF, Data, Sexo, Celular, Telefone
  3. Clique **"Abrir Câmera"**
  4. Permita acesso à câmera (ícone 🔒)
  5. Clique **"Capturar Foto"**
  6. Veja preview com "✓ Foto capturada!"
  7. Clique **"Salvar Apenas"**
  8. ✓ Paciente criado com foto

- [ ] **Novo Paciente com Arquivo**
  1. Acesse `localhost:3000/clinica/pacientes/novo`
  2. Preencha dados
  3. Clique **"Selecionar Arquivo"**
  4. Escolha uma imagem do computador
  5. Veja preview
  6. Clique **"Salvar Apenas"**
  7. ✓ Paciente criado com foto

- [ ] **Editar Foto Existente**
  1. Acesse `/clinica/pacientes/:id/dados`
  2. Vá até "Foto do Paciente"
  3. Veja foto atual (se tiver)
  4. Clique **"Abrir Câmera"** ou **"Selecionar Arquivo"**
  5. Capture/selecione nova foto
  6. Clique **"Salvar"** no final da página
  7. ✓ Foto atualizada

- [ ] **Câmera Frontal vs Traseira** (mobile)
  1. Abra em um smartphone: `/clinica/pacientes/novo`
  2. Clique **"Abrir Câmera"**
  3. Clique **"🔄 Trocar Câmera"**
  4. ✓ Câmera alterna entre frontal e traseira

- [ ] **Remover Foto**
  1. Após capturar/selecionar foto
  2. Clique **"🔄 Remover Foto"**
  3. ✓ Volta ao estado inicial

## 🔍 Verificação Visual

- [ ] **Componente PhotoCapture renderiza**
  - Vê dois botões: "Abrir Câmera" e "Selecionar Arquivo"

- [ ] **Câmera abre corretamente**
  - Vê vídeo ao vivo
  - Vê botões "Trocar Câmera" e "Cancelar"
  - Vê botão "Capturar Foto"

- [ ] **Foto capturada mostra preview**
  - Imagem aparece na tela
  - Texto "✓ Foto capturada com sucesso!"
  - Botão "🔄 Remover Foto"

- [ ] **Dados do paciente aparecem**
  - Nome na breadcrumb
  - Foto no perfil

## 🐛 Troubleshooting

- [ ] **Câmera não abre**
  - [ ] Verifique permissão do navegador (🔒 na barra)
  - [ ] Teste com `https://` em produção
  - [ ] Feche outros apps usando câmera

- [ ] **Erro ao fazer upload**
  - [ ] Verifique conexão internet
  - [ ] Verifique bucket existe: `patient-photos`
  - [ ] Verifique RLS policies estão criadas

- [ ] **Foto não aparece após salvar**
  - [ ] Recarregue a página (F5)
  - [ ] Verifique column `photo_url` existe no BD
  - [ ] Verifique URL pública no Storage

- [ ] **Permissão negada**
  - [ ] Clique no cadeado 🔒 na barra de endereço
  - [ ] Selecione "Always allow" para câmera
  - [ ] Recarregue a página

## 📋 Documentação

- [ ] Leia: `📸_CAPTURA_FOTO_GUIA_RAPIDO.md`
- [ ] Leia: `📸_CAPTURA_FOTO_RESUMO_VISUAL.md`
- [ ] Leia: `📸_CAPTURA_FOTO_SETUP.md`

## 🎯 Pronto para Produção?

- [ ] Setup Supabase completo
- [ ] Testes funcionais passando
- [ ] Sem erros no console
- [ ] Documentação lida
- [ ] Permissões de câmera solicitadas
- [ ] Fotos salvando no Storage
- [ ] URLs aparecendo no BD

## ✨ Próximos Passos (Opcional)

- [ ] Adicionar avatar/badge de foto no menu
- [ ] Mostrar foto no checkin
- [ ] Galeria de fotos por paciente
- [ ] Comparação de fotos antiga vs nova

---

**Questões?** Consulte a documentação ou abra uma issue!
