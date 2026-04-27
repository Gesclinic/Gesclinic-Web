# Guia: Optimistic Updates com Marcação Visual

## Contexto

O hook `useAgendamentoMutation` implementa optimistic updates com os seguintes recursos:

- ✅ IDs temporários únicos (crypto.randomUUID)
- ✅ Validação automática de payload
- ✅ Retry com backoff exponencial
- ✅ Rollback automático em erro
- ✅ Cache invalidation granular
- ✅ Flag `__optimistic` para marcação visual

## Utilizando no Componente

### 1. Buscar Item Otimista da Query

```javascript
const { data: agendamentos } = useAgenda({ clinicId, date });

// agendamentos contém:
// [
//   { id: "uuid-real", status: "agendado", __optimistic: false },
//   { id: "temp-uuid", status: "agendado", __optimistic: true }  ← novo
// ]
```

### 2. Renderizar com Indicador Visual

```jsx
{agendamentos?.map((item) => (
  <div
    key={item.id}
    style={{
      opacity: item.__optimistic ? 0.6 : 1,
      transition: 'opacity 200ms ease-in-out',
      position: 'relative',
    }}
  >
    {/* Conteúdo do agendamento */}
    <h3>{item.paciente}</h3>
    <p>{item.startTime}</p>

    {/* Indicador Visual */}
    {item.__optimistic && (
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          fontSize: '12px',
          color: '#999',
          fontStyle: 'italic',
        }}
      >
        ⏳ Salvando...
      </span>
    )}
  </div>
))}
```

### 3. Opção: Badge com Animação

```jsx
{item.__optimistic && (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      background: '#f0f0f0',
      borderRadius: '3px',
      fontSize: '11px',
      color: '#666',
      marginLeft: '8px',
      animation: 'pulse 1.5s infinite',
    }}
  >
    Enviando...
  </span>
)}

{/* CSS (adicionar ao seu arquivo de estilos) */}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### 4. Desabilitar Interações em Item Otimista

```jsx
{/* Botões de ação */}
<button
  onClick={() => handleEdit(item.id)}
  disabled={item.__optimistic}
  style={{
    opacity: item.__optimistic ? 0.5 : 1,
    cursor: item.__optimistic ? 'not-allowed' : 'pointer',
  }}
>
  Editar
</button>

<button
  onClick={() => handleDelete(item.id)}
  disabled={item.__optimistic}
>
  Deletar
</button>
```

## Estados do Fluxo

```
1. ANTES de criar:
   Cache: [item1, item2]

2. DURANTE (onMutate):
   Cache: [item1, item2, { id: 'temp-...', __optimistic: true }]
   UI: Renderiza com opacidade 0.6
   Usuário vê: "Salvando..."

3. SUCESSO (onSettled → invalidate):
   Cache: [item1, item2, { id: 'real-uuid-...', __optimistic: false }]
   UI: Renderiza com opacidade 1
   Transição suave, sem flicker

4. ERRO (onError):
   Cache: [item1, item2]  ← rollback automático
   UI: Volta ao estado anterior
   Erro mostrado via toast ou modal
```

## Garantias de Segurança

✅ **IDs Únicos**: crypto.randomUUID() evita colisões mesmo em creates rápidos
✅ **Validação**: Payload validado antes de mutations
✅ **Rollback**: Automático em erro, restaura estado anterior
✅ **Cache**: Invalidação granular garante sincronização com servidor
✅ **Retry**: 3 tentativas com backoff até 30s para network resilience

## Testes Recomendados

```javascript
// Teste 1: Criar múltiplos rapidamente
for (let i = 0; i < 5; i++) {
  await criarAgendamento({ clinicId, date, ... });
}
// Esperar: 5 itens otimistas aparecem + consolidam com IDs reais

// Teste 2: Simular erro
// Desligar rede → ver rollback automático → Ligar rede → retry

// Teste 3: Editar enquanto salva
// Criar item A → Enquanto salva, editar item B → Ambos consolidam corretamente

// Teste 4: Trocar data durante save
// Salvar agendamento → Trocar data enquanto loading → Cache respeitado
```

## Performance

- **Latência Percebida**: ~0ms (UI atualiza instantaneamente)
- **Retry Inteligente**: Backoff exponencial evita sobrecarga
- **Cache Eficiente**: Granular por clinicId + date
- **Memory**: removeOptimisticItems() previne memory leaks

## Troubleshooting

**Problema**: Item otimista desaparece após sucesso
- **Solução**: Verificar se onSettled está invalidando corretamente

**Problema**: Múltiplos itens otimistas com mesmo ID
- **Solução**: crypto.randomUUID() garante unicidade; verificar se está sendo usado

**Problema**: Rollback não restaura dados
- **Solução**: Verificar se context.previous é passado corretamente em onError

**Problema**: Flicker visual
- **Solução**: placeholderData nas queries mantém dados anteriores durante refetch
