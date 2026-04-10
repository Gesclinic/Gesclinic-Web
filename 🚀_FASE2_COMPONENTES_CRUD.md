# 🚀 FASE 2: Implementar Componentes CRUD Base do Sistema

**Data:** 2026-01-15  
**Status:** 🟢 Pronto para Início  
**Tempo Estimado:** 2-3 horas  

---

## 📋 Objetivo

Substituir os 12 placeholders em `src/pages/clinica/base-sistema/pages.jsx` com componentes CRUD reais que:
- ✅ Carregam dados via APIs (já existem)
- ✅ Exibem em tabela com paginação
- ✅ Permitem CRUD (criar, editar, deletar)
- ✅ Incluem validação e error handling
- ✅ Implementam soft delete
- ✅ Filtram por clinic_id

---

## 🎯 Estratégia

### Opção 1: Incremental (Recomendada)
```
1. Criar ServicosPage completa (piloto) .......... 45 min
2. Duplicar padrão para ProfissionalsPage ....... 20 min
3. Duplicar padrão para ConveniosPage ........... 20 min
4. Duplicar padrão para SalasPage ............... 20 min
5. Duplicar padrão para RecursosPage ............ 20 min
6. Criar páginas de relacionamentos ............. 45 min (2-3 últimas)
                                              ──────────
TOTAL: 2 horas 50 minutos
```

### Opção 2: Assistida (Com IA)
```
Descrever estrutura uma vez
IA duplica padrão para todos os 12
Tempo: 30-45 minutos
Risco: Menos customização
```

**Seleção:** Opção 1 (mais seguro, mais aprendizado)

---

## 🛠️ Começar com ServicosPage (Template)

### Estrutura Alvo

```jsx
// src/pages/clinica/base-sistema/ServicosPage.jsx
// Componente CRUD completo

Imports:
├─ React hooks (useState, useEffect)
├─ Supabase client
├─ servicesApi (existente ✅)
├─ useAuth (permissions)
├─ UI components (Card, Table, Button, Form)
└─ Icons (Trash2, Edit2, Plus)

Estado:
├─ services: [] (lista)
├─ loading: false
├─ error: null
├─ showForm: false
├─ editingId: null
└─ formData: {}

Funções:
├─ loadServices() → chama servicesApi.getServices()
├─ handleCreate() → servicesApi.createService()
├─ handleUpdate() → servicesApi.updateService()
├─ handleDelete() → soft delete via API
├─ handleSubmit() → valida e salva
└─ openForm() / closeForm()

Render:
├─ Header com botão "Novo Serviço"
├─ Tabela com dados (id, name, description, active)
├─ Colunas de ação (Edit, Delete)
├─ Modal/Dialog de formulário
├─ Loading skeleton
└─ Error alert
```

---

## 💻 Código Exemplo: ServicosPage.jsx

```jsx
// src/pages/clinica/base-sistema/ServicosPage.jsx
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useClinicContext } from "@/hooks/useClinicContext";
import * as servicesApi from "@/lib/servicesApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Edit2, Trash2 } from "lucide-react";

export function ServicosPage() {
  const { user, isAuthenticated } = useAuth();
  const { clinicId } = useClinicContext();
  
  // Estado
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    active: true,
  });

  // Carregar dados ao montar
  useEffect(() => {
    if (clinicId && isAuthenticated) {
      loadServices();
    }
  }, [clinicId, isAuthenticated]);

  // Carregar serviços
  const loadServices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await servicesApi.getServices(clinicId);
      setServices(data || []);
    } catch (err) {
      setError(err.message);
      console.error("Erro ao carregar serviços:", err);
    } finally {
      setLoading(false);
    }
  };

  // Abrir formulário para novo serviço
  const handleNew = () => {
    setEditingId(null);
    setFormData({ name: "", description: "", active: true });
    setShowForm(true);
  };

  // Abrir formulário para editar
  const handleEdit = (service) => {
    setEditingId(service.id);
    setFormData({
      name: service.name,
      description: service.description,
      active: service.active,
    });
    setShowForm(true);
  };

  // Deletar serviço
  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja deletar este serviço?")) {
      try {
        setError(null);
        await servicesApi.deleteService(id);
        setServices(services.filter(s => s.id !== id));
      } catch (err) {
        setError(err.message);
      }
    }
  };

  // Salvar formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validação básica
    if (!formData.name.trim()) {
      setError("Nome do serviço é obrigatório");
      return;
    }

    try {
      setError(null);
      
      if (editingId) {
        // Atualizar
        await servicesApi.updateService(editingId, formData);
        setServices(
          services.map(s =>
            s.id === editingId ? { ...s, ...formData } : s
          )
        );
      } else {
        // Criar novo
        const newService = await servicesApi.createService(clinicId, formData);
        setServices([...services, newService]);
      }
      
      setShowForm(false);
    } catch (err) {
      setError(err.message);
      console.error("Erro ao salvar:", err);
    }
  };

  // Render: Estado de carregamento
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  // Render: Principal
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-600 mt-1">
            Gerencie os serviços oferecidos pela clínica
          </p>
        </div>
        <Button
          onClick={handleNew}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </Button>
      </div>

      {/* Alert de erro */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-900">Erro</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>
            Serviços Cadastrados ({services.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {services.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhum serviço cadastrado</p>
              <Button
                onClick={handleNew}
                variant="outline"
                className="mt-4"
              >
                Cadastrar primeiro serviço
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4 font-semibold">Nome</th>
                    <th className="text-left py-2 px-4 font-semibold">Descrição</th>
                    <th className="text-left py-2 px-4 font-semibold">Status</th>
                    <th className="text-center py-2 px-4 font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(service => (
                    <tr key={service.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{service.name}</td>
                      <td className="py-3 px-4 text-gray-600">
                        {service.description || "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            service.active
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {service.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(service)}
                          className="p-2 hover:bg-blue-100 rounded text-blue-600"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-600"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de formulário */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingId ? "Editar Serviço" : "Novo Serviço"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                      className="rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Ativo
                    </span>
                  </label>
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    type="button"
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                  >
                    {editingId ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
```

---

## 📝 Padrão para Outras Páginas

### Substituição por Copiar/Colar

```jsx
// TEMPLATE GENÉRICO - copiar para outras páginas
// Mudar apenas:

// 1. Nome da página
export function [EntidadeName]Page() {

// 2. Imports
import * as [entidadeApi] from "@/lib/[entidadeApi].js";

// 3. Títulos
title: "[Nome Entidade]"
description: "[Descrição]"

// 4. Variáveis de estado
services → [entities]
const [entities, setEntities] = useState([]);

// 5. API calls
servicesApi.getServices(clinicId)
servicesApi.createService(clinicId, formData)
servicesApi.updateService(id, formData)
servicesApi.deleteService(id)

// 6. Campos do formulário
name, description, active → [campos específicos da entidade]

// 7. Colunas da tabela
[aplicar colunas relevantes de cada tabela]
```

---

## ✅ Checklist Implementação

### ServicosPage (Piloto)

```
[ ] Criar arquivo: src/pages/clinica/base-sistema/ServicosPage.jsx
[ ] Implementar estado (services, loading, error)
[ ] Implementar loadServices()
[ ] Implementar handleCreate()
[ ] Implementar handleEdit()
[ ] Implementar handleDelete()
[ ] Implementar formulário (nome, descrição, ativo)
[ ] Implementar tabela com dados
[ ] Implementar error handling
[ ] Implementar loading state
[ ] Testar CRUD completo
[ ] Testar soft delete
[ ] Atualizar pages.jsx para importar ServicosPage
[ ] Testar navegação
```

### ProfissionalsPage

```
[ ] Criar arquivo: src/pages/clinica/base-sistema/ProfessionalsPage.jsx
[ ] Duplicar padrão de ServicosPage
[ ] Ajustar campos: name, specialization, email, phone, active
[ ] Importar em pages.jsx
[ ] Testar CRUD
```

### ConveniosPage

```
[ ] Criar arquivo: src/pages/clinica/base-sistema/ConveniosPage.jsx
[ ] Duplicar padrão
[ ] Ajustar campos: code, name, type, cnpj, contact_email, active
[ ] Importar em pages.jsx
[ ] Testar CRUD
```

### [continuar para outras 9...]

---

## 🔄 Passo a Passo Detalhado

### Step 1: Criar ServicosPage.jsx
```bash
# Copiar template acima para novo arquivo
src/pages/clinica/base-sistema/ServicosPage.jsx
```

### Step 2: Atualizar pages.jsx
```jsx
// Antes:
export function ServicesPage() {
  return <BaseSystemPlaceholder title="Serviços" ... />
}

// Depois:
export { ServicosPage as ServicesPage } from "./ServicosPage";
```

### Step 3: Testar uma entidade completa
```
1. Navegar para /clinica/base-sistema/servicos
2. Clicar "Novo Serviço"
3. Preencher formulário
4. Clicar "Criar"
5. Verificar se aparece na tabela
6. Clicar Edit
7. Modificar e salvar
8. Clicar Delete
9. Confirmar soft delete
```

### Step 4: Duplicar para outras 11 páginas
```
Repetir para:
- Profissionais
- Convênios
- Salas
- Recursos
- Profissional-Serviço
- Regras Agenda
- Sala-Recursos
- Profissional-Disponibilidade
- Valores Serviço
- Regras Repasse
- Profissional-Convênio
```

---

## 📊 Tempo Estimado por Página

| Página | Tempo | Notas |
|--------|-------|-------|
| ServicosPage (template) | 45 min | Criar do zero |
| ProfessionalsPage | 15 min | Copiar + ajustar 5 campos |
| ConveniosPage | 15 min | Copiar + ajustar 6 campos |
| SalasPage | 15 min | Copiar + ajustar 3 campos |
| RecursosPage | 15 min | Copiar + ajustar 3 campos |
| Profissional-Serviço | 20 min | Relacionamento (2 selects) |
| Regras Agenda | 20 min | Relacionamento + regras |
| Sala-Recursos | 20 min | Relacionamento |
| Profissional-Disponibilidade | 25 min | Horários |
| Valores Serviço | 25 min | Valores numéricos |
| Regras Repasse | 25 min | Cálculos |
| Profissional-Convênio | 20 min | Relacionamento |
| **TOTAL** | **2h 50m** | **Incremental** |

---

## 🎯 Próxima Ação

### ✅ Começar AGORA:

1. **Criar ServicosPage.jsx** usando template acima
2. **Atualizar pages.jsx** para importar novo componente
3. **Testar CRUD completo** para serviços
4. **Documentar qualquer ajuste** necessário
5. **Duplicar padrão** para próximas 11 páginas

### Resultado Esperado

```
ANTES: 12 placeholders
DEPOIS: 12 componentes CRUD funciais

Benefício: 
✅ Menu Base do Sistema 100% operacional
✅ Todas as entidades estruturais gerenciáveis
✅ CRUD completo em todas as tabelas
```

---

**Status FASE 2:** 🟢 Pronto para Início  
**Tempo Estimado:** 2h 50m  
**Complexidade:** Média (padrão repetitivo)  
**Risco:** Baixo (APIs já existem)
