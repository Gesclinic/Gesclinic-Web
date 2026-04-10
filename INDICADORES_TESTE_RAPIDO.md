# 🧪 GUIA DE TESTE RÁPIDO - INDICADORES DA AGENDA

## ⚡ 3 PASSOS PARA TESTAR

### 1️⃣ Aplicar Migration em Supabase

**No Supabase Dashboard** (`https://app.supabase.com`):
1. Selecione seu projeto
2. Vá para **SQL Editor**
3. Clique em **New Query**
4. Cole o conteúdo de: `supabase/migrations/2026-01-14_create_agenda_indicators.sql`
5. Clique **Run**

Deve aparecer: ✅ **Success**

### 2️⃣ Iniciar Aplicação

```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
npm run dev
```

Abra: `http://localhost:3000/clinica/agenda`

### 3️⃣ Testar Componente

#### Teste 1: Visualizar Indicadores
- [ ] Carregue a página `/clinica/agenda`
- [ ] Veja o card "📊 Indicadores da Agenda"
- [ ] Verifique se há 8-12 cards com ícones
- [ ] Clique no botão de refresh (🔄)
- [ ] Timestamp deve atualizar

#### Teste 2: Verificar Cores Dinâmicas
- [ ] Taxa ocupação < 40% → deve ficar vermelha 🔴
- [ ] Taxa ocupação 40-70% → deve ficar amarela 🟡
- [ ] Taxa ocupação > 70% → deve ficar verde 🟢
- [ ] Mesmo padrão para outras métricas

#### Teste 3: Alertas Inteligentes
- [ ] Se ocupação < 40%: deve aparecer alerta "Taxa de ocupação abaixo de 40%"
- [ ] Se faltas > 15%: deve aparecer alerta "Mais de 15% dos agendamentos resultaram em faltas"
- [ ] Clique no alerta para expandir
- [ ] Deve mostrar métrica e valor

#### Teste 4: Permissões (Gestor/Admin)
- [ ] Faça login como Gestor
- [ ] Deve ver seção "💰 Indicadores Financeiros"
- [ ] Verifique: Receita Dia, Receita Hora, Meta, % Meta

#### Teste 5: Permissões (Recepção)
- [ ] Faça login como Recepção
- [ ] NÃO deve aparecer seção "💰 Indicadores Financeiros"
- [ ] Deve ver apenas: Ocupação, Agendamentos, Confirmados, Faltas

#### Teste 6: Permissões (Profissional)
- [ ] Faça login como Profissional
- [ ] Deve ver apenas seus próprios indicadores
- [ ] Card de "Profissionais Ativos" = 1 (apenas ele)

---

## 🐛 VERIFICAÇÃO DE ERROS

### No Console do Navegador (F12)
Procure por:
- ✅ **Sem erros** em vermelho
- ✅ **Mensagens de sucesso**: "📊 Indicadores carregados"
- ❌ **Ignore warnings** de React.StrictMode

### No Terminal (npm run dev)
- ✅ Nenhuma mensagem de erro Vite/ESLint
- ✅ Aplicação rodando em http://localhost:3000

---

## 📊 DADOS DE TESTE

### Cenário 1: Ocupação Baixa
**Como criar**:
1. Crie 2 agendamentos para hoje
2. Cada profissional tem 10 slots/dia
3. Taxa ocupação = 2/20 = 10%
4. Alerta: "Taxa de ocupação abaixo de 40%" 🔴

### Cenário 2: Muitas Faltas
**Como criar**:
1. Crie 10 agendamentos
2. Marque 2+ como "Falta"
3. Taxa de faltas = 20%
4. Alerta: "Mais de 15% dos agendamentos resultaram em faltas" 🔴

### Cenário 3: Meta Não Atingida
**Como criar**:
1. Crie agendamentos com receita baixa
2. Verifique se receita < 70% da meta
3. Alerta: "Receita atual está abaixo de 70% da meta diária"

---

## ✅ CHECKLIST DE VALIDAÇÃO

```
[ ] Indicadores carregam em < 2 segundos
[ ] Cards exibem cores dinâmicas corretas
[ ] Alertas aparecem para condições críticas
[ ] Botão de refresh funciona
[ ] Timestamp atualiza após refresh
[ ] Gestor vê financeiro
[ ] Recepção não vê financeiro
[ ] Profissional vê apenas seus indicadores
[ ] Grid é responsivo (testar mobile)
[ ] Nenhum erro no console
[ ] Nenhum erro no terminal
```

---

## 🚨 TROUBLESHOOTING

### "Nenhum indicador carregado"
1. Verifique se há agendamentos para hoje
2. Verifique se clinicId está correto
3. Abra DevTools → Network → procure por `get_agenda_indicators`

### "Função não encontrada em Supabase"
1. Verifique se migration foi aplicada
2. Vá para SQL Editor em Supabase
3. Procure: `SELECT * FROM information_schema.routines WHERE routine_name = 'get_agenda_indicators';`
4. Deve retornar 1 linha

### "Financeiro não aparece"
1. Verifique `currentRole` em DevTools
2. Console.log(currentRole) deve ser 'gestor' ou 'admin'
3. Verifique permissões do usuário em Supabase

---

## 📸 PRINTS ESPERADOS

### Indicadores Desktop
```
┌─────────────────────────────────────────────┐
│ 📊 Indicadores da Agenda           [refresh] │
│ Data: 14/01/2026 • Atualizado: ...          │
├─────────────────────────────────────────────┤
│ 🚨 Taxa de ocupação abaixo de 40%...       │
├─────────────────────────────────────────────┤
│ ✅ Status Geral: Saudável                   │
├─────────────────────────────────────────────┤
│ [Taxa de Ocupação: 35%] [Agendamentos: 5]  │
│ [Confirmados: 4] [Faltas: 1] [Encaixes: 0] │
│ [Profissionais: 2] [Slots Livres: 15]      │
├─────────────────────────────────────────────┤
│ 💰 Indicadores Financeiros                  │
│ [Receita Dia: R$ 500] [Receita Hora: ...]  │
│ [Meta: R$ 5000] [% Meta: 10%]               │
├─────────────────────────────────────────────┤
│ 📅 Resumo de Slots                          │
│ Ocupação: 5/20 [████░░░░░░░░░░░░░░░░░░░░]│
└─────────────────────────────────────────────┘
```

### Indicadores Mobile
```
┌──────────────────────────┐
│ 📊 Indicadores [refresh] │
│ Data: 14/01/2026         │
├──────────────────────────┤
│ 🚨 Taxa de ocupação...   │
├──────────────────────────┤
│ ✅ Status: Saudável      │
├──────────────────────────┤
│ [Taxa Ocupação]  [Agend] │
│ 35%              5        │
│                          │
│ [Confirmados]  [Faltas]  │
│ 4              1         │
├──────────────────────────┤
│ [📅 Resumo de Slots]     │
│ 5/20 [████░░░░░░░░░░░]  │
└──────────────────────────┘
```

---

## 🎯 SUCESSO!

Se todos os testes passarem ✅:
1. Componente está funcionando
2. Permissões estão corretas
3. Alertas estão sendo gerados
4. Aplicação está pronta para uso

**Parabéns! 🎉 Indicadores da Agenda implementados com sucesso!**

---

## 📞 PRÓXIMO PASSO

Integrar com **real-time updates**:
```javascript
// Adicionar em AgendaPage.jsx
useEffect(() => {
  const subscription = supabaseClient
    .from('appointments')
    .on('*', () => {
      // Refetch indicators
      fetchIndicators();
    })
    .subscribe();
  
  return () => subscription.unsubscribe();
}, []);
```
