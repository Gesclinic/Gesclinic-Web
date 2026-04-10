# 📸 CAPTURA DE FOTO DO PACIENTE - GUIA RÁPIDO

## ✅ Ferramenta Liberada!

A funcionalidade de captura de foto durante o cadastro de pacientes foi completamente implementada!

## 🚀 Como Usar

### 1️⃣ Novo Cadastro de Paciente
```
1. Acesse: /clinica/pacientes/novo
2. Preencha os dados essenciais
3. Na seção "Foto do Paciente", clique:
   ✓ "Abrir Câmera" - usar webcam/câmera do celular
   ✓ "Selecionar Arquivo" - upload da galeria
4. Tire a foto ou selecione da galeria
5. Clique "Capturar Foto" ou confirme a seleção
6. Clique "Salvar Apenas" ou "Continuar Cadastro"
```

### 2️⃣ Editar Foto Existente
```
1. Acesse: /clinica/pacientes/:id/dados
2. Vá até "Foto do Paciente"
3. Clique em "Abrir Câmera" ou "Selecionar Arquivo"
4. Tire/selecione a nova foto
5. Clique "Salvar" ao final da página
```

## 📸 Funcionalidades

### Câmera
- ✅ Acesso à webcam/câmera do dispositivo
- ✅ Alternância entre câmera frontal e traseira (mobile)
- ✅ Preview em tempo real
- ✅ Captura com um clique

### Galeria
- ✅ Selecione qualquer imagem do seu dispositivo
- ✅ Formatos: JPEG, PNG, GIF, WEBP, etc.
- ✅ Upload automático ao Supabase Storage

### Upload
- ✅ Armazenamento seguro no Supabase
- ✅ Compressão de qualidade para economizar espaço
- ✅ URL pública para visualização
- ✅ Fallback seguro (paciente criado mesmo se foto falhar)

## 🔧 Setup Supabase (Primeira Vez)

Se nunca executou o setup, siga estes passos:

### Passo 1: Criar Bucket
1. Acesse: https://app.supabase.com/
2. Seu projeto → Storage → "Create bucket"
3. Nome: `patient-photos`
4. Deixe como **Public**

### Passo 2: Executar SQL
1. Vá em "SQL Editor" → "New query"
2. Cole o conteúdo de: `supabase/migrations/2026-02-02_setup_patient_photos.sql`
3. Clique "Run"

### Passo 3: Testar
1. Vá para `localhost:3000/clinica/pacientes/novo`
2. Preencha os dados
3. Teste "Abrir Câmera" ou "Selecionar Arquivo"
4. Salve um paciente

## 📂 Arquivos Implementados

| Arquivo | Descrição |
|---------|-----------|
| `src/components/PhotoCapture.jsx` | Componente de captura e upload |
| `src/lib/patientsApi.js` | Funções de API para foto |
| `src/pages/clinica/pacientes/PatientCadastroPage.jsx` | Integração em novo paciente |
| `src/pages/clinica/pacientes/PatientDadosPage.jsx` | Integração em edição |
| `supabase/migrations/2026-02-02_setup_patient_photos.sql` | Script de setup |

## 🔒 Segurança

- ✅ Fotos armazenadas em `/patients/{clinicId}/{patientId}/`
- ✅ Apenas usuários autenticados podem fazer upload
- ✅ URLs públicas (apenas leitura)
- ✅ Compressão JPEG a 95% de qualidade
- ✅ Limite automático de 1MB (navegador)

## ⚠️ Permissões de Navegador

Se a câmera não funcionar:
1. Clique no cadeado 🔒 na barra de endereço
2. Permita acesso à câmera
3. Recarregue a página (F5)

## 💡 Dicas

- **Mobile:** A câmera traseira é melhor para iluminação
- **Desktop:** Certifique-se de permitir câmera no navegador
- **Qualidade:** Posicione bem longe da câmera para melhor foco
- **Arquivo:** JPG é mais rápido, PNG tem melhor qualidade

## ❌ Troubleshooting

| Problema | Solução |
|----------|---------|
| Câmera não abre | Verifique permissões do navegador |
| Erro de upload | Verifique conexão internet |
| Foto desfocada | Afaste mais da câmera |
| Tela preta | Câmera pode estar em uso por outro app |

## 🎯 Próximas Melhorias

- [ ] Editar foto após captura (recortar/girar)
- [ ] Galeria de fotos do paciente
- [ ] Comparação de fotos antiga vs nova
- [ ] Reconhecimento facial (futuro)

---

**Dúvidas?** Consulte a documentação completa em: `📸_CAPTURA_FOTO_SETUP.md`
