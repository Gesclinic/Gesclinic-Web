⚠️ **FASE 15: ERROR HANDLING & NOTIFICATIONS - COMEÇANDO AGORA!**

---

## 🎯 **OBJETIVO**

Implementar sistema robusto de error handling com notificações ao usuário:
```
1. Error Boundary Components
2. Toast Notification System
3. Retry Logic (Exponential Backoff)
4. User Feedback Messages
```

---

## 📋 **TAREFAS (30 minutos total)**

### **Tarefa 1: Toast Notification System (10 min)**

```jsx
// src/components/ui/Toast.jsx
import { useState, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Math.random();
    const toast = { id, message, type };
    
    setToasts(prev => [...prev, toast]);
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    
    return id;
  }, []);

  return { toasts, addToast };
}

export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ id, message, type, onRemove }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-lg border ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      <button onClick={onRemove} className="opacity-50 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
```

**Uso em componentes:**
```jsx
const { toasts, addToast } = useToast();

try {
  await saveData();
  addToast('Dados salvos com sucesso!', 'success');
} catch (err) {
  addToast(`Erro: ${err.message}`, 'error');
}
```

---

### **Tarefa 2: Error Boundary Component (8 min)**

```jsx
// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    // Log para monitoria (Sentry, etc)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-red-50">
          <div className="bg-white rounded-lg p-8 max-w-md shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-red-800">Algo deu errado</h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || 'Um erro inesperado ocorreu'}
            </p>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Uso em main.jsx
import { ErrorBoundary } from '@/components/ErrorBoundary';

<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

### **Tarefa 3: Retry Logic with Exponential Backoff (7 min)**

```javascript
// src/lib/retryUtils.js
/**
 * Retry com exponential backoff
 * @param {Function} fn - Função a executar
 * @param {Object} options - Opções de retry
 * @returns {Promise}
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
      return await fn();
    } catch (err) {
      lastError = err;
      
      if (attempt < maxAttempts) {
        // Calcular delay com jitter
        const delay = Math.min(
          initialDelay * Math.pow(backoffMultiplier, attempt - 1),
          maxDelay
        );
        const jitter = Math.random() * delay * 0.1;
        
        console.warn(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay + jitter));
      }
    }
  }

  console.error('❌ All retries failed');
  throw lastError;
}

// Uso em API calls
export async function getBillingReportWithRetry(clinicId, startDate, endDate) {
  return retryWithBackoff(
    () => getBillingReport(clinicId, startDate, endDate),
    { maxAttempts: 3 }
  );
}
```

---

### **Tarefa 4: API Error Handler Hook (5 min)**

```javascript
// src/hooks/useApiCall.js
import { useState, useCallback } from 'react';
import { retryWithBackoff } from '@/lib/retryUtils';

export function useApiCall() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (apiFunction, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      // Usar retry se ativado
      const result = options.retry
        ? await retryWithBackoff(apiFunction, options.retryConfig)
        : await apiFunction();

      setLoading(false);
      return result;
    } catch (err) {
      const message = err.message || 'Unknown error occurred';
      setError(message);
      setLoading(false);
      
      // Log para monitoria
      console.error('API Error:', { message, error: err });
      
      throw err;
    }
  }, []);

  return { loading, error, execute };
}

// Uso
const { loading, error, execute } = useApiCall();

async function loadReport() {
  try {
    const data = await execute(
      () => getBillingReport(clinicId, startDate, endDate),
      { retry: true, retryConfig: { maxAttempts: 3 } }
    );
    setReports(data);
  } catch (err) {
    addToast('Erro ao carregar relatório', 'error');
  }
}
```

---

### **Tarefa 5: Input Validation Messages (extra - tempo permitindo)**

```jsx
// Feedback imediato de validação
const [errors, setErrors] = useState({});

function validateForm(data) {
  const newErrors = {};
  
  if (!data.clinic_id) {
    newErrors.clinic_id = 'Clínica é obrigatória';
  }
  
  if (!data.startDate) {
    newErrors.startDate = 'Data inicial é obrigatória';
  }
  
  if (data.startDate && data.endDate && data.startDate > data.endDate) {
    newErrors.dateRange = 'Data inicial não pode ser após final';
  }
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
}

// Renderizar feedback
{errors.startDate && (
  <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>
)}
```

---

## 🛠️ **ARQUIVOS A CRIAR/MODIFICAR**

```
✨ src/components/ui/Toast.jsx (100 linhas)
   - useToast hook
   - ToastContainer component
   - Toast component

✨ src/components/ErrorBoundary.jsx (80 linhas)
   - Error boundary class component
   - Fallback UI

✨ src/lib/retryUtils.js (50 linhas)
   - retryWithBackoff function
   - Exponential backoff logic

✨ src/hooks/useApiCall.js (60 linhas)
   - useApiCall hook
   - Error management

📝 src/main.jsx (MODIFICAR)
   - Wrap <App> com <ErrorBoundary>
   - Add <ToastContainer>
```

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

```
Toast System:
  □ Criar useToast hook
  □ Criar ToastContainer component
  □ Adicionar em main.jsx
  □ Estilizar (verde/vermelho/amarelo)

Error Boundary:
  □ Criar ErrorBoundary class component
  □ Implementar getDerivedStateFromError
  □ Implementar componentDidCatch
  □ Wrappear <App> em main.jsx

Retry Logic:
  □ Criar retryWithBackoff function
  □ Implementar exponential backoff
  □ Adicionar jitter para evitar thundering herd
  □ Criar useApiCall hook

Integração:
  □ Usar toasts em Dashboard components
  □ Usar retry em API calls críticas
  □ Testar error boundary com componente que quebra
  □ Validar messages de usuário
```

---

## 🎯 **RESULTADO ESPERADO**

```
✅ Notificações visuais para usuários (toasts)
✅ Error boundary previne page crash
✅ Retry automático para falhas transientes
✅ Mensagens de erro claras
✅ Feedback de loading
✅ Validação com feedback imediato
```

---

## ⏱️ **TIMELINE**

```
10 min: Toast notification system
 8 min: Error boundary component
 7 min: Retry logic implementation
 5 min: API error handler hook
────────
30 min: TOTAL
```

**Tempo estimado: 30 minutos**
**Resultado esperado: 85% → 90% projeto concluído**

---

## 📄 **PRÓXIMOS PASSOS (Após FASE 15)**

```
FASE 16: Deploy Preparation (30 min) → 90% → 95%
   - .env.production setup
   - Build optimization
   - Database backup
   - Deploy docs

FASE 17: Production Deployment (30 min) → 95% → 100%
   - Deploy via Vercel/Docker
   - Post-deploy verification
   - Monitoring setup
   - Rollback plan
```

---

**Comece agora! ⚠️** Use arquivo: `✅_FASE_15_COMECA_AGORA.md` para instruções prontas para copy-paste.
