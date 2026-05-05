# Checklist: Testes de Stress (Produção)

## Ambiente de Teste

- [ ] Browser: Chrome, Firefox, Safari
- [ ] Rede: Simular 3G, 4G, WiFi lenta (DevTools > Network Throttling)
- [ ] CPU: Simular carga alta (DevTools > Performance)
- [ ] Desconexões: Toggle rede offline/online

## Testes Básicos

### 1. Criar Múltiplos Agendamentos Rapidamente ⏱️

**Passos:**

```
1. Abrir formulário NovoAgendamento
2. Preencher dados
3. Clicar "Salvar" 5x em < 2s
4. Observar comportamento
```

**Esperado:**

- [ ] 5 itens otimistas aparecem na agenda
- [ ] Cada tem \_\_optimistic: true
- [ ] Nenhuma duplicação de IDs
- [ ] Todos consolidam com IDs reais após sucesso
- [ ] Zero flicker visual

**Se falhar:**

```
❌ Duplicação: Verificar crypto.randomUUID()
❌ Flicker: Verificar placeholderData nas queries
❌ IDs colidindo: Aumentar uniqueness (UUID é único)
```

---

### 2. Editar Múltiplos Itens Seguidos ⏱️

**Passos:**

```
1. Criar 3 agendamentos
2. Esperar consolidação
3. Editar item 1
4. Enquanto salva, editar item 2
5. Enquanto ambos salvam, editar item 3
6. Observar
```

**Esperado:**

- [ ] Todos os 3 mostram \_\_optimistic: true
- [ ] Nenhuma colisão de IDs
- [ ] Ordem de atualização preservada
- [ ] Todos consolidam corretamente

---

### 3. Simular Erro de Rede 🌐

**Passos:**

```
1. Abrir DevTools > Network
2. Desligar internet (offline)
3. Tentar criar agendamento
4. Observar retry automático
5. Ligar internet novamente
6. Observar consolidação
```

**Esperado:**

- [ ] Item otimista adicionado ao cache
- [ ] Mutation tenta retry automaticamente
- [ ] Backoff exponencial (1s, 2s, 4s, ...)
- [ ] Ao reconectar, completa sucesso
- [ ] Nenhuma duplicação
- [ ] Zero perda de dados

---

### 4. Trocar Clínica Durante Save 🏥

**Passos:**

```
1. Criar agendamento na clínica A
2. Enquanto salva, trocar para clínica B
3. Observar comportamento
```

**Esperado:**

- [ ] Item otimista permanece em A
- [ ] Cache isolado por clinicId
- [ ] Sem contaminação entre clínicas
- [ ] Ao voltar para A, item consolidou corretamente

---

### 5. Trocar Data Durante Save 📅

**Passos:**

```
1. Criar agendamento em 2026-04-15
2. Enquanto salva, trocar para 2026-04-16
3. Observar
```

**Esperado:**

- [ ] Item permanece em 15/04
- [ ] Novo item não aparece em 16/04
- [ ] Cache isolado por date
- [ ] Sem flicker ao trocar data

---

### 6. Navegar Entre Telas Rápido 🧭

**Passos:**

```
1. Agenda → Criar agendamento
2. Enquanto salva, voltar à agenda
3. Voltar ao formulário
4. Navegar para Financeiro
5. Voltar à Agenda
6. Observar
```

**Esperado:**

- [ ] Item otimista persiste durante navegação
- [ ] Cache mantido durante saída/volta
- [ ] Zero refetch desnecessário
- [ ] Estado coerente em volta

---

### 7. Múltiplas Abas do Browser 🔀

**Passos:**

```
1. Aba 1: Abrir Agenda (criar agendamento)
2. Aba 2: Abrir mesma Agenda
3. Ambas salvam simultaneamente
4. Observar sincronização
```

**Esperado:**

- [ ] Ambas atualizam (React Query sincrona)
- [ ] Sem duplicação
- [ ] Consolidação consistente

---

### 8. Rede Lenta (Throttle 3G) 📊

**Passos:**

```
1. DevTools > Network > Throttle 3G
2. Criar agendamento
3. Observar por 10s
```

**Esperado:**

- [ ] UI responsivo mesmo em 3G
- [ ] Loading visível mas fluido
- [ ] Retry com backoff funciona
- [ ] Sem timeout prematuro

---

### 9. Rollback em Erro (Force 500) ⚠️

**Passos:**

```
1. Interceptar requisição (DevTools/Proxy)
2. Retornar erro 500
3. Criar agendamento
4. Observar rollback
```

**Esperado:**

- [ ] Item otimista adicionado
- [ ] Mutation falha → Retry 1/2/3
- [ ] Após 3 falhas, desiste
- [ ] Cache restaurado (item desaparece)
- [ ] Erro exibido ao usuário
- [ ] Nenhum dado corrompido

---

### 10. Validação de Payload ✅

**Passos:**

```
1. Tentar criar sem clinicId (console hack)
2. Tentar criar sem date
3. Observar comportamento
```

**Esperado:**

- [ ] Erro imediato (sem ir para servidor)
- [ ] Nenhuma retry
- [ ] Mensagem específica: "clinicId é obrigatório"
- [ ] Cache não afetado

---

## Testes de Stress Avançados

### 11. 50 Criar + 30 Editar em Paralelo 💥

```javascript
// Script para testar
Promise.all([
  ...Array(50).fill().map(() => criarAgendamento(...)),
  ...Array(30).fill().map((_, i) => atualizarAgendamento(ids[i], {...}))
])
```

**Esperado:**

- [ ] 80 operações simultâneas
- [ ] Sem crashes
- [ ] Sem duplicação
- [ ] Todos consolidam corretamente

---

### 12. Cache Size Explosion 🔥

```javascript
// Criar 1000 agendamentos em diferentes datas
for (let i = 0; i < 1000; i++) {
  await criarAgendamento({ date: `2026-04-${(i % 30) + 1}` });
}
```

**Esperado:**

- [ ] Memory não explode (gcTime limpa inativos)
- [ ] Performance mantida
- [ ] Sem memory leaks

---

## Checklist de Aprovação Final

- [ ] Todos os 12 testes passaram
- [ ] Zero crashes ou console errors
- [ ] Zero duplicação de dados
- [ ] Zero flicker visual
- [ ] Rollback sempre funciona
- [ ] Retry automático efetivo
- [ ] Performance aceitável em 3G
- [ ] UX fluida e responsiva

---

## Métricas de Sucesso

| Métrica                 | Esperado            | Tolerância |
| ----------------------- | ------------------- | ---------- |
| **Latência Percebida**  | < 50ms              | ±10ms      |
| **Retry Attempt**       | 3x máximo           | -          |
| **Backoff Delay**       | 1s, 2s, 4s, max 30s | ±100ms     |
| **Rollback Latência**   | < 100ms             | ±20ms      |
| **Memory (1000 items)** | < 50MB              | ±10MB      |
| **CPU (durante save)**  | < 20%               | ±5%        |

---

## Status: ✅ Pronto para Produção

Quando todos os testes passarem, o sistema está **100% pronto** para deploy em produção real.
