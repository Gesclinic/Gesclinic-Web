# 💡 EXEMPLOS PRÁTICOS - CAPTURA DE FOTO

## 👤 Caso 1: Novo Paciente (Desktop)

### Cenário
Maria acessa a clínica no desktop para cadastrar um novo paciente.

### Passo a Passo

```
1. URL: localhost:3000/clinica/pacientes/novo

2. FORMULÁRIO - Dados Essenciais
   ├── Nome Completo: João Silva Oliveira
   ├── CPF: 123.456.789-00
   ├── Data: 15/05/1990
   ├── Sexo: Masculino
   ├── Celular: (11) 99999-9999
   └── Telefone: (11) 3333-4444

3. FOTO DO PACIENTE
   ├── Clica "Abrir Câmera"
   ├── Permite acesso (ícone 🔒 → Always allow)
   ├── Webcam abre com vídeo ao vivo
   ├── Posiciona-se bem
   ├── Clica "Capturar Foto"
   └── Vê preview: "✓ Foto capturada!"

4. SALVAR
   └── Clica "Salvar Apenas"
       ↓
       Paciente criado com foto ✓
```

**Resultado:**
- ✅ Paciente "João Silva Oliveira" criado
- ✅ Foto armazenada em: `/patients/{clinicId}/xyz/photo_TIMESTAMP.jpg`
- ✅ URL salva em: `patients.photo_url`
- ✅ Redireciona para check-in

---

## 📱 Caso 2: Novo Paciente (Mobile)

### Cenário
Recepcionista usa smartphone para cadastrar cliente que chegou na clínica.

### Passo a Passo

```
1. URL (mobile): localhost:3000/clinica/pacientes/novo

2. FORMULÁRIO - Dados Essenciais
   ├── Nome: Maria dos Santos
   ├── CPF: 987.654.321-11
   ├── Data: 22/03/1985
   ├── Sexo: Feminino
   ├── Celular: (21) 98888-8888
   └── Telefone: (21) 2222-2222

3. FOTO DO PACIENTE
   ├── Clica "Abrir Câmera"
   ├── Permite acesso (pop-up do navegador)
   ├── Câmera frontal abre (padrão)
   ├── Nota: tela preta = câmera traseira melhor
   ├── Clica "🔄 Trocar Câmera"
   ├── Câmera traseira (melhor iluminação)
   ├── Clica "Capturar Foto"
   └── Vê preview com botão "🔄 Remover Foto"

4. SALVAR
   └── Clica "Continuar Cadastro"
       ↓
       Vai para etapa 2 (dados completos)
       ↓
       Clica "Salvar" final
       ↓
       Paciente completo com foto ✓
```

**Resultado:**
- ✅ Foto capturada com câmera traseira (boa qualidade)
- ✅ Paciente com dados completos
- ✅ Foto salva automaticamente

---

## 🖼️ Caso 3: Upload de Arquivo

### Cenário
Secretária quer cadastrar paciente com foto já existente da galeria.

### Passo a Passo

```
1. URL: localhost:3000/clinica/pacientes/novo

2. PREENCHE DADOS
   └── Nome, CPF, Data, Sexo, Celular, Telefone

3. FOTO DO PACIENTE
   ├── Clica "Selecionar Arquivo"
   ├── Abre seletor de arquivos
   ├── Navega até: Downloads/foto_paciente.jpg
   ├── Seleciona a imagem
   └── Vê preview da foto

4. SALVAR
   └── Clica "Salvar Apenas"
       ↓
       Arquivo convertido em base64
       ↓
       Upload para Storage
       ↓
       URL salva no banco ✓
```

**Resultado:**
- ✅ Foto importada do arquivo
- ✅ Redimensionada automaticamente
- ✅ Comprimida (JPEG 95%)

---

## ✏️ Caso 4: Editar Foto Existente

### Cenário
Paciente "João Silva" quer atualizar sua foto (ficou melhor).

### Passo a Passo

```
1. URL: localhost:3000/clinica/pacientes/abc123/dados

2. PÁGINA CARREGA
   ├── Exibe formulário com dados de João
   ├── Exibe foto atual (capturada antes)
   └── Seção "Foto do Paciente" pronta

3. ATUALIZAR FOTO
   ├── Clica "Abrir Câmera"
   ├── Câmera frontal abre
   ├── Nova foto com melhor iluminação
   ├── Clica "Capturar Foto"
   └── Vê nova preview

4. SALVAR
   ├── Clica "Salvar" (ao final da página)
   ├── Nova foto faz upload
   ├── URL atualizada no banco
   └── "✓ Dados atualizados!" ✓

5. VISUALIZAR
   └── Acessa novamente /dados
       └── Vê foto nova no preview
```

**Resultado:**
- ✅ Foto anterior substituída
- ✅ Nova foto armazenada com novo timestamp
- ✅ URL atualizada

---

## 🖼️ Caso 5: Galeria de Fotos

### Cenário
Admin quer ver foto do paciente (perfil/relatório).

### Passo a Passo

```
1. ACESSA PACIENTE
   └── /clinica/pacientes/abc123

2. VÊ PERFIL
   ├── Nome: João Silva
   ├── CPF: 123.456.789-00
   ├── Foto: [exibida]
   ├── Seção "Dados Cadastrais"
   └── Foto também em /dados

3. CLICA PARA AMPLIAR
   └── Modal com foto em tamanho maior
```

**Resultado:**
- ✅ Foto visível em múltiplos lugares
- ✅ URL pública carrega rápido
- ✅ Boa resolução para reconhecimento

---

## 🚫 Caso 6: Erro - Câmera Não Abre

### Cenário
Usuário tenta abrir câmera mas vê erro.

### Resolução

```
1. Clica "Abrir Câmera"
2. ERRO: "Não foi possível acessar a câmera"

3. SOLUÇÃO:
   a) Clique no 🔒 na barra de endereço
   b) Clique "Câmera" → "Always allow"
   c) Recarregue a página (F5)
   d) Tente novamente

4. ALTERNATIVA:
   └── Clique "Selecionar Arquivo"
       └── Upload de arquivo funciona normalmente
```

**Resultado:**
- ✅ Câmera autorizada
- ✅ Ou usa upload de arquivo

---

## 🔄 Caso 7: Remover e Refazer Foto

### Cenário
Usuário capturou foto desfocada e quer refazer.

### Passo a Passo

```
1. Foto capturada (desfocada)
   └── Vê preview com "✓ Foto capturada!"

2. CLICA "Remover Foto"
   └── Volta ao estado inicial
       ├── Botão "Abrir Câmera"
       └── Botão "Selecionar Arquivo"

3. CAPTURA NOVAMENTE
   ├── Clica "Abrir Câmera"
   ├── Câmera abre novamente
   ├── Posiciona-se melhor
   ├── Clica "Capturar Foto"
   └── Nova foto aparece (melhor qualidade!)

4. SALVA
   └── Clica "Salvar Apenas"
       └── Primeira foto descartada
       └── Segunda foto salva ✓
```

**Resultado:**
- ✅ Foto descartada
- ✅ Nova foto capturada
- ✅ Qualidade melhorada

---

## 📊 Caso 8: Integração com Check-in

### Cenário
Paciente chega na clínica. Recepção já tem foto no sistema.

### Passo a Passo

```
1. AGENDA - Check-in
   ├── Paciente: João Silva
   ├── Horário: 14:30
   └── Status: Confirmado

2. MODAL CHECKIN ABRE
   ├── Dados do paciente
   ├── Foto: [imagem do perfil]
   ├── Profissional confirma identidade
   └── Clica "Confirmar Check-in" ✓

3. HISTÓRICO
   └── Check-in registrado com foto
       (uso futuro: relatório/auditoria)
```

**Resultado:**
- ✅ Foto útil para identificação rápida
- ✅ Agiliza processo de check-in

---

## 📈 Caso 9: Relatório com Fotos

### Cenário (Futuro)
Admin gera relatório de pacientes cadastrados no mês com fotos.

```
RELATÓRIO
├── Paciente 1: João Silva
│   ├── CPF: 123.456...
│   ├── Data: 15/02
│   └── Foto: [miniatura]
│
├── Paciente 2: Maria Santos
│   ├── CPF: 987.654...
│   ├── Data: 15/02
│   └── Foto: [miniatura]
│
└── ... mais pacientes ...
```

---

## 🎯 Métricas de Sucesso

| Métrica | Valor |
|---------|-------|
| Tempo para capturar | < 30s |
| Tempo de upload | < 3s |
| Taxa de sucesso | > 95% |
| Compatibilidade | Chrome, Firefox, Safari, Edge |
| Mobile ready | ✅ 100% |

---

## 📝 Notas Importantes

1. **Foto é opcional** - Paciente cadastra mesmo sem foto
2. **Câmera real-time** - Preview antes de capturar
3. **Qualidade controlada** - JPEG 95% automático
4. **Segurança** - Apenas usuários autenticados fazem upload
5. **Velocidade** - URLs pré-geradas no Storage
6. **Fallback** - Se foto falhar, paciente continua sendo criado

---

## ✨ Dicas Profissionais

1. **Desktop:** Use câmera frontal com boa iluminação
2. **Mobile:** Prefira câmera traseira (melhor qualidade)
3. **Documento:** Posicione perpendicular à câmera
4. **Foto:** Luz frontal evita sombras
5. **Upload:** JPEG é mais rápido, PNG mais nítido

---

**Todos os exemplos prontos para testar!**
