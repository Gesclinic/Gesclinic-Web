# 🚀 PASSO A PASSO: Ativar CPF e Telefone

## ⏱️ Tempo: 2 minutos

## Passo 1: Abrir Supabase

1. Copie esta URL: https://supabase.com/dashboard/project/gvdkdjyupktlflwurike/sql/new
2. Cole no navegador
3. Faça login se necessário

**Você verá:**
```
┌─────────────────────────────────────────────┐
│ Supabase SQL Editor                         │
│ ┌─────────────────────────────────────────┐ │
│ │ -- Seu SQL aqui                         │ │
│ │                                         │ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│ [▶ Run] [Save]                              │
└─────────────────────────────────────────────┘
```

## Passo 2: Copiar o SQL

Copie este texto inteiro:

```sql
-- Adicionar coluna CPF à tabela professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
```

## Passo 3: Colar no Supabase

1. Clique na caixa de texto branca (SQL Editor)
2. Pressione **Ctrl+A** (selecionall)
3. Pressione **Ctrl+V** (cola)

**Você verá:**
```sql
-- Adicionar coluna CPF à tabela professionals
ALTER TABLE professionals
ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Criar índice para busca rápida por CPF
CREATE INDEX IF NOT EXISTS idx_professionals_cpf ON professionals(cpf);
```

## Passo 4: Executar

- **Opção 1**: Clique no botão azul "Run"
- **Opção 2**: Pressione **Ctrl+Enter**

## Passo 5: Verificar Resultado

Você verá uma mensagem verde:
```
✓ Query executed successfully
✓ 2 results
```

Ou:
```
✓ 1 query executed in 0.15s
```

**Se vir erro "already exists"?** 
Não é problema! A coluna já existe. Continue para o próximo passo.

## Passo 6: Testar na Aplicação

1. Acesse: http://localhost:5173/clinica/base-sistema/profissionais

2. Clique em **"+ Novo Profissional"**

3. Preencha assim:
   ```
   Nome: Dr. João Silva
   CPF: 012 (a máscara completa automaticamente)
   Especialização: Cardiologia
   Email: joao@clinica.com
   Telefone: (11 (a máscara completa automaticamente)
   ```

4. Clique em **"Salvar"**

5. Você verá aparecer na tabela:
   ```
   ┌──────────────────┬──────────────┬─────────────────────┬─────────────────┐
   │ Nome             │ Especialidade│ Email               │ Telefone        │
   ├──────────────────┼──────────────┼─────────────────────┼─────────────────┤
   │ Dr. João Silva   │ Cardiologia  │ joao@clinica.com    │ (11) 98765-4321 │
   └──────────────────┴──────────────┴─────────────────────┴─────────────────┘
   ```

6. Clique em editar ✏️ e confirme que os dados aparecem preenchidos

## 🎉 Pronto!

Seu sistema está 100% funcional!

## ❓ Dúvidas Comuns

**P: Recebi erro "relation does not exist"?**  
A: Significa que sua conta não tem permissão. Use a URL do dashboard que foi fornecida.

**P: O CPF continua não aparecendo?**  
A: Tente recarregar a página: `F5` ou `Ctrl+Shift+R`

**P: Pode deletar os profissionais antigos?**  
A: Sim! Eles não têm CPF. Delete e crie novos.

**P: Posso usar outro CPF para testar?**  
A: Sim! Qualquer número de 11 dígitos funciona (não precisa ser real).

---

**Dúvida?** Verifique os arquivos:
- 📋 `📋_SOLUCAO_CPF_TELEFONE.md` - Visão geral
- 🔧 `🔧_RESUMO_TECNICO_CPF.md` - Detalhes técnicos
