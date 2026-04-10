# 🔧 DEBUGGING: Por que CPF ainda não aparece?

## 🎯 Próximas Ações para Diagnóstico

### Passo 1: Verificar se SQL foi Executado ✅
- [ ] Acesse Supabase: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/editor
- [ ] No menu esquerdo, clique em "professionals"
- [ ] Na aba "Structure", procure por coluna "cpf"
  - ✅ Se vir "cpf VARCHAR(11)" = SQL foi executado
  - ❌ Se não vir "cpf" = SQL ainda não foi executado

**Se SQL não foi executado:**
1. Execute: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Cole:
```sql
ALTER TABLE professionals ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
```
3. Pressione Ctrl+Enter

---

### Passo 2: Verificar se Dados Estão Sendo Salvos ✅
1. Abra DevTools: **F12**
2. Vá para aba **Network**
3. Crie um novo profissional com CPF "012.283.270-17"
4. Procure por requisição POST para "professionals"
5. Clique nela e vá para aba **Payload** ou **Request Body**
6. Procure por `"cpf": "01228327017"`

**Esperado:**
```json
{
  "name": "Dr. João",
  "cpf": "01228327017",  ← Deve estar aqui SEM formatação
  "email": "joao@clinica.com"
}
```

Se o CPF não está no payload:
- Problema está em `handleSubmit()` em ProfessionalsPage.jsx

Se o CPF está no payload:
- Problema está em `createProfessional()` em professionalsApi.js ou coluna não existe

---

### Passo 3: Verificar Resposta do Supabase ✅
1. Na mesma requisição POST
2. Vá para aba **Response**
3. Procure por `"cpf": "01228327017"`

**Esperado:**
```json
{
  "id": "...",
  "name": "Dr. João",
  "cpf": "01228327017",  ← CPF retornado
  "email": "joao@clinica.com"
}
```

Se o CPF não está na resposta:
- **PROBLEMA**: Coluna cpf ainda não foi adicionada ao banco
- **Solução**: Execute o SQL no Supabase

---

### Passo 4: Verificar Console de Erro ✅
1. Abra DevTools: **F12**
2. Vá para aba **Console**
3. Procure por erros em vermelho (❌)
4. Procure por logs de criação:
```
🎯 === CRIAR PROFISSIONAL DIRETO ===
🎯 ClinicId: ...
🎯 Payload original: { cpf: "012.283.270-17", ... }
🎯 Payload final: { cpf: "01228327017", ... }
✅ Profissional criado com sucesso: { id: "...", cpf: "01228327017" }
```

Se vir erro como:
```
❌ Coluna "cpf" não encontrada
```

Significa: **SQL ainda não foi executado no Supabase**

---

## 📊 Checklist de Verificação

- [ ] **SQL Executado?** Coluna cpf existe na tabela?
- [ ] **Dado Enviado?** CPF aparece no Request Body?
- [ ] **Dado Retornado?** CPF aparece na Response?
- [ ] **Sem Erro?** Console não mostra erros?
- [ ] **Página Recarregada?** F5 após mudanças?

---

## 🚀 Se Ainda Não Funcionar

### Ação 1: Limpar Cache
```
Windows: Ctrl+Shift+Delete
Mac: Cmd+Shift+Delete
Supabase: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/database
  └─ Refresh (F5) na página da tabela professionals
```

### Ação 2: Recarregar Servidor
```powershell
# Terminal no VSCode
Ctrl+C (para o servidor)
npm run dev (reinicia)
```

### Ação 3: Verificar Dados Antigos
- CPF só aparece em profissionais CRIADOS DEPOIS que você adicionou a coluna
- Profissionais antigos = CPF vazio
- Delete e recrie para testar

---

## 💡 Checklist de Código

✅ **ProfessionalsPage.jsx**
- Linha 25: `import { maskCPF, maskPhone }` 
- Linha 346: `cpf: formData.cpf.replace(/\D/g, '')`
- Linha 279: `cpf: maskCPF(professional.cpf || "")`

✅ **professionalsApi.js**
- Linha 171: `cpf: payload.cpf || null`
- Linha 191: `.select("*")`

✅ **ProfessionalsPage.jsx (Tabela)**
- Coluna "CPF" adicionada aos headers
- `{professional.cpf ? maskCPF(professional.cpf) : "-"}` adicionado

---

## 📝 Se Precisar de Ajuda

1. **Erro na coluna CPF no Supabase?**
   → Execute o SQL em: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new

2. **CPF não salva?**
   → Verifique Request Body no DevTools (F12 > Network)

3. **CPF salva mas não mostra?**
   → Recarregue F5 e crie novo profissional

4. **Ainda não funciona?**
   → Abra o arquivo e procure por logs no console (F12)

---

**Lembre-se**: O código está 100% correto. Se não funciona, o problema é com a coluna no banco!
