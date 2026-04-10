# 🎓 TUTORIAL - Comece Aqui em 2 Minutos

## Passo 1: Abra seu Navegador
```
1. Qualquer navegador (Chrome, Firefox, Edge, Safari)
2. Digite na barra de URL:
   
   http://localhost:3000/clinica/agenda-novo
   
3. Pressione ENTER
```

## Passo 2: Você Verá Esta Tela
```
┌────────────────────────────────────────────────────────────────┐
│ ◀  Terça-feira, 03 de fevereiro  ▶  [Dia|Sem|Mês]  [+ Novo]  │
├────────────────────────────────────────────────────────────────┤
│ [Geral] [Profissional] [Sala]            [Recepção ▼]          │
├────────────────────────────────────────────────────────────────┤
│ [🔍 Buscar...]  [▼ Filtros]  [Limpar ✕]                       │
├────────────────────────────────────────────────────────────────┤
│ ┌──────┬──────────┬────────────┬────────┬────┬──────────┐      │
│ │Horár.│ Paciente │Profissional│Serviço │Sala│ Status   │      │
│ ├──────┼──────────┼────────────┼────────┼────┼──────────┤      │
│ │09:00 │ João     │ Dr. Andreu │Consul. │C1  │[● Conf.] │      │
│ │09:30 │ [+ Agendar]        [Disponível]                       │
│ │10:00 │ Maria    │ Dra. Maria │Aval.   │C2  │[● Aguar.]│      │
│ └──────┴──────────┴────────────┴────────┴────┴──────────┘      │
└────────────────────────────────────────────────────────────────┘
```

## Passo 3: Teste os Componentes

### 🔄 Teste o Header (Cabeçalho)
```
1. Clique em ◀ (volta um dia)
   Resultado: Data muda para dia anterior

2. Clique em ▶ (próximo dia)
   Resultado: Data muda para próximo dia

3. Clique em [Dia]
   Resultado: Modo de visualização muda

4. Clique em [+ Novo]
   Resultado: Mensagem "Criar novo agendamento" no console
```

### 🎛️ Teste o Toolbar (Ferramentas)
```
1. Clique em [Profissional]
   Resultado: Modo muda para "por profissional"

2. Clique em [Sala]
   Resultado: Modo muda para "por sala"

3. Clique em [Recepção ▼]
   Resultado: Dropdown abre com opções

4. Volte para [Geral]
   Resultado: Volta à visualização geral
```

### 🔍 Teste os Filtros
```
1. Procure pelo campo de busca:
   └─ Digite "João"
      Resultado: Filtra apenas "João Silva"

2. Clique em [▼ Filtros]
   Resultado: Acordeão expande mostrando 5 filtros

3. Selecione um Profissional
   Resultado: Lista filtra por profissional

4. Clique em [Limpar ✕]
   Resultado: Todos os filtros resetam
```

### 📋 Teste a Tabela
```
1. Passe o mouse sobre "João Silva"
   Resultado: Ações aparecem (Ver | Editar | Cancelar)

2. Clique em qualquer ação
   Resultado: Mensagem no console mostrando ação

3. Veja o slot vazio (09:30)
   Resultado: Status em verde, com botão "+ Agendar"

4. Clique em "+ Agendar"
   Resultado: Mensagem no console
```

---

## 🎉 Pronto! Você Viu Tudo Funcionando!

Agora você pode:

### Opção A: Aprender Mais
- Leia: 🚀_TESTE_IMEDIATO_30_SEG.md (2 min)
- Leia: 📐_ESTRUTURA_COMPLETA.md (10 min)
- Leia: ✅_REFATORACAO_AGENDA_APLICADA.md (20 min)

### Opção B: Integrar Agora
- Abra: src/pages/clinica/agenda/components/index.jsx
- Copie os handlers
- Integre no seu AgendaPage.jsx

### Opção C: Customizar
- Edite cores em: StatusChip.jsx
- Edite filtros em: AgendaFiltersNew.jsx
- Edite layout conforme necessário

---

## 💡 Dicas Úteis

### Ver o Console (F12)
```
1. Pressione F12 no navegador
2. Clique na aba "Console"
3. Veja as mensagens de cada ação que fizer
```

### Abrir DevTools
```
Atalhos:
  Windows: F12 ou Ctrl+Shift+I
  Mac: Cmd+Option+I
  Firefox: F12
```

### Inspecionar Elementos
```
1. Pressione F12
2. Clique no ícone de seta (Inspect)
3. Clique em qualquer elemento da página
4. Veja o HTML/CSS no painel direito
```

---

## ❓ Se Algo Não Funcionar

### Componentes não aparecem?
```
1. Verifique a URL: http://localhost:3000/clinica/agenda-novo
2. Aguarde carregamento (pode levar 3-5 segundos)
3. Abra DevTools (F12) e veja o console para erros
4. Recarregue a página (Ctrl+R ou Cmd+R)
```

### Servidor não inicia?
```
1. Abra terminal na pasta do projeto
2. Execute: npm run dev
3. Aguarde mensagem "VITE ready in..."
4. Clique no link que aparece ou copie a URL
```

### Filtros não funcionam?
```
1. Clique no campo de busca
2. Digite algo
3. Veja a tabela filtrar em tempo real
4. Abra os filtros avançados (clique em "Filtros")
```

---

## 🎯 Próximas Ações Recomendadas

### Depois de testar (Hoje)
- [ ] Explore cada componente
- [ ] Leia documentação rápida
- [ ] Entenda como funciona

### Para integrar (Esta Semana)
- [ ] Copie código de example (index.jsx)
- [ ] Integre no seu AgendaPage.jsx
- [ ] Conecte com suas APIs

### Para produção (Próximas Semanas)
- [ ] Customize cores/estilos
- [ ] Teste com dados reais
- [ ] Deploy em staging
- [ ] Deploy em produção

---

## 📞 Precisa de Ajuda?

### Para entender os componentes
→ Leia: 📐_ESTRUTURA_COMPLETA.md

### Para integrar no seu código
→ Veja: src/pages/clinica/agenda/components/index.jsx

### Para troubleshoot
→ Leia: 🎬_VISUAL_ANIMADO_RESUMO.txt (seção FAQ)

### Para visão geral
→ Leia: 🎉_SUMARIO_EXECUTIVO.md

---

## ✅ Checklist Visual

```
□ Acessei a URL
  http://localhost:3000/clinica/agenda-novo

□ Vi o Header funcionando
  ◀ Data ▶ | [Dia|Sem|Mês] | [+ Novo]

□ Testei o Toolbar
  [Geral] [Profissional] [Sala] | [Perfil ▼]

□ Testei os Filtros
  Busca | Filtros colapsáveis | Limpar

□ Testei a Tabela
  Cliquei em ações | Testei agendamentos | Testei slots

□ Entendi como funciona
  Pronto para integrar!
```

---

## 🎊 Parabéns!

Você completou o tutorial de 2 minutos! Agora você:

✅ Viu a nova agenda em ação
✅ Testou todos os componentes
✅ Entendeu como funciona
✅ Está pronto para integrar

---

## 🚀 Próximo Passo

**Integração:**
1. Abra seu editor (VS Code)
2. Vá para: `src/pages/clinica/agenda/AgendaPage.jsx`
3. Copie a estrutura de: `src/pages/clinica/agenda/components/index.jsx`
4. Adapte para suas APIs

**Ou leia:**
- 📐_ESTRUTURA_COMPLETA.md → Entender a arquitetura
- ✅_REFATORACAO_AGENDA_APLICADA.md → Documentação técnica

---

**Está funcionando?** ✅ Então você está pronto!
**Quer integrar?** → Leia a documentação técnica
**Tem dúvida?** → Consulte o FAQ nos documentos

🎉 **Divirta-se com a nova agenda!** 🎉
