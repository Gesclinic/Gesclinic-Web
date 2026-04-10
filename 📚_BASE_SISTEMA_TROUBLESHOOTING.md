# 🚨 TROUBLESHOOTING - BASE DO SISTEMA

## Guia de Solução de Problemas

---

## ❌ PROBLEMA: "Página em branco ao acessar Base do Sistema"

### Causa Possível 1: Usuário não autenticado
**Sintoma**: Página fica em branco ou redireciona para login
**Solução**:
1. Verifique se está logado no sistema
2. Verifique se o token de autenticação é válido
3. Limpe cookies: F12 → Application → Clear site data

### Causa Possível 2: clinic_id não definido
**Sintoma**: Console mostra "Cannot read property 'clinicId' of null"
**Solução**:
1. Abra DevTools (F12)
2. Console → Procure por erro de clinic_id
3. Verifique se a clínica foi selecionada no menu
4. Atualize a página (F5)

### Causa Possível 3: Erro de CORS
**Sintoma**: Console mostra "CORS policy: No 'Access-Control-Allow-Origin'"
**Solução**:
1. Verifique se VITE_SUPABASE_URL está correto
2. Verifique conectividade com Supabase
3. Limpe cache do navegador: Ctrl+Shift+Delete

---

## ❌ PROBLEMA: "Não consigo criar um novo serviço"

### Causa Possível 1: Nome vazio
**Sintoma**: Mensagem "Nome é obrigatório"
**Solução**: Digite o nome do serviço (ex: "Consulta Geral")

### Causa Possível 2: Nome < 3 caracteres
**Sintoma**: Mensagem "Nome deve ter no mínimo 3 caracteres"
**Solução**: Use pelo menos 3 letras (ex: "Cons" em vez de "Co")

### Causa Possível 3: Permissão insuficiente
**Sintoma**: Botão "Salvar" não funciona ou está desabilitado
**Solução**:
1. Verifique se seu perfil é Admin
2. Verifique se tem permissão em "Base do Sistema"
3. Entre em contato com administrador

### Causa Possível 4: Erro de conexão com servidor
**Sintoma**: Mensagem "Erro ao conectar com servidor"
**Solução**:
1. Verifique conexão com internet
2. Verifique status do Supabase: https://status.supabase.com
3. Tente novamente em 30 segundos
4. Se persistir, contate suporte

---

## ❌ PROBLEMA: "Email do profissional rejeitado"

### Causa: Formato de email inválido
**Sintoma**: Mensagem "Email deve ser válido"
**Solução**: 
- ✅ Correto: "joao@clinic.com"
- ❌ Incorreto: "joao@"
- ❌ Incorreto: "joao"
- ❌ Incorreto: "joao @clinic.com" (espaço)

**Formato esperado**: `nome@dominio.com`

---

## ❌ PROBLEMA: "Capacidade da sala rejeitada"

### Causa 1: Valor não é número
**Sintoma**: Mensagem "Capacidade deve ser um número"
**Solução**:
- ✅ Correto: "2", "10", "25"
- ❌ Incorreto: "abc", "2a", "dois"

### Causa 2: Valor ≤ 0
**Sintoma**: Mensagem "Capacidade deve ser maior que 0"
**Solução**:
- ✅ Correto: "1", "2", "5"
- ❌ Incorreto: "0", "-1"

---

## ❌ PROBLEMA: "Não posso deletar profissional"

### Causa: Profissional tem agendamentos
**Sintoma**: Erro ao tentar deletar
**Solução**:
1. O sistema usa "soft delete" - dados não são removidos
2. Profissional fica marcado como deletado
3. Não aparece mais em listas, mas histórico é preservado
4. Se necessário restaurar: contate suporte

---

## ❌ PROBLEMA: "Horário do profissional não salva"

### Causa 1: Horário fim ≤ Horário início
**Sintoma**: Mensagem "Horário de fim deve ser depois do início"
**Solução**:
- ✅ Correto: Início "08:00" → Fim "18:00"
- ❌ Incorreto: Início "18:00" → Fim "08:00"

### Causa 2: Pausa fora do horário
**Sintoma**: Mensagem "Pausa deve estar dentro do horário"
**Solução**:
- Trabalho: 08:00 - 18:00
- ✅ Pausa válida: 12:00 - 13:00 (entre 08h e 18h)
- ❌ Pausa inválida: 06:00 - 07:00 (antes das 08h)

---

## ❌ PROBLEMA: "Não consigo atribuir profissional a serviço"

### Causa 1: Combinação já existe
**Sintoma**: Mensagem "Essa combinação já existe"
**Solução**:
1. Verifique se Prof + Serviço já foram atribuídos
2. Clique em "Editar" se quiser alterar a atribuição
3. Escolha uma combinação diferente

### Causa 2: Profissional ou Serviço não selecionado
**Sintoma**: Erro ao salvar
**Solução**:
1. Selecione profissional no dropdown
2. Selecione serviço no dropdown
3. Clique em "Salvar"

---

## ❌ PROBLEMA: "Preço de serviço não é aceito"

### Causa 1: Preço ≤ 0
**Sintoma**: Mensagem "Preço deve ser maior que 0"
**Solução**:
- ✅ Correto: "100", "150.50", "99.99"
- ❌ Incorreto: "0", "-50"

### Causa 2: Custo > Preço
**Sintoma**: Mensagem "Custo não pode ser maior que o preço"
**Solução**:
- ✅ Correto: Preço "150" → Custo "50"
- ❌ Incorreto: Preço "100" → Custo "150"

**Lógica**: Custo não pode ser maior que o preço de venda

---

## ❌ PROBLEMA: "Comissão rejeitada"

### Causa: Valor fora do range 0-100
**Sintoma**: Mensagem "Comissão deve estar entre 0 e 100"
**Solução**:
- ✅ Correto: "15", "20", "30.5"
- ❌ Incorreto: "150", "-10"

**Restrição**: Porcentagem deve estar entre 0% e 100%

---

## ❌ PROBLEMA: "Código de convênio rejeitado"

### Causa 1: Código duplicado
**Sintoma**: Mensagem "Código já existe"
**Solução**:
1. Use código único
- ✅ Correto: "UNIMED", "AMIL", "BRADESCO"
- ❌ Incorreto: "UNIMED" (se já existe)

### Causa 2: Código vazio
**Sintoma**: Mensagem "Código é obrigatório"
**Solução**: Digite um código único para o convênio

---

## ❌ PROBLEMA: "Dados desaparecem após atualizar"

### Causa: Soft delete (dados marcados como deletados)
**Sintoma**: Registros desaparecem da lista
**Solução**:
1. Soft delete é intencional (preserva histórico)
2. Dados não são perdidos, apenas marcados como deletados
3. Se necessário recuperar: contate suporte

---

## ❌ PROBLEMA: "Vejo dados de outra clínica"

### Causa: Isolamento clinic_id não funcionando
**Sintoma**: Dados aparecem que não deveriam estar visíveis
**Solução**:
1. Atualize a página (F5)
2. Selecione a clínica correta no menu
3. Se persistir, limpe cache: Ctrl+Shift+Delete
4. Se ainda persistir: contate suporte (possível issue de segurança)

---

## ⚠️ AVISO DE SEGURANÇA

Se dados de outra clínica aparecerem:
1. **IMEDIATAMENTE**:
   - Não faça nenhuma alteração nos dados
   - Faça screenshot do problema
   - Contate suporte

2. **CONTATO URGENTE**:
   - Email: seguranca@gesclinic.com
   - Telefone: (11) 3000-0000 (opção 1)
   - Indique: "Possível violação de isolamento clinic_id"

---

## ✅ VERIFICAÇÃO DE SAÚDE DO SISTEMA

### Checklist de diagnóstico

- [ ] 1. Consigo fazer login?
- [ ] 2. Consigo acessar Base do Sistema?
- [ ] 3. Consigo ver dados da minha clínica?
- [ ] 4. Consigo criar um novo serviço?
- [ ] 5. Consigo editar um serviço?
- [ ] 6. Consigo deletar um serviço?
- [ ] 7. Console (F12) sem erros vermelhos?
- [ ] 8. Conexão com internet está ok?
- [ ] 9. Supabase está online (status.supabase.com)?
- [ ] 10. Autenticação ainda válida (não expirou)?

**Se todos OK**: Sistema está funcionando normalmente

**Se algum falhou**: Ver seção específica de problema acima

---

## 📞 COMO CONTATAR SUPORTE

### Informações a fornecer

1. **Descrição clara do problema**
2. **Passos para reproduzir**
3. **Screenshot/video do erro**
4. **Console error (F12)**: Copie mensagens de erro
5. **Seu perfil**: Admin, Gerente, Profissional?
6. **Clínica afetada**: Nome da clínica
7. **Horário do problema**: Quando ocorreu?

### Canais de contato

- 📧 **Email**: suporte@gesclinic.com
- 💬 **Chat**: https://gesclinic.com/suporte
- 📞 **Telefone**: (11) 3000-0000
- 🐛 **Bug Report**: https://gesclinic.com/bugs

### SLA (Tempo de Resposta)

- ⚠️ **Crítico** (sem acesso): 30 minutos
- 🔴 **Alto** (dados corrompidos): 2 horas
- 🟡 **Médio** (funcionalidade reduzida): 4 horas
- 🟢 **Baixo** (dúvida): 24 horas

---

## 🔧 LIMPEZA DE CACHE

Se os problemas persistirem mesmo após recarregar:

### Opção 1: Limpar Cache do Navegador
1. Pressione `Ctrl+Shift+Delete` (Windows) ou `Cmd+Shift+Delete` (Mac)
2. Selecione "Todos os tempos"
3. Marque "Cookies e dados de site"
4. Clique em "Limpar dados"
5. Recarregue a página

### Opção 2: Desabilitar Extensões
1. Abra DevTools (F12)
2. Menu → Settings → "Disable all extensions"
3. Recarregue a página
4. Se funcionar: uma extensão estava causando problema

### Opção 3: Hard Reload
- Windows: `Ctrl+Shift+R`
- Mac: `Cmd+Shift+R`

---

## 📊 LOGS PARA DIAGNÓSTICO

### Como coletar logs

1. Abra DevTools (F12)
2. Aba "Console"
3. Reproduza o problema
4. Copie todas as mensagens de erro
5. Envie para suporte

### O que coletar

```
[Copie e envie para suporte]

Navegador: [Chrome/Firefox/Safari]
Versão: [Versão do navegador]
Sistema Operacional: [Windows/Mac/Linux]
URL: [Página onde ocorreu o problema]

Erros encontrados:
[Copie do console aqui]

Passos para reproduzir:
1.
2.
3.

Screenshot: [Se possível, capture a tela]
```

---

## 🎓 RECURSOS ADICIONAIS

- 📖 [README Técnico](./📖_BASE_SISTEMA_README_TECNICO.md)
- 📚 [Guia de Uso](./📚_BASE_SISTEMA_GUIA_USO.md)
- 📝 [API Documentation](./📚_BASE_SISTEMA_API_DOCS.py)
- ✅ [Deployment Checklist](./✅_BASE_SISTEMA_DEPLOYMENT_CHECKLIST.md)

---

**Data**: 15 de Janeiro de 2026
**Versão**: 1.0
**Status**: ✅ Pronto para Uso
