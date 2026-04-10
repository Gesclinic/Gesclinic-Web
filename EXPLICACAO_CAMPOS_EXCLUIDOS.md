# ❓ Por Que Esses Campos Foram Excluídos?

## 🎯 Resumo Rápido

**Motivo:** Esses campos **não existem no banco de dados Supabase** na tabela `rooms`.

O formulário foi tentando salvar dados em colunas que não existem = erro!

---

## 📊 Análise Técnica

### Schema Real da Tabela `rooms` (Supabase)

```sql
CREATE TABLE rooms (
  id UUID,
  clinic_id UUID,
  
  name VARCHAR(255),          ✅ EXISTE
  type VARCHAR(50),           ✅ EXISTE
  unit VARCHAR(100),          ✅ EXISTE
  
  description TEXT,           ✅ EXISTE
  capacity INT,               ✅ EXISTE
  
  is_active BOOLEAN,          ✅ EXISTE
  
  created_at TIMESTAMP,       ✅ EXISTE
  updated_at TIMESTAMP        ✅ EXISTE
);
```

### Campos que NÃO Existem

| Campo | Por Quê Não Existe? |
|-------|-------------------|
| ❌ `services_allowed` | Não foi criado na migration. Serviços deveriam ser associados via tabela M:M separada |
| ❌ `resources` | Não foi criado na migration. Recursos deveriam ser associados via tabela M:M separada |
| ❌ `location` | Duplica a informação de `unit`. Um campo seria suficiente |
| ❌ `status` | Não foi criado. O status é controlado por `is_active` (boolean) |

---

## 🔴 O Erro que Causavam

Quando o formulário tentava salvar com esses campos:

```javascript
const dataToSave = {
  clinic_id: "abc-123",
  name: "Sala 01",
  services_allowed: "Consulta, Cirurgia",  ❌ ERRO!
  resources: "[...]",                       ❌ ERRO!
  location: "Piso 2",                       ❌ ERRO!
  status: "available"                       ❌ ERRO!
};
```

**Mensagem de Erro do Supabase:**
```
PGRST204: Could not find the 'services_allowed' column 
         of 'rooms' in the schema cache
```

---

## ✅ O Que Fazer Com Esses Dados

### Se você PRECISA de `services_allowed`:

Criar uma tabela M:M (muitos-para-muitos):

```sql
CREATE TABLE room_services (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  service_id UUID REFERENCES services(id),
  UNIQUE(room_id, service_id)
);
```

Depois adicionar no formulário:
```javascript
// Salvar serviços separadamente
await roomServicesApi.setServices(roomId, selectedServiceIds);
```

### Se você PRECISA de `resources`:

Criar uma tabela de recursos:

```sql
CREATE TABLE room_resources (
  id UUID PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  resource_name VARCHAR(255),
  quantity INT,
  UNIQUE(room_id, resource_name)
);
```

### Se você PRECISA de `location`:

Já existe! Chama-se `unit`:
```javascript
// Ao invés de:
location: "Piso 2, Ala Leste"

// Use:
unit: "Piso 2, Ala Leste"
```

### Se você PRECISA de `status`:

Já existe! Chama-se `is_active`:
```javascript
// Ao invés de:
status: "available" // string

// Use:
is_active: true // boolean
```

---

## 🗂️ Estrutura Recomendada

Se você REALMENTE precisa dessas funcionalidades:

```
rooms (principal)
├── id ✅
├── clinic_id ✅
├── name ✅
├── type ✅
├── unit ✅
├── description ✅
├── capacity ✅
└── is_active ✅

room_services (M:M para serviços)
├── id
├── room_id (FK)
└── service_id (FK)

room_resources (M:M para recursos)
├── id
├── room_id (FK)
├── resource_name
└── quantity
```

---

## 🤔 Perguntas Frequentes

**P: Mas eu preciso guardar quais serviços podem ser feitos na sala?**
R: Use a tabela `room_services` (M:M). Mais flexível e normalizado.

**P: Preciso guardar recursos disponíveis (cadeiras, monitores)?**
R: Use a tabela `room_resources` (M:M). Permite quantidade, adicionar/remover fácil.

**P: Preciso saber se a sala está bloqueada ou não?**
R: Use `is_active` (boolean). Ou crie um status melhor depois se precisar.

**P: Por que não colocar tudo em uma coluna JSON?**
R: Porque:
- ❌ Difícil de buscar/filtrar
- ❌ Difícil de manter consistência
- ❌ Difícil de indexar
- ✅ Melhor usar tabelas normalizadas

---

## 🎯 Conclusão

Foram excluídos porque:

1. **Não existem no banco de dados** → Erro se tentar salvar
2. **Precisam de estrutura melhor** → Devem estar em tabelas separadas (M:M)
3. **Têm equivalentes melhores** → `unit` no lugar de `location`, `is_active` no lugar de `status`

---

## 📋 Próximas Etapas (Opcional)

Se quiser adicionar essas funcionalidades corretamente:

```
1. Criar tabelas M:M (room_services, room_resources)
2. Criar componentes de seleção múltipla no formulário
3. Atualizar APIs para salvar nas tabelas relacionadas
4. Atualizar a view detail para exibir dados relacionados
```

Mas por enquanto, o sistema funciona perfeitamente sem eles!

---

**Criado:** 18 de Janeiro de 2026
