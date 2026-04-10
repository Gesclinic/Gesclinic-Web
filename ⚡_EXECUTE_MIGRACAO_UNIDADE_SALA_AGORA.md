⚡ EXECUTE AGORA: Migração Unidade/Sala

═══════════════════════════════════════════════════════════════

## 🎯 Situação Atual

✅ Frontend: Pronto (componentes + validações)
✅ API: Pronta (funções atualizadas)
❌ Banco: Pendente (precisa migração SQL)

## 📋 Arquivo a Executar

**Caminho:** `supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql`

**Conteúdo do arquivo:**
```sql
-- Adiciona coluna unit_name para rastrear unidade/filial física do horário
ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100);

-- Criar índice para melhor performance em buscas por unidade
CREATE INDEX IF NOT EXISTS idx_professional_schedules_unit_clinic ON professional_schedules(unit_name, clinic_id);
```

## 🚀 3 Formas de Executar

### OPÇÃO 1: Via Dashboard Supabase (Recomendado - Mais Fácil) ⭐

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em: **SQL Editor** (lado esquerdo)
4. Clique em **New Query** (ou +)
5. Cole este código:
```sql
CREATE TABLE IF NOT EXISTS professional_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  unit_name VARCHAR(100),
  day_of_week INT,
  start_time TIME,
  end_time TIME,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE professional_schedules
  ADD COLUMN IF NOT EXISTS unit_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_professional_schedules_unit_clinic ON professional_schedules(unit_name, clinic_id);
```
6. Clique em **"Run"** (ou Ctrl+Enter)
7. Veja a mensagem: ✓ Success

### OPÇÃO 2: Via PowerShell (Windows)

```powershell
# Se tiver psql instalado:
$migrationFile = "C:\Users\ferna\Desktop\Projeto Gesclinic Web\supabase\migrations\2026-02-14_add_unit_name_to_professional_schedules.sql"

# Substitua pelos seus dados:
$host = "seu-projeto.supabase.co"  # do Dashboard → Settings → Database
$username = "postgres"
$password = "sua-senha-db"
$database = "postgres"

psql -h $host -U $username -d $database -f $migrationFile -A

# Se sucesso, verá: CREATE INDEX (sem erros)
```

### OPÇÃO 3: Via Docker / Container (Desenvolvedor)

```bash
# Se tiver Docker e docker-compose:
cd "C:\Users\ferna\Desktop\Projeto Gesclinic Web"

# Executar Supabase localmente (se configurado):
docker-compose exec db psql -U postgres -d postgres -f supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql
```

## ✔️ Validar Execução

Após executar, verifique que a coluna foi criada:

```sql
-- No SQL Editor, execute:
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'professional_schedules'
ORDER BY ordinal_position;

-- Deve retornar (últimas colunas):
unit_name | character varying
```

Ou verifique pelos índices:

```sql
-- No SQL Editor, execute:
SELECT indexname FROM pg_indexes 
WHERE tablename = 'professional_schedules';

-- Deve incluir:
idx_professional_schedules_unit_clinic
```

## 🔄 Se Algo Deu Errado

### Erro: "column already exists"
```
Significa: Coluna unit_name já existe (OK!)
Solução: Nada a fazer. Feature já está ativa.
```

### Erro: "table professional_schedules does not exist"
```
Significa: Tabela ainda não foi criada
Solução: Executar schema completo (base de dados vazia?)
         Contate administrador do BD
```

### Erro: "Invalid SQL"
```
Significa: Há char invalid ou quebra de linha errada
Solução: Copie exatamente do arquivo .sql original
         Não modifique nada (copiar+colar direto)
```

## ✅ Após Executar

1. Volte ao VS Code
2. Digite `npm run dev`
3. Abra http://localhost:3000
4. Navegue: /clinica/base-sistema/profissionais
5. Abra um profissional existente
6. Clique em "Disponibilidades"
7. Teste:
   - [x] Adicionar novo horário
   - [x] Unidade + Sala aparecem nos 2 campos
   - [x] Tabela mostra 2 colunas (roxo + azul)
   - [x] Tente duplicata (deve rejeitar)
   - [x] Edit e Delete funcionam

## 📝 Notas Importantes

- ✅ Arquivo .sql está pronto em: `supabase/migrations/2026-02-14_add_unit_name_to_professional_schedules.sql`
- ✅ IF NOT EXISTS = seguro executar múltiplas vezes
- ✅ Dados antigos (NULL) continuam funcionando
- ✅ Sem risco de perda de dados
- ✅ Índice melhora performance de filtros

## 🎯 Tempo Estimado

- Dashboard: 2 min (copiar + colar + run)
- PowerShell: 1 min (se psql instalado)
- Validação: 1 min (rodar query de check)
- Teste UI: 2 min (npm run dev + testar)

**Total: ~5 minutos**

═══════════════════════════════════════════════════════════════
🟢 PRONTO! Siga os passos acima e seja bem-vindo ao feature!
