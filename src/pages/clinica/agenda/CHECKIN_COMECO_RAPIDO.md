# 🚀 COMEÇO RÁPIDO — CHECK-IN DA RECEPÇÃO

## Em 3 passos simples:

### Passo 1️⃣: Copie os Componentes (30 segundos)
Crie a pasta `src/pages/clinica/agenda/views/components/` e copie:
- `CheckinChecklist.jsx`
- `CheckinFinanceiro.jsx`
- `CheckinAcoes.jsx`

E copie também:
- `CheckinRecepacao.jsx` para `src/pages/clinica/agenda/views/`

### Passo 2️⃣: Registre a Rota (1 minuto)

Em `src/AppRoutes.jsx`, importe e adicione:

```javascript
import CheckinRecepacao from "@/pages/clinica/agenda/views/CheckinRecepacao";

// Dentro da seção /clinica routes:
{
  path: "agenda/checkin",
  element: <ProtectedRoute><CheckinRecepacao /></ProtectedRoute>,
},
```

### Passo 3️⃣: Teste (2 minutos)

1. Faça login como **recepcionista**
2. Acesse: `http://localhost:3000/clinica/agenda/checkin`
3. Selecione um paciente
4. Confira as 3 abas
5. Clique em "LIBERAR PARA ATENDIMENTO" (se tudo OK)

---

## 🎯 O Que Você Consegue

✅ **Recepção valida paciente antes de atender**  
✅ **Profissional só vê pacientes liberados**  
✅ **Checklist inteligente (dinâmico por tipo de convênio)**  
✅ **Bloqueia liberação sem dados completos**  
✅ **Registra WHO liberou, WHEN liberou**  
✅ **Sem glosa, sem conflito, sem erro operacional**  

---

## 🧠 Lógica Simples

```
PACIENTE CHEGA
     ↓
[ Dados OK? ] → ✅ Sim
[ Convênio/Pagto OK? ] → ✅ Sim
[ Clica LIBERAR ]
     ↓
Status = LIBERADO_PARA_ATENDIMENTO
Profissional vê imediatamente
```

---

## 💬 Perguntas Rápidas

**P: Onde eu acesso?**
R: `/clinica/agenda/checkin`

**P: Quem pode acessar?**
R: Recepcionista e Gestor (Profissional não)

**P: Qual é a regra de liberação?**
R: Checklist 100% completo + Financeiro OK = pode liberar

**P: Se algo estiver pendente?**
R: Botão fica cinza (desabilitado) com mensagem clara do que falta

**P: E se esquecer de liberar?**
R: Profissional não vê o paciente (fica invisível para ele)

---

## 📁 Arquivos Importantes

| Arquivo | O que é |
|---------|---------|
| `CheckinRecepacao.jsx` | Tela principal |
| `CheckinChecklist.jsx` | Aba do checklist |
| `CheckinFinanceiro.jsx` | Aba de convênio/pagamento |
| `CheckinAcoes.jsx` | Aba de botões (liberar, marcar falta) |
| `CHECKIN_RECEPACAO_GUIA.md` | Guia técnico completo |
| `CHECKIN_TESTE_RAPIDO.md` | Como testar |

---

## ⚡ O Que Muda

**Antes:**
- Recepção marca chegada em algum lugar
- Não há validação clara
- Profissional vê todos os pacientes (até incompletos)
- Resulta em: glosa, conflito, erro

**Depois:**
- Recepção faz check-in estruturado com checklist
- Validações claras (dados, convênio, pagamento)
- Profissional vê APENAS liberados
- Resulta em: tudo certo, nenhum erro

---

## 🎓 Conceitos

### Checklist Inteligente
Itens mudam conforme tipo de paciente:
- **Particular:** Forma de pagamento + Pagamento
- **Convênio:** Convênio OK + Carteira + Autorização + Guia

Sem tudo = não libera

### Bloqueios Automáticos
- Sem dados cadastrais → 🔴 Bloqueado
- Sem guia de convênio → 🔴 Bloqueado
- Sem forma de pagamento → 🔴 Bloqueado
- Tudo OK → ✅ Pode liberar

### Rastreamento
Registra automaticamente:
- **Quem** liberou (user_id)
- **Quando** liberou (data/hora)
- **O quê** (paciente X foi liberado para Y)

---

## 🔍 Validações Principais

```javascript
// Para liberar, tudo isto deve ser TRUE:

✅ patient_verified = true        // Dados OK
✅ service_name != null           // Serviço escolhido
✅ professional_name != null      // Profissional escolhido

Se CONVENIO:
✅ payer_verified = true          // Convênio validado
✅ card_verified = true           // Carteira OK
✅ authorization_verified = true  // Autorização OK
✅ guide_number != null           // Guia gerada

Se PARTICULAR:
✅ payment_method != null         // Forma de pagamento
✅ payment_received OR payment_authorized_after = true

// Se qualquer um for FALSE → 🔴 BLOQUEIA
```

---

## 📊 Fluxo em Diagrama

```
RECEPÇÃO                          PROFISSIONAL
═════════════════════════════════════════════════════

Acessa /checkin                   
    │                             
    ├─ Seleciona paciente         
    │                             
    ├─ Confere:
    │  • Dados                    
    │  • Convênio/Pagto           
    │                             
    ├─ Clica LIBERAR              
    │                             
    ├─ Status muda para:          
    │  LIBERADO_PARA_ATENDIMENTO  
    │                                   ↓
    │                             Vê paciente na 📅 Agenda
    │                             
    │                             Inicia atendimento
    │                             (marca EM_ATENDIMENTO)
    │                             
    │                             Finaliza
    │                             (marca FINALIZADO)
```

---

## ✨ Destaques

🎯 **Simples:** Layout claro, 3 abas, 1 botão principal  
🔒 **Seguro:** Validações em código (não em CSS)  
📱 **Responsivo:** Funciona em desktop e tablet  
⚡ **Rápido:** Polling a cada 30s, dados sempre atualizados  
📝 **Rastreado:** WHO + WHEN + WHAT registrado  
🎨 **Bonito:** Cores visuais claras, ícones, mensagens  

---

## 🛠️ Requisitos Técnicos

- React 18+
- Tailwind CSS
- Lucide Icons (icons)
- Supabase (API)
- useAuth (contexto)
- useClinicContext (contexto)

Tudo já existe no projeto! Nenhuma dependência nova.

---

## 📞 Suporte Rápido

**Erro: "Nenhum agendamento"**
→ Verifique se existem agendamentos de hoje no banco

**Erro: "Botão liberar desabilitado"**
→ Checklist ou financeiro não está OK (veja a mensagem vermelha)

**Erro: "Profissional não vê paciente"**
→ Confirmação: ele não foi liberado! Volte para recepção

**Erro: "Permissão negada"**
→ Certifique-se de estar logado como recepcionista

---

## 🎉 Pronto!

Agora você tem a **Tela de Check-in da Recepção** completa e funcionando.

**Próximos passos:**
1. Integre (3 passos acima)
2. Teste (5 minutos em CHECKIN_TESTE_RAPIDO.md)
3. Implante (seu ciclo normal)

**Tempo total:** ~10 minutos (integração + teste)

🚀 Boa sorte!
