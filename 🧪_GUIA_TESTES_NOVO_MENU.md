# 🧪 GUIA DE TESTES - NOVO MENU E BREADCRUMBS

## 🚀 Quick Start

```bash
# 1. Iniciar dev server
npm run dev

# 2. Navegar para
http://localhost:3000/clinica/base-sistema

# 3. Verificar estrutura e breadcrumbs
```

---

## ✅ Teste 1: Estrutura do Menu

**Objetivo:** Verificar se o menu mostra 3 grupos com 12 itens corretamente

### Passos

1. Abrir `/clinica/base-sistema`
2. Verificar que aparecem 3 grupos expandíveis:
   - 📋 **Cadastros Estruturais** (azul)
   - ⚙️ **Regras Operacionais** (âmbar)
   - 💰 **Parâmetros Financeiros** (verde)

### Validação

```
✅ Grupo 1: Cadastros Estruturais
   ├─ 🩺 Serviços
   ├─ 👥 Profissionais
   ├─ 🏥 Convênios
   ├─ 🚪 Salas
   └─ 📦 Recursos
   
✅ Grupo 2: Regras Operacionais
   ├─ 🔗 Profissionais × Serviços
   ├─ 👤💼 Profissionais × Convênios
   ├─ 📅 Regras da Agenda
   └─ ⚡ Salas × Recursos
   
✅ Grupo 3: Parâmetros Financeiros
   ├─ 💵 Tabela de Preços
   ├─ 📈 Valores por Convênio
   └─ 📊 Regras de Repasse

✅ Total: 5 + 4 + 3 = 12 itens
```

### Resultado Esperado
- Menu carrega sem erros
- 3 grupos visíveis
- Descrições aparecem sob títulos
- Ícones aparecem ao lado dos nomes

---

## ✅ Teste 2: Breadcrumbs em Cada Página

**Objetivo:** Verificar se breadcrumbs aparecem e têm cores corretas

### Teste 2.1: Cadastros Estruturais (Azul)

```
1. Clicar em "Serviços"
   ├─ Verificar breadcrumb azul
   └─ Conteúdo: "🏠 > 📋 Cadastros Estruturais > 🩺 Serviços"

2. Clicar em "Profissionais"
   ├─ Verificar breadcrumb azul
   └─ Conteúdo: "🏠 > 📋 Cadastros Estruturais > 👥 Profissionais"

3. Clicar em "Convênios"
   ├─ Verificar breadcrumb azul
   └─ Conteúdo: "🏠 > 📋 Cadastros Estruturais > 🏥 Convênios"

4. Clicar em "Salas"
   ├─ Verificar breadcrumb azul
   └─ Conteúdo: "🏠 > 📋 Cadastros Estruturais > 🚪 Salas"

5. Clicar em "Recursos"
   ├─ Verificar breadcrumb azul
   └─ Conteúdo: "🏠 > 📋 Cadastros Estruturais > 📦 Recursos"
```

**Verificação Técnica**
- Background: `bg-blue-50` ✅
- Border: `border-blue-200` ✅
- Texto: `text-blue-700` ✅

### Teste 2.2: Regras Operacionais (Âmbar)

```
1. Clicar em "Profissionais × Serviços"
   ├─ Verificar breadcrumb âmbar
   └─ Conteúdo: "🏠 > ⚙️ Regras Operacionais > 🔗 Profissionais × Serviços"

2. Clicar em "Profissionais × Convênios"
   ├─ Verificar breadcrumb âmbar
   └─ Conteúdo: "🏠 > ⚙️ Regras Operacionais > 👤💼 Profissionais × Convênios"

3. Clicar em "Regras da Agenda"
   ├─ Verificar breadcrumb âmbar
   └─ Conteúdo: "🏠 > ⚙️ Regras Operacionais > 📅 Regras da Agenda"

4. Clicar em "Salas × Recursos"
   ├─ Verificar breadcrumb âmbar
   └─ Conteúdo: "🏠 > ⚙️ Regras Operacionais > ⚡ Salas × Recursos"
```

**Verificação Técnica**
- Background: `bg-amber-50` ✅
- Border: `border-amber-200` ✅
- Texto: `text-amber-700` ✅

### Teste 2.3: Parâmetros Financeiros (Verde)

```
1. Clicar em "Tabela de Preços"
   ├─ Verificar breadcrumb verde
   └─ Conteúdo: "🏠 > 💰 Parâmetros Financeiros > 💵 Tabela de Preços"

2. Clicar em "Valores por Convênio"
   ├─ Verificar breadcrumb verde
   └─ Conteúdo: "🏠 > 💰 Parâmetros Financeiros > 📈 Valores por Convênio"

3. Clicar em "Regras de Repasse"
   ├─ Verificar breadcrumb verde
   └─ Conteúdo: "🏠 > 💰 Parâmetros Financeiros > 📊 Regras de Repasse"
```

**Verificação Técnica**
- Background: `bg-green-50` ✅
- Border: `border-green-200` ✅
- Texto: `text-green-700` ✅

---

## ✅ Teste 3: Navegação via Breadcrumb

**Objetivo:** Verificar se home button volta para Base do Sistema

### Passos

```
1. Estar em qualquer página (ex: /clinica/base-sistema/servicos)
2. Verificar breadcrumb
3. Clicar em 🏠 (home icon)
4. Esperar navegação
5. Verificar que voltou para /clinica/base-sistema
6. Verificar que menu é exibido
```

### Resultado Esperado

- URL muda para `/clinica/base-sistema`
- Menu é renderizado com 3 grupos
- Nenhum erro de consola
- Transição suave

---

## ✅ Teste 4: Consistência das Cores

**Objetivo:** Verificar se cores são consistentes entre páginas do mesmo grupo

### Procedimento

```
# Cadastros Estruturais
1. Abrir Serviços → anotar cor breadcrumb (azul)
2. Abrir Profissionais → anotar cor (deve ser azul)
3. Abrir Convênios → anotar cor (deve ser azul)
4. Abrir Salas → anotar cor (deve ser azul)
5. Abrir Recursos → anotar cor (deve ser azul)

RESULTADO: Todas devem ser azul (bg-blue-50)

# Regras Operacionais
1. Abrir Prof × Serviços → anotar cor (âmbar)
2. Abrir Prof × Convênios → anotar cor (deve ser âmbar)
3. Abrir Agenda Rules → anotar cor (deve ser âmbar)
4. Abrir Salas × Recursos → anotar cor (deve ser âmbar)

RESULTADO: Todas devem ser âmbar (bg-amber-50)

# Parâmetros Financeiros
1. Abrir Tabela de Preços → anotar cor (verde)
2. Abrir Valores por Convênio → anotar cor (deve ser verde)
3. Abrir Regras de Repasse → anotar cor (deve ser verde)

RESULTADO: Todas devem ser verde (bg-green-50)
```

---

## ✅ Teste 5: Responsividade

**Objetivo:** Verificar se breadcrumb funciona em diferentes tamanhos

### Desktop (1920px)

```
Breadcrumb completo aparece:
"🏠 > 📋 Cadastros Estruturais > 🩺 Serviços"
```

### Tablet (768px)

```
Breadcrumb pode truncar um pouco, mas legível
"🏠 > 📋 Cadastros... > 🩺 Serviços"
```

### Mobile (375px)

```
Breadcrumb se adapta mas mantém funcionalidade
"🏠 > 📋 Cadastros > 🩺..."
```

---

## ✅ Teste 6: Funcionalidade do Menu

**Objetivo:** Verificar se menu se expande/contrai corretamente

### Passos

```
1. Estar em /clinica/base-sistema (menu visível)
2. Clicar em "📋 Cadastros Estruturais"
   └─ Menu deve expandir/contrair (toggle)
3. Verificar 5 itens aparecem quando expandido
4. Clicar em um item (ex: "Serviços")
   └─ Deve navegar para página
5. Verificar que breadcrumb mostra categoria correta
6. Clicar em home no breadcrumb
   └─ Volta para Base do Sistema
7. Verificar que menu está visível (pode estar recolhido ou expandido)
```

---

## ✅ Teste 7: Sem Erros de Console

**Objetivo:** Verificar se não há erros ou warnings

### Procedimento

```
1. Abrir Developer Tools (F12)
2. Ir para Console
3. Navegar por cada página
4. Verificar se aparecem erros em vermelho
5. Verificar se aparecem warnings em amarelo
```

### Erros Aceitos
- Nenhum erro relacionado a "BaseSystemBreadcrumb"
- Nenhum erro relacionado a imports
- Nenhum erro de "undefined category"

### Warnings Aceitáveis
- Warnings do Vite/React sobre HMR
- Warnings sobre console logs antigos

---

## ✅ Teste 8: Funcionalidade Original Preservada

**Objetivo:** Verificar que adição de breadcrumb não quebrou nada

### Pagina: Serviços

```
✅ Breadcrumb aparece
✅ Título "Serviços" aparece (não duplicado)
✅ Descrição aparece
✅ Botão "+ Novo Serviço" aparece e funciona
✅ Tabela de serviços carrega (ou empty state)
✅ Formulário abre quando clica em "Novo"
✅ Edição e exclusão funcionam
```

### Página: Profissionais

```
✅ Breadcrumb aparece
✅ Título "Profissionais" aparece
✅ Abas aparecem (Dados, Serviços, Convênios)
✅ Tabela ou lista carrega
✅ Buttons funcionam
```

### Página: Outros

```
✅ Mesmo padrão de verificação para cada página
✅ Nenhuma funcionalidade quebrada
✅ Layout mantém integridade
```

---

## 🔍 Testes Avançados

### Teste A: Validação de Props

```javascript
// Abrir DevTools → Console
// Verificar que BaseSystemBreadcrumb recebe props corretas

// Esperado para Serviços:
{
  category: "cadastros-estruturais",
  pageTitle: "Serviços",
  icon: "🩺"
}

// Deveriam aparecer esses valores no breadcrumb
```

### Teste B: Verificação de Routes

```bash
# Abrir DevTools → Network
# Navegar entre páginas

Verificar que:
- /clinica/base-sistema carrega
- /clinica/base-sistema/servicos carrega
- /clinica/base-sistema/profissionais carrega
- etc...

Nenhum 404 deve aparecer
```

### Teste C: Performance

```bash
# Abrir DevTools → Performance
# Navegar entre páginas

Verificar que:
- Transições < 300ms
- Rendering < 16ms (para 60 FPS)
- Memory não cresce indefinidamente
```

---

## 📋 Checklist de Teste Completo

```
Estrutura
[ ] Menu mostra 3 grupos
[ ] Cada grupo mostra números corretos de itens
[ ] Descrições aparecem sob títulos

Breadcrumbs
[ ] Aparecem em todas 12 páginas
[ ] Cores corretas por categoria
[ ] Ícones aparecem corretamente
[ ] Texto legível

Navegação
[ ] Home button funciona
[ ] Volta para base-sistema
[ ] Nenhum erro de navegação

Visual
[ ] Layout não quebrou
[ ] Espaçamento OK
[ ] Alinhamento OK
[ ] Hover states funcionam

Funcionalidade
[ ] Nenhum erro de console
[ ] Nada quebrou nas páginas
[ ] Formulários funcionam
[ ] Botões funcionam

Responsividade
[ ] Desktop OK (1920px)
[ ] Tablet OK (768px)
[ ] Mobile OK (375px)

Performance
[ ] Carrega rápido
[ ] Navegação suave
[ ] Sem lag
```

---

## 🚨 Se Encontrar Problemas

### Problema: Breadcrumb não aparece

**Solução:**
1. Verificar import em arquivo de página
2. Verificar que BaseSystemBreadcrumb.jsx existe
3. Verificar console por erros
4. Fazer refresh da página

### Problema: Cores erradas

**Solução:**
1. Verificar `category` prop passado
2. Verificar CATEGORY_CONFIG em BaseSystemBreadcrumb
3. Verificar que Tailwind classes estão corretas
4. Limpar cache: `npm run clean:win && npm run dev`

### Problema: Links quebrados

**Solução:**
1. Verificar setupWizardSteps.js `menuRoute`
2. Verificar AppRoutes.jsx has rota
3. Verificar pages.jsx exports página
4. Verificar que arquivo de página existe

### Problema: Menu com comportamento estranho

**Solução:**
1. Verificar BaseSystemLayout.jsx MENU_ITEMS
2. Verificar expandedSections state
3. Verificar que IDs são únicos
4. Fazer refresh completo (Ctrl+Shift+R)

---

## 📞 Contato para Ajuda

Se encontrar um problema não listado:

1. **Verificar console.log:**
   - DevTools → Console
   - Procurar por mensagens de erro
   - Copiar erro completo

2. **Verificar Network:**
   - DevTools → Network
   - Fazer refresh
   - Procurar por requests que falharam (vermelho)

3. **Verificar Source:**
   - DevTools → Sources
   - Procurar arquivo que deveria existir
   - Verificar imports

---

## ✅ Teste Final: Deploy

Depois de passar em todos os testes acima:

```bash
# Build para produção
npm run build

# Preview do build
npm run preview

# Abrir http://localhost:4173
# Testar mesmos passos acima

# Se tudo OK:
# Fazer commit e push
git add .
git commit -m "feat: realinhar menu a modelo conceitual 3 grupos com breadcrumbs"
git push

# Deploy para produção
# (seguir processo de deploy da empresa)
```

---

**Status:** Pronto para testar  
**Tempo estimado:** 30-45 minutos  
**Complexidade:** Baixa (testes visuais)

✅ **Boa sorte com os testes!**
