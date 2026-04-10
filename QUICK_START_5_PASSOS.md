# 🚀 QUICK START - 5 PASSOS PARA TESTAR

## ⏱️ Tempo Total: 5 Minutos

---

## PASSO 1: Iniciar o Servidor (1 min)

```bash
npm run dev
```

Aguarde até ver:
```
  ➜  Local:   http://localhost:3000/
```

---

## PASSO 2: Abrir no Navegador (30 seg)

```
http://localhost:3000
```

---

## PASSO 3: Fazer Login (30 seg)

```
Email: seu_email@example.com
Senha: sua_senha
```

---

## PASSO 4: Ir em Clínica (1 min)

1. Clique em **"Clínica"** no menu principal
2. Verifique o **menu lateral esquerdo**
3. Procure por **"Agenda"**

---

## PASSO 5: Validar Mudanças (2 min)

### ✅ Checklist Rápido

```
☐ Menu mostra "Agenda" (1 item, não 8)
   └─ Você deve ver:
      ├─ Confirmações
      ├─ Lista de Espera
      └─ Indicadores

☐ Clique em "Agenda"
   └─ Carrega página com TABS no topo:
      ├─ Geral
      ├─ Por Profissional
      └─ Por Sala

☐ Clique em TAB "Por Profissional"
   └─ URL continua: /clinica/agenda (não muda!)
   └─ Apenas conteúdo muda

☐ Clique em "Confirmações" (submenu)
   └─ URL muda: /clinica/agenda/confirmacoes ✅

☐ Clique em "Lista de Espera"
   └─ URL muda: /clinica/agenda/espera ✅

☐ Clique em "Indicadores"
   └─ URL muda: /clinica/agenda/indicadores ✅
```

Se todos ☑ estão OK, **Implementação bem-sucedida!** 🎉

---

## Se Algo Não Funcionar

### Menu ainda mostra 8 items?
```
Ctrl+Shift+Delete  (limpar cache)
F5  (reload)
```

### Submenu dá erro 404?
```
1. Abrir DevTools (F12)
2. Ver aba Console
3. Procurar por erros vermelhos
4. Recarregar página
```

### Tabs não aparecem?
```
1. Abrir DevTools (F12)
2. Ir em Elements
3. Procurar por <AgendaTabs
4. Se não achar, recarregar
```

### URL não redireciona?
```
1. Digitar: /clinica/agenda/profissional
2. Verificar se vai para /clinica/agenda
3. Se não, limpar cache e reload
```

---

## Próximos Passos

### Se Tudo Está OK ✅
```
1. Abra: AGENDA_VALIDACAO_ETAPA_7.md
2. Siga o checklist completo
3. Reportar resultado
```

### Se Há Problemas ❌
```
1. Consultar: AGENDA_PROXIMO_PASSOS.md (Troubleshooting)
2. Consultar: AGENDA_RESUMO_FINAL.md (Perguntas Frequentes)
3. Se persistir, verificar console do desenvolvedor
```

---

## 📚 Documentação Completa

Para mais detalhes:
```
👉 LEIA_INDICE_DOCUMENTACAO_AGENDA.md
```

---

**Pronto?** Comece pelo **PASSO 1**! 🚀

