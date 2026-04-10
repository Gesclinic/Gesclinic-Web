# 📱 QUICK START - RECEPÇÃO COMO DRAWER

**Acesso Rápido**: Clique em **🎫 Recepção** na barra de ferramentas da agenda  
**Atalho**: Botão verde com ícone 🎫 ao lado do botão de WhatsApp

---

## 🎯 CASOS DE USO

### Caso 1: Registrar Chegada de Paciente
```
1. Abrir drawer: Clique em 🎫 Recepção
2. Buscar paciente: Digite nome na search bar
3. Confirmar chegada: Clique em [Chegou]
4. Copiar Senha: Mostrar ao paciente (ex: Senha 001)
5. Fechar: Clique X ou saia do drawer
```

### Caso 2: Iniciar Consulta
```
1. Com paciente chegado (tem [Atender])
2. Clicar [Atender]
3. Preencher dados da consulta (TISS)
4. Salvar
5. Drawer recarrega automaticamente
```

### Caso 3: Ver Histórico do Dia
```
1. Abrir drawer
2. Visualizar todos os agendamentos do dia
3. Senhas aparecem em verde se registradas
4. Status visuais mostram "Confirmado", "Presença registrada"
```

### Caso 4: Encontrar Paciente Rápido
```
1. Abrir drawer
2. Digitar nome (ex: "Maria")
3. Lista filtra automaticamente
4. Encontrar e agir
```

---

## 🎨 INTERFACE VISUAL

```
┌─────────────────────────────────────────────────────┐
│ 🎫 Recepção                          [← em verde]  X │  ← Header
├─────────────────────────────────────────────────────┤
│ Pacientes agendados para hoje                       │
├─────────────────────────────────────────────────────┤
│ 🔍 Buscar paciente ou horário...                    │  ← Search
├─────────────────────────────────────────────────────┤
│                                                      │
│ ⏰ 14:30                                             │
│ João Silva                                   ← Nome  │
│ Serviço: Consulta                                   │
│ Dr. Pedro / Unimed                                  │
│ ✓ Confirmado                                        │
│                               [Chegou] [Atender]    │
│ ──────────────────────────────────────────────────  │
│                                                      │
│ ⏰ 14:45                                             │
│ Maria Santos                          [Chegou ✓]    │
│ Serviço: Limpeza                                    │
│ Dra. Ana / Unimed                                   │
│ ✓ Confirmado  🎟 Senha: 001  ✓ Presença reg        │
│                                     [Atender]       │
│ ──────────────────────────────────────────────────  │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## ⌨️ ATALHOS & DICAS

| Ação | Como Fazer |
|------|-----------|
| Abrir drawer | Clique 🎫 Recepção |
| Fechar drawer | Clique X ou clique no overlay escuro |
| Buscar paciente | Digite na search (sem Enter) |
| Registrar chegada | Clique [Chegou] |
| Ver senha | Está no badge verde ao lado |
| Iniciar consulta | Clique [Atender] |
| Recarregar lista | Feche e abra drawer novamente |
| Ver histórico | Senhas ficam salvas mesmo recarregando |

---

## 🔐 SENHAS & STATUS

### Sentidos das Cores

```
🟢 Verde/Esmeralda
   └─ Drawer aberto ou paciente chegou
   
🟡 Cinza Claro  
   └─ Drawer fechado ou agendamento pendente
   
🟣 Roxo
   └─ Status "Em atendimento"
```

### Senhas Geradas

- Sequenciais: 001, 002, 003, ...
- Resetam a cada dia
- Salvas em localStorage
- Mostram no badge verde

```
Exemplo do Dia:
├─ Paciente A → Senha 001
├─ Paciente B → Senha 002  
├─ Paciente C → Senha 003
└─ Próximas do dia seguinte → 001, 002, 003...
```

---

## 📋 STATUS E BADGES

```
✓ Confirmado
   → Agendamento confirmado

✓ Presença registrada
   → Paciente registrado como chegado

🎟 Senha: 00X
   → Senha para chamar paciente

Em atendimento
   → Consulta em andamento
```

---

## ❓ DÚVIDAS COMUNS

**P: Onde fica o botão?**  
R: Na barra de ferramentas, entre os filtros e o botão de WhatsApp. Procure pelo botão verde 🎫 Recepção.

**P: Posso editar a senha?**  
R: Não, senhas são geradas automaticamente. Se errar, feche o drawer e abra novamente para resetar.

**P: As senhas ficam salvas?**  
R: Sim! No localStorage do navegador. Duram enquanto a sessão aberta. Proximo dia = novo ciclo.

**P: Como resetar senhas?**  
R: Limpar cache do navegador (Ctrl+Shift+Del) ou esperar o novo dia.

**P: Surge erro ao atender?**  
R: Verifique conexão com Supabase. Se persistir, contate desenvolvedor.

**P: Pode atender paciente que não chegou?**  
R: Não permite. Clique [Chegou] primeiro para gerar senha.

**P: Funciona em mobile?**  
R: Sim, drawer se adapta. Mas melhor em desktop pela usabilidade.

---

## 🚀 CICLO DE TRABALHO RECOMENDADO

```
MANHÃ (Início do turno)
├─ Abrir Recepção drawer
├─ Contadores de pacientes esperando
└─ Manter drawer aberto todo turno

MEIO DO TURNO
├─ Paciente chega → [Chegou] 
├─ Ver senha gerada
├─ Avisar ao recepcionista/paciente
└─ Manter lista visível

QUANDO PRONTO PARA ATENDER  
├─ Paciente sobe para consultório
├─ Clique [Atender]
├─ Preench dados no modal
└─ Salvar → Drawer recarrega

FIM DO TURNO
├─ Fechar drawer
├─ Histórico fica salvo
└─ Próximo turno abre fresco (novo dia)
```

---

## 🎓 DICAS DE PRODUTIVIDADE

### Otimizar Fluxo
1. **Manter drawer visível**: Leve no canto da tela, não interfere na agenda
2. **Combinar com agenda**: Ver agendamentos + recepção ao mesmo tempo
3. **Usar search**: Não role, digite nome rapidinho
4. **Validar antes de chamar**: Confirme presença antes de dar senha

### Evitar Erros
- ❌ Não feche drawer durante atendimento
- ❌ Não clique [Chegou] 2x (gera senhas duplicadas)
- ✅ Sempre salve dados no AtendimentoModal
- ✅ Recarregue drawer após mudanças grandes

---

## 🔧 CONFIGURAÇÕES (Desenvolvedor)

Se precisar desabilitar ou customizar:

```javascript
// Em src/pages/clinica/agenda/components/index.jsx

// Desabilitar drawer:
// const [recepcaoDrawerOpen, setRecepcaoDrawerOpen] = useState(false);  // ← Trocar false por true

// Alterar atalho de teclado:
// useEffect(() => {
//   const handleKey = (e) => {
//     if (e.key === 'R' && e.ctrlKey) {
//       setRecepcaoDrawerOpen(!recepcaoDrawerOpen);
//     }
//   };
// }, []);

// Mudar tamanho do drawer:
// width="max-w-md" ← Em RecepcaoDrawer.jsx linha ~130
// (valores: max-w-sm, max-w-md, max-w-lg, max-w-2xl)

// Mudar cor do botão:
// className="bg-emerald-600" ← Trocar por outra cor Tailwind
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Drawer não abre?**
   - Contate administrador para verificar permissões

2. **Senhas não aparecem?**
   - Limpar cache: Ctrl+Shift+Del → Cookies/Cache
   - Reabrir browser

3. **AtendimentoModal não abre?**
   - Verificar conexão internet
   - Recarregar página (F5)

4. **Performance lenta?**
   - Feche outros abas/tabs
   - Reinicie o navegador

**Email Suporte**: [seu email]  
**Telefone**: [seu telefone]  
**Chat**: [link do chat]

---

## 📊 MÉTRICAS ESPERADAS

Com implementação correta:
- ⏱️ **Tempo para registrar chegada**: ~5 segundos
- 📊 **Visibilidade de fila**: 100% dos pacientes do dia
- ✅ **Taxa de erro**: 0% (sem crashes)
- 🚀 **Performance**: <500ms para abrir drawer

---

## ✨ PRONTO PARA USAR!

```
▪▫▫▫▫▫▫▫▫ 100% Completo
├─ ✅ Drawer funcional
├─ ✅ Senhas automáticas  
├─ ✅ Persistência de dados
├─ ✅ Integração com Atendimento
└─ ✅ Interface testada
```

**Aproveite! 🎉**
