# 🧪 Teste Rápido - Receitas Digitais MeMed

## ⚡ 30 Segundos de Setup

Pronto para testar? Você **não precisa fazer nada!** 

O sistema usa modo **simulado por padrão** e funciona 100% localmente.

---

## 🚀 Teste Passo-a-Passo (2 minutos)

### 1️⃣ Abrir Página do Paciente
```
Menu > Pacientes > Selecionar um paciente
```

### 2️⃣ Ver Nova Aba "Receitas Digitais"
```
✅ Você verá 6 abas na página:
   - Dados Pessoais ✓
   - Histórico Clínico ✓
   - Planos de Saúde ✓
   - Documentos ✓
   - Histórico Financeiro ✓
   - Receitas Digitais ⭐ NOVA
```

### 3️⃣ Criar Receita de Teste
```
Clique: "+ Nova Receita"

Preencherá automaticamente:
  ✓ Paciente: [Nome carregado]
  
Passo 1 - Medicamento:
  1. Digitar "Amoxicilina" no campo de busca
  2. Clique na sugestão "Amoxicilina 500mg"
  3. Dose: Digite "1 comprimido"
  4. Frequência: Selecione "De 8 em 8 horas (3x ao dia)"
  5. Duração: Digite "7"
  6. Clique "Adicionar Medicamento"

Resultado esperado:
  ✅ Medicamento aparece na lista
  ✅ Botão "Próximo" fica habilitado
  ✅ Clique "Próximo"

Passo 2 - Observações (opcional):
  1. Adicionar observação: "Tomar com alimentos"
  2. Clique "Próximo"

Passo 3 - Assinatura:
  1. Revisar resumo:
     • Medicamento: Amoxicilina 500mg
     • Dose: 1 comprimido
     • Frequência: De 8 em 8 horas
     • Duração: 7 dias
  
  2. Marcar checkbox: "Usar certificado digital A1"
  3. Clique "Assinar com Certificado"

Resultado:
  ✅ Modal fecha
  ✅ Receita aparece na lista
  ✅ Status: "✅ Assinada"
  ✅ QR Code gerado
```

---

## 🎯 Cenários de Teste

### ✅ Teste 1: Receita Simples (30 segundos)
```
[ ] Abir aba Receitas Digitais
[ ] Clique "+ Nova Receita"
[ ] Adicionar 1 medicamento
[ ] Clicar "Próximo" → "Próximo" → "Assinar com Certificado"
[ ] Verificar receita na lista com status "Assinada"

Resultado esperado: ✅ Receita aparece instantaneamente
```

### ✅ Teste 2: Múltiplos Medicamentos (1 minuto)
```
[ ] Clique "+ Nova Receita"
[ ] Adicionar "Amoxicilina"
[ ] Clique "+ Adicionar Medicamento" (sem avançar passo)
[ ] Adicionar "Dipirona 500mg" com dose diferente
[ ] Clique "+ Adicionar Medicamento"
[ ] Adicionar "Omeprazol 20mg"
[ ] Clique "Próximo"
[ ] Ver resumo com 3 medicamentos

Resultado esperado: ✅ 3 medicamentos aparecem no resumo
```

### ✅ Teste 3: QR Code (30 segundos)
```
[ ] Criar uma receita qualquer
[ ] Na lista, clicar botão "🔲" (Ver QR Code)
[ ] Verificar QR Code exibido na receita
[ ] Com celular, escanear QR Code
[ ] Verificar se URL é válida

Resultado esperado: 
  ✅ QR Code aparece na receita
  ✅ URL funciona (aponta para memed.com.br/rx/...)
```

### ✅ Teste 4: Deletar Receita (15 segundos)
```
[ ] Criar receita rápida
[ ] Clicar botão "❌" (Deletar)
[ ] Receita desaparece da lista

Resultado esperado: ✅ Lista atualizada instantaneamente
```

### ✅ Teste 5: Validação de Campos (30 segundos)
```
[ ] Clique "+ Nova Receita"
[ ] Tentar adicionar medicamento SEM preencher campos
[ ] Sistema mostra: "Campos obrigatórios"

Resultado esperado: ✅ Notificação de erro clara
```

---

## 🔍 Verificações Técnicas

### No Console do Navegador (F12 > Console)

Você verá logs como estes:

```javascript
// ✅ Teste 1: Receita criada
📝 Nova receita criada: {
  id: 1712345678,
  medicamentos: [...],
  status: "assinada",
  memed_id: "MED-1712345678",
  qr_code: "https://api.qrserver.com/v1/create-qr-code/?..."
}

// ✅ Teste 2: QR Code baixado
📥 Baixando receita: 1712345678

// ✅ Teste 3: Receita deletada
Receita deletada com sucesso
```

### Verificar Modo Simulado

```javascript
// Cole no console do navegador:
import { getMemedStatus } from '@/lib/memedApi';
const status = getMemedStatus();
console.log(status);

// Resultado esperado:
{
  configured: false,
  environment: "test",           // ✅ Modo teste
  hasApiKey: false,
  messageIfNotConfigured: "⚠️ Configure VITE_MEMED_API_KEY no .env"
}
```

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Aba não aparece | Recarregar página (F5) |
| "Componente não encontrado" | Verificar se PatientDetailPage compilou sem erros |
| Modal não abre | Clicar 2x no botão "+ Nova Receita" |
| Medicamento não busca | Deletar busca e tentar novamente |
| QR Code não aparece | Recarregar receita (F5) |
| Receita não salva | Verificar console (F12) para erros |

---

## 📊 Dados de Teste (Medicamentos Pré-carregados)

```javascript
// Estes medicamentos já estão no modal:
✅ Amoxicilina 500mg (Cápsula)
✅ Dipirona 500mg (Comprimido)
✅ Paracetamol 750mg (Comprimido)
✅ Ibuprofeno 400mg (Comprimido)
✅ Omeprazol 20mg (Cápsula)
✅ Metformina 500mg (Comprimido)
✅ Atorvastatina 20mg (Comprimido)
✅ Losartana 50mg (Comprimido)
```

Frequências disponíveis:
```
✅ De 8 em 8 horas (3x ao dia)
✅ De 12 em 12 horas (2x ao dia)
✅ Uma vez ao dia
✅ De 6 em 6 horas (4x ao dia)
✅ Conforme necessário
```

---

## ✅ Checklist de Teste Completo

- [ ] **Aba criada:** Receitas Digitais aparece com ícone emerald
- [ ] **Resumo visual:** Mostra contadores (Assinadas, Rascunhos, Total)
- [ ] **Lista vazia:** "Nenhuma receita criada ainda" com botão "Criar Primeira"
- [ ] **Modal abre:** "+ Nova Receita" abre modal com 3 passos
- [ ] **Busca funciona:** Digitar "Amo" filtra medicamentos
- [ ] **Adicionar funciona:** "+ Adicionar Medicamento" adiciona à lista
- [ ] **Removar funciona:** Botão "❌" remove medicamento
- [ ] **Validação funciona:** Sistema alerta se campo obrigatório vazio
- [ ] **Passo 2 funciona:** Observações opcionais salvam
- [ ] **Resumo aparece:** Passo 3 mostra todos os dados
- [ ] **Checkbox funciona:** Só permite assinar se marcado
- [ ] **Receita salva:** Após assinar, aparece na lista
- [ ] **Status certo:** Mostra "✅ Assinada"
- [ ] **QR Code existe:** Botão "🔲" exibe QR Code
- [ ] **Delete funciona:** "❌" remove receita da lista
- [ ] **Download mock:** "📥" mostra toast de sucesso
- [ ] **Sem erros console:** F12 > Console vazio ou com logs esperados

---

## 🎬 Vídeo Mental (Teste Rápido)

```
1️⃣ Abrir página paciente... 2 segundos
2️⃣ Clicar aba "Receitas Digitais"... 1 segundo
3️⃣ Clicar "+ Nova Receita"... 1 segundo
4️⃣ Buscar "Amoxic", clicar, preencher dose/freq/dur... 30 segundos
5️⃣ Clique "Próximo" → "Próximo"... 2 segundos
6️⃣ Marcar checkbox, clicar "Assinar"... 3 segundos
7️⃣ Verificar receita na lista... 1 segundo

⏱️ TEMPO TOTAL: ~40 SEGUNDOS ✅
```

---

## 📞 Suporte Rápido

Se tiver erro:

1. **Abrir Console:** F12
2. **Procurar erro vermelho:** Copiar mensagem exata
3. **Recarregar:** F5
4. **Limpar cache:** Ctrl+Shift+Del (selecionar tudo) → Limpar

---

## 🎓 Próximos Passos Após Teste

✅ **Passar no teste acima?** Ótimo!

Próximos passos:

1. **Conectar Banco de Dados** (próxima fase)
   - Criar tabelas em Supabase
   - Atualizar ReceitasDigitaisTab para carregar de BD

2. **Configurar MeMed Real** (opcional agora)
   - Obter API Key em https://dashboard.memed.com.br
   - Mudar VITE_MEMED_ENV de "test" para "production"

3. **Adicionar Certificado Real** (quando pronto)
   - Comprar certificado A1 ICP-Brasil
   - Fazer upload em novo formulário

4. **Melhorias Futuras**
   - PDF com receita
   - Email com QR Code
   - Integração farmácia
   - Notificação paciente

---

**Status:** ✅ **PRONTO PARA TESTAR AGORA**

**Tempo estimado para testar:** 2-5 minutos

**Difículdade:** ⭐ Muito Fácil

Aproveite! 🚀
