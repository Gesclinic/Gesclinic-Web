# 💻 EXEMPLOS DE CÓDIGO - MÓDULO DE PACIENTES V2

**Referência rápida para implementações comuns**

---

## 📋 Sumário

1. [Usar PatientContext](#1-usar-patientcontext)
2. [Proteger Rotas](#2-proteger-rotas)
3. [Validar em Páginas](#3-validar-em-páginas)
4. [Menu Dinâmico](#4-menu-dinâmico)
5. [API Calls Seguras](#5-api-calls-seguras)
6. [Toast de Erro](#6-toast-de-erro)

---

## 1. Usar PatientContext

### Importar e Acessar

```javascript
import { usePatientContext } from "@/contexts/PatientContext";

export default function MyComponent() {
  const { 
    activePatientId,      // string | null
    patientData,          // object | null
    isPatientSelected,    // boolean ✨ NOVO
    loading,              // boolean
    alerts,               // object
    loadPatient,          // function
    clearPatient,         // function
    updatePatientData,    // function
  } = usePatientContext();

  return (
    <div>
      {isPatientSelected ? (
        <div>Paciente: {patientData.name}</div>
      ) : (
        <div>Nenhum paciente selecionado</div>
      )}
    </div>
  );
}
```

### Carregar Paciente

```javascript
const { loadPatient, activePatientId } = usePatientContext();

useEffect(() => {
  const patientId = "123-abc-def";
  
  // ✅ Sempre passa patientId válido
  loadPatient(patientId);
}, []);
```

### Limpar Paciente

```javascript
const { clearPatient } = usePatientContext();

function handleLogout() {
  clearPatient(); // Limpa contexto
  navigate("/login");
}
```

---

## 2. Proteger Rotas

### Em AppRoutes.jsx

```jsx
import PatientRouteGuard from "@/components/pacientes/PatientRouteGuard";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="clinica" element={<AppLayout />}>
        
        {/* Rotas sem proteção */}
        <Route path="pacientes" element={<Outlet />}>
          <Route index element={<PatientListPage />} />
          <Route path="novo" element={<PatientCadastroPage />} />
        </Route>

        {/* ✅ Rotas com proteção */}
        <Route 
          path="pacientes/:patientId/*"
          element={
            <PatientRouteGuard>
              <Outlet />
            </PatientRouteGuard>
          }
        >
          <Route index element={<PatientHubPage />} />
          <Route path="dados" element={<PatientDadosPage />} />
          <Route path="documentos" element={<PatientDocumentosPage />} />
          {/* ... mais rotas */}
        </Route>

      </Route>
    </Routes>
  );
}
```

### Guard Customizado (Avançado)

Se precisar de guard adicional:

```jsx
function AdminPatientGuard({ children }) {
  const { user } = useAuth();
  const { activePatientId } = usePatientContext();
  
  if (user?.role !== "admin") {
    return <Navigate to="/unauthorized" />;
  }
  
  if (!activePatientId) {
    return <Navigate to="/clinica/pacientes" />;
  }
  
  return children;
}

// Usar:
<Route 
  path="pacientes/:patientId/admin/*"
  element={<AdminPatientGuard><PatientRouteGuard><Outlet/></PatientRouteGuard></AdminPatientGuard>}
>
  {/* Rotas admin */}
</Route>
```

---

## 3. Validar em Páginas

### Pattern Básico

```jsx
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePatientContext } from "@/contexts/PatientContext";

export default function MyPatientPage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { patientData, loading } = usePatientContext();

  // ⚠️ Guard obrigatório
  useEffect(() => {
    if (!patientId || patientId.trim() === "") {
      console.warn("❌ MyPatientPage: patientId inválido");
      navigate("/clinica/pacientes");
    }
  }, [patientId, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!patientData) {
    return <ErrorMessage />;
  }

  return (
    <div>
      <h1>{patientData.name}</h1>
      {/* Conteúdo aqui */}
    </div>
  );
}
```

### Com Dados Iniciais

```jsx
useEffect(() => {
  if (!patientId || patientId.trim() === "") {
    console.warn("❌ MyPatientPage: patientId inválido");
    navigate("/clinica/pacientes");
    return;
  }

  if (patientData) {
    // Inicializar formulário com dados existentes
    setFormData({
      name: patientData.name || "",
      email: patientData.email || "",
      // ...
    });
  }
}, [patientId, patientData, navigate]);
```

### Com Salvamento

```jsx
async function handleSave() {
  // ⚠️ Guard antes de salvar
  if (!patientId || patientId.trim() === "") {
    toast({
      title: "Erro",
      description: "ID do paciente inválido",
      variant: "destructive",
    });
    return;
  }

  setLoading(true);
  try {
    const result = await updatePatient(patientId, formData);
    updatePatientData(result);
    
    toast({
      title: "Sucesso",
      description: "Dados salvos com sucesso",
    });
  } catch (error) {
    toast({
      title: "Erro",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
}
```

---

## 4. Menu Dinâmico

### Usar isPatientSelected

```jsx
import { usePatientContext } from "@/contexts/PatientContext";

export default function PatientSidebar() {
  const { isPatientSelected, patientData, activePatientId } = usePatientContext();

  // ✅ Menu items baseado em isPatientSelected
  const menuItems = isPatientSelected
    ? [
        { label: "Hub", icon: User, path: `/clinica/pacientes/${activePatientId}` },
        { label: "Dados", icon: FileText, path: `/clinica/pacientes/${activePatientId}/dados` },
        { label: "Documentos", icon: Folder, path: `/clinica/pacientes/${activePatientId}/documentos` },
      ]
    : [
        { label: "Lista", icon: Users, path: "/clinica/pacientes" },
        { label: "Novo", icon: Plus, path: "/clinica/pacientes/novo" },
      ];

  return (
    <div>
      {/* Header do Menu */}
      <h3>Pacientes</h3>
      
      {/* ✅ Mostrar APENAS quando selecionado */}
      {isPatientSelected && (
        <div className="bg-blue-50 p-3 rounded">
          <p className="text-xs text-gray-600">Paciente Ativo</p>
          <p className="font-bold">{patientData?.name}</p>
        </div>
      )}

      {/* Menu Items */}
      <nav>
        {menuItems.map((item) => (
          <MenuButton key={item.label} {...item} />
        ))}
      </nav>

      {/* ✅ Footer APENAS quando selecionado */}
      {isPatientSelected && (
        <button className="btn-primary w-full">
          Completar Cadastro
        </button>
      )}
    </div>
  );
}
```

### Verificar em Componentes

```jsx
function ConveniosButton() {
  const { isPatientSelected } = usePatientContext();

  if (!isPatientSelected) {
    return (
      <button disabled className="opacity-50 cursor-not-allowed">
        Convênios (Selecione paciente)
      </button>
    );
  }

  return (
    <button className="btn-primary">
      Gerenciar Convênios
    </button>
  );
}
```

---

## 5. API Calls Seguras

### Fetch Seguro

```jsx
const { activePatientId, loading, error } = usePatientContext();

useEffect(() => {
  if (!activePatientId) {
    console.warn("Nenhum paciente selecionado");
    return; // ⚠️ Não faz fetch
  }

  async function fetchData() {
    try {
      const data = await patientsApi.getPatientDocuments(activePatientId);
      setDocuments(data);
    } catch (err) {
      console.error("Erro ao buscar documentos:", err);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  }

  fetchData();
}, [activePatientId]); // ⚠️ Depende de activePatientId
```

### Com Validação Extra

```jsx
async function updatePatient() {
  // 1️⃣ Validação no Context
  if (!activePatientId) {
    toast({ title: "Erro", description: "Paciente não selecionado" });
    return;
  }

  // 2️⃣ Validação na Página
  if (!formData.name || !formData.email) {
    toast({ title: "Erro", description: "Preencha todos os campos" });
    return;
  }

  // 3️⃣ Fazer chamada segura
  try {
    await updatePatient(activePatientId, formData);
    updatePatientData(formData);
  } catch (error) {
    // Tratamento de erro
  }
}
```

### Fetch com Retry

```jsx
async function fetchWithRetry(patientId, maxAttempts = 3) {
  if (!patientId) {
    throw new Error("patientId inválido");
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await patientsApi.getPatientById(patientId);
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      
      // Aguardar antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

// Usar:
try {
  const patient = await fetchWithRetry(activePatientId);
  setPatientData(patient);
} catch (error) {
  toast({ title: "Erro ao carregar paciente", description: error.message });
}
```

---

## 6. Toast de Erro

### Padrão Simples

```jsx
import { useToast } from "@/components/ui/use-toast";

export default function MyComponent() {
  const { toast } = useToast();

  async function handleSave() {
    if (!patientId) {
      toast({
        title: "Erro",
        description: "ID do paciente inválido",
        variant: "destructive",
      });
      return;
    }

    // ... salvar
  }
}
```

### Com Tipos

```jsx
function showError(error: Error) {
  toast({
    title: "Erro",
    description: error.message || "Erro desconhecido",
    variant: "destructive",
  });
}

function showSuccess(message: string) {
  toast({
    title: "Sucesso",
    description: message,
  });
}

// Usar:
try {
  await updatePatient(patientId, data);
  showSuccess("Paciente atualizado com sucesso");
} catch (error) {
  showError(error);
}
```

### Com Context de Validação

```jsx
async function updatePatient() {
  // Validações
  const validations = [
    { condition: !patientId, message: "ID do paciente inválido" },
    { condition: !formData.name, message: "Nome é obrigatório" },
    { condition: !formData.email, message: "Email é obrigatório" },
  ];

  for (const validation of validations) {
    if (validation.condition) {
      toast({
        title: "Validação",
        description: validation.message,
        variant: "destructive",
      });
      return;
    }
  }

  // Não tem erros, prosseguir
  try {
    await updatePatient(patientId, formData);
    showSuccess("Paciente atualizado");
  } catch (error) {
    showError(error);
  }
}
```

---

## 🚀 Boas Práticas

### ✅ FAZER

```javascript
// 1. Sempre validar patientId em useEffect
if (!patientId || patientId.trim() === "") {
  return; // ou navigate
}

// 2. Usar isPatientSelected para renderização condicional
if (isPatientSelected) {
  // Mostrar dados do paciente
}

// 3. Validar antes de fetch
if (!activePatientId) {
  console.warn("Nenhum paciente selecionado");
  return;
}

// 4. Usar guard em rotas protegidas
<Route path=":id/*" element={<Guard><Outlet/></Guard>}>

// 5. Toast de erro informativo
toast({
  title: "Erro",
  description: "ID do paciente inválido",
  variant: "destructive",
});
```

### ❌ NÃO FAZER

```javascript
// 1. Não calcular hasActivePatient múltiplas vezes
// ❌ const hasActive = !!activePatientId && !!patientData;
// ✅ Use isPatientSelected

// 2. Não fazer fetch sem validação
// ❌ useEffect(() => {
//   const data = await fetch(...); // Sem validação de ID
// }, []);

// 3. Não acessar patientData sem check
// ❌ <h1>{patientData.name}</h1> // Pode ser null
// ✅ <h1>{patientData?.name || "N/A"}</h1>

// 4. Não usar absolute para footer
// ❌ <div className="absolute bottom-0">Footer</div>
// ✅ Use flex layout

// 5. Não ignorar validação de ID em handleSave
// ❌ async function save() {
//   await api.update(patientId, data); // Sem check
// }
```

---

## 📚 Referências Rápidas

### Propriedades do PatientContext

| Propriedade | Tipo | Descrição |
|-------------|------|-----------|
| `activePatientId` | string \| null | ID do paciente ativo |
| `patientData` | object \| null | Dados completos |
| `isPatientSelected` | boolean | ✨ Usar ISSO para condicional |
| `loading` | boolean | Carregando? |
| `error` | string \| null | Mensagem de erro |
| `alerts` | object | 4 tipos de alerta |

### Métodos do PatientContext

| Método | Parâmetros | Descrição |
|--------|-----------|-----------|
| `loadPatient()` | patientId: string | Carrega paciente |
| `clearPatient()` | - | Limpa contexto |
| `updatePatientData()` | data: object | Atualiza cache |

### Componentes Reutilizáveis

```jsx
// Guard para rotas
<PatientRouteGuard><Outlet/></PatientRouteGuard>

// Menu dinâmico
<PatientSidebar />

// Context Provider
<PatientProvider><App/></PatientProvider>
```

---

**Desenvolvido por:** AI Assistant  
**Data:** 14 de Janeiro de 2026  
**Versão:** 2.0
