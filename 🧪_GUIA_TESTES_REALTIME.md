# 🧪 GUIA PRÁTICO: Testar e Validar Realtime Estável

**Tempo Estimado:** 20 minutos  
**Requisitos:** Navegador moderno (Chrome, Firefox, Edge) + Agenda rodando

---

## 📋 PRÉ-REQUISITOS

✅ Agenda Enterprise em execução (http://localhost:3000/clinica/agenda)  
✅ Browser com DevTools (F12)  
✅ 2 abas abertas com Agenda (para teste cross-tab)  
✅ Acesso para criar/editar agendamentos

---

## 🔬 TESTE 1: Deduplicação de Eventos (5 min)

### Objetivo:
Verificar se eventos duplicados são ignorados (não processados 2x)

### Passos:

1. **Abra DevTools (F12)**
   - Vá para Console
   - Procure por logs com padrão: `[Realtime:clinic-...]`

2. **Crie um agendamento**
   - Clique em um slot vazio na agenda
   - Preencha dados: paciente, profissional, horário
   - Clique "Salvar"

3. **Verifique nos logs:**
   ```
   ✅ ESPERADO:
   [Realtime:clinic-123] 📬 [Realtime] Evento recebido
   [Realtime:clinic-123] 📬 [Realtime] Evento recebido
   
   ❌ NÃO ESPERADO (indicaria problema):
   [Realtime:clinic-123] 🔄 [Dedup] Evento duplicado ignorado (múltiplas vezes)
   ```

4. **Resultado:**
   - ✅ PASSOU: Evento aparece 1x nos logs
   - ❌ FALHOU: Evento aparece 3+ vezes nos logs

---

## 📡 TESTE 2: Cross-Tab Sync (5 min)

### Objetivo:
Verificar se agendamento criado em uma aba aparece na outra em < 1s

### Passos:

1. **Posicione 2 navegadores lado-a-lado**
   - Aba A (esquerda): http://localhost:3000/clinica/agenda
   - Aba B (direita): http://localhost:3000/clinica/agenda
   - Ambas mesma data

2. **Em Aba A:**
   - Crie um agendamento
   - Note o horário: ex. 10:00 - 10:30
   - Clique "Salvar"

3. **Observe Aba B:**
   - Novo agendamento deve aparecer automaticamente
   - Tempo esperado: < 1 segundo

4. **Resultado:**
   - ✅ PASSOU: Agendamento apareceu em Aba B em < 1s
   - ❌ FALHOU: Agendamento não apareceu ou > 5s

### Troubleshooting:
```
Se não funcionar:
1. Verifique browser suporta BroadcastChannel (Chrome, Firefox, Edge)
2. Safari < 15.1 não suporta (sync com-tab manual)
3. Abra console em ambas abas - procure por:
   [BroadcastChannel] inicializado ✅
```

---

## 🔄 TESTE 3: Reconexão Automática (5 min)

### Objetivo:
Verificar se realtime reconecta automaticamente após desconexão

### Passos:

1. **Abra DevTools (F12) → Network**

2. **Na Aba "Network":**
   - Procure pelo dropdown "Throttling"
   - Selecione "Offline"
   - Agenda agora está sem internet

3. **Na Aba "Agenda":**
   - Verifique no Console: Status deve mudar para ⚠️
   - Tente criar agendamento (falhará, é esperado)

4. **Reconectar:**
   - DevTools → Network → Throttling → "No throttling"
   - Agenda deve reconectar automaticamente

5. **Verifique logs:**
   ```
   ✅ ESPERADO ao desconectar:
   [Realtime:clinic-123] ⚠️ [Subscribe] Desconectado
   [Realtime:clinic-123] 🔄 [Reconnect] Tentando reconectar
   
   ✅ ESPERADO ao reconectar:
   [Realtime:clinic-123] ✅ [Subscribe] Conectado
   [Realtime:clinic-123] ❤️ [Heartbeat] Ping
   ```

6. **Resultado:**
   - ✅ PASSOU: Reconectou em 1-10s automaticamente
   - ❌ FALHOU: Não reconectou ou precisou refresh manual

---

## 💾 TESTE 4: Cache Inteligente (3 min)

### Objetivo:
Verificar se refetch é seletivo (não refetch toda agenda)

### Passos:

1. **Abra DevTools (F12) → Network**

2. **Filtre por "appointments" ou "agenda"**
   - Procure requisições para Supabase

3. **Crie um agendamento**
   - Verifique quantas requisições foram feitas
   - ESPERADO: Apenas requisições mínimas
   ```
   ✅ ESPERADO:
   - 1x POST (criar agendamento)
   - 1x GET (refetch do dia modificado)
   Total: 2 requisições
   
   ❌ NÃO ESPERADO:
   - Múltiplos GET de datas diferentes
   - GET de toda a agenda
   Total: > 5 requisições
   ```

4. **Resultado:**
   - ✅ PASSOU: Apenas requisições mínimas necessárias
   - ❌ FALHOU: Muitas requisições desnecessárias

---

## 🧠 TESTE 5: Memory Leaks (2 min)

### Objetivo:
Verificar se não há vazamento de memória (listeners acumulando)

### Passos:

1. **Abra DevTools (F12) → Performance/Memory**

2. **Anote memória inicial:**
   - Pressione Shift+F5 (hard refresh)
   - Aguarde Agenda carregar
   - Anote: ~40-60 MB

3. **Interaja com Agenda 10x:**
   - Navegue entre datas (próximo dia, dia anterior)
   - Crie/edite agendamentos
   - Interaja por 30 segundos

4. **Verifique memória:**
   - Deve permanecer ~40-65 MB
   - Variação é normal (garbage collection)

5. **Resultado:**
   - ✅ PASSOU: Memory < 100 MB, sem crescimento contínuo
   - ❌ FALHOU: Memory > 150 MB ou crescimento linear

---

## 📊 TESTE 6: Performance (Opcional)

### Objetivo:
Verificar velocidade de atualização realtime

### Passos:

1. **Abra DevTools (F12) → Performance**
   - Clique "Record"

2. **Crie um agendamento na Aba A**

3. **Verifique Aba B:**
   - Clique "Stop" no DevTools
   - Procure pelo tempo de:
     - Evento recebido até UI atualizada
     - ESPERADO: < 500ms

4. **Resultado:**
   - ✅ PASSOU: Atualização < 500ms
   - ⚠️ AVISO: 500-2000ms (aceitável)
   - ❌ FALHOU: > 2000ms

---

## 🔍 TESTE 7: Logs Estruturados (Bônus)

### Objetivo:
Validar que logs têm timestamps e padrão correto

### Passos:

1. **Abra DevTools → Console**

2. **Execute script de diagnóstico:**
   ```javascript
   // Copie o conteúdo de 🔬_SCRIPT_DIAGNOSTICO_REALTIME.js
   // Cole no console e pressione Enter
   ```

3. **Verifique resultado:**
   ```
   ✅ PASSOU: 8/8 testes do diagnóstico
   ⚠️ AVISO: 6-7/8 testes (algum problema menor)
   ❌ FALHOU: < 5/8 testes (verificar acima)
   ```

---

## 📋 CHECKLIST DE VALIDAÇÃO FINAL

- [ ] **Teste 1 (Deduplicação):** ✅ PASSOU
- [ ] **Teste 2 (Cross-Tab):** ✅ PASSOU  
- [ ] **Teste 3 (Reconexão):** ✅ PASSOU
- [ ] **Teste 4 (Cache):** ✅ PASSOU
- [ ] **Teste 5 (Memory):** ✅ PASSOU
- [ ] **Teste 6 (Performance):** ✅ PASSOU
- [ ] **Teste 7 (Logs):** ✅ PASSOU

---

## 🎓 EXEMPLOS DE LOGS ESPERADOS

### Log de Subscribe Conectado:
```
[2026-05-10T14:23:45.123Z] [Realtime:clinic-abc123] 
✅ [Subscribe] Conectado { table: 'appointments' }
```

### Log de Evento Realtime:
```
[2026-05-10T14:24:12.456Z] [Realtime:clinic-abc123] 
📬 [Realtime] Evento recebido {
  table: 'appointments',
  eventType: 'INSERT',
  recordId: 'apt-12345'
}
```

### Log de Reconexão:
```
[2026-05-10T14:25:00.789Z] [Realtime:clinic-abc123] 
🔄 [Reconnect] Tentando reconectar {
  retryCount: 3,
  nextRetryIn: '8000ms'
}
```

### Log de Deduplicação:
```
[2026-05-10T14:26:15.234Z] [Realtime:clinic-abc123] 
🔄 [Dedup] Evento duplicado ignorado { eventId: 'apt-12345' }
```

---

## 🚨 SOLUÇÃO DE PROBLEMAS

### Problema: "Eventos não aparecem"
```
✅ SOLUÇÃO:
1. Verifique se está logado
2. Verifique se clínica está selecionada
3. Abra console e procure por erros
4. Verifique se Supabase está online
5. Tente hard-refresh (Ctrl+Shift+R)
```

### Problema: "Cross-tab sync não funciona"
```
✅ SOLUÇÃO:
1. Verifique se browser suporta BroadcastChannel
2. Chrome, Firefox, Edge 76+ suportam
3. Safari < 15.1 não suporta (limitação do navegador)
4. Use em abas do MESMO navegador/origin
```

### Problema: "Reconexão demora muito"
```
✅ SOLUÇÃO:
1. Normal: backoff exponencial (1s → 2s → 4s → ... → 30s)
2. Se > 30s, verifique internet
3. Verifique logs para padrão [Reconnect]
```

### Problema: "Memory usage muito alto"
```
✅ SOLUÇÃO:
1. Feche outras abas com Agenda
2. Verifique se há listeners órfãos (devem ser limpos)
3. Se > 200MB, faça hard-refresh
4. Procure por [Destroy] nos logs (cleanup)
```

---

## 📞 SUPORTE AVANÇADO

### Para Desenvolvedores:

**Monitorar realtime em tempo real:**
```javascript
// No console:
window.monitorRealtime();

// Depois:
window.showRealtimeLogs();
```

**Verificar status do manager:**
```javascript
// Próximas versões com:
window.__realtimeStatus.getStatus();
```

**Desabilitar realtime temporariamente (debug):**
```javascript
// Desabilita em localStorage
localStorage.setItem('realtime-disabled', 'true');
// Recarregue página
```

---

**Todos os testes passando?** ✅ Realtime Enterprise está estável!

Algum teste falhou? Procure pela seção de troubleshooting acima ou verifique os logs estruturados no console.

