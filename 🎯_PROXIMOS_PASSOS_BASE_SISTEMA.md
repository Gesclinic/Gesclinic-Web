# 🎯 PRÓXIMOS PASSOS: IMPLEMENTAR COMPONENTES BASE DO SISTEMA

**Status:** Prompt criado + Validação realizada  
**Progresso:** 70% (menu + rotas + navegação)  
**Faltam:** Componentes CRUD + Permissões + Validações

---

## 🎬 Sequência de Implementação (Priorizado)

### FASE 1: Auditoria e Validação (1-2 horas)

#### 1.1 Verificar Queries com Colunas Inexistentes

```bash
# Procurar por referências a group_id
grep -r "group_id" src/lib/

# Procurar por outras colunas potencialmente inexistentes
grep -r "\.user_id" src/lib/
grep -r "\.deleted_at" src/lib/
```

**Ação:** Documentar colunas que não existem e corrigir queries

#### 1.2 Verificar Schema Atual no Supabase

```sql
-- Conectar ao Supabase e rodar:
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'services';

-- Repetir para: professionals, convenios, salas, recursos
```

**Ação:** Documentar colunas reais disponíveis

#### 1.3 Revisar APIs Existentes

```javascript
// Em src/lib/
- clinicsApi.js      - já tem?
- appointmentsApi.js - já tem?
- servicesApi.js     - FALTA?
- professionalsApi.js - FALTA?
- conveiosApi.js      - FALTA?
// ... etc
```

**Ação:** Listar APIs que faltam implementar

---

### FASE 2: Criar APIs Base (2-3 horas)

**Criar em `src/lib/` (seguindo padrão existing):**

#### 2.1 servicesApi.js

```javascript
// src/lib/servicesApi.js

import { supabase } from './customSupabaseClient';

export const getServices = async (clinicId) => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name, description, category, duration')  // Apenas colunas existentes
    .eq('clinic_id', clinicId)
    .eq('deleted_at', null)
    .order('name');
  
  if (error) throw error;
  return data;
};

export const createService = async (clinicId, serviceData) => {
  const { data, error } = await supabase
    .from('services')
    .insert([{ ...serviceData, clinic_id: clinicId }])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const updateService = async (id, serviceData) => {
  const { data, error } = await supabase
    .from('services')
    .update(serviceData)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};

export const deleteService = async (id) => {
  // Soft delete
  const { data, error } = await supabase
    .from('services')
    .update({ deleted_at: new Date() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
```

**Repetir para:**
- professionalsApi.js
- conveiosApi.js
- salasApi.js
- recursosApi.js
- vinculosApi.js (professional-service relationship)
- regrasAgendaApi.js
- valoresServicoApi.js
- repasseApi.js

---

### FASE 3: Criar Componentes CRUD (4-5 horas)

**Estrutura de pasta esperada:**

```
src/pages/clinica/base-sistema/
├── pages/
│   ├── ServicosPage.jsx
│   ├── ProfissionaisPage.jsx
│   ├── ConveniosPage.jsx
│   ├── SalasPage.jsx
│   ├── RecursosPage.jsx
│   ├── VinculosPage.jsx
│   ├── RegrasAgendaPage.jsx
│   ├── ValoresServicoPage.jsx
│   └── RepasseePage.jsx
│
└── components/
    ├── DataTable.jsx          (reutilizável)
    ├── FormDialog.jsx         (reutilizável)
    └── ConfirmDelete.jsx      (reutilizável)
```

**Exemplo: ServicosPage.jsx**

```javascript
// src/pages/clinica/base-sistema/pages/ServicosPage.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getServices, createService, updateService, deleteService } from '@/lib/servicesApi';
import DataTable from '../components/DataTable';
import FormDialog from '../components/FormDialog';

export const ServicosPage = () => {
  const { clinicId, userRole } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  // Verificar permissão
  if (userRole !== 'admin') {
    return <div>Acesso negado. Apenas administrador.</div>;
  }

  // Carregar dados
  useEffect(() => {
    loadServices();
  }, [clinicId]);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await getServices(clinicId);
      setServices(data);
    } catch (error) {
      console.error('Erro ao carregar serviços:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (formData) => {
    try {
      await createService(clinicId, formData);
      setShowForm(false);
      loadServices();
    } catch (error) {
      console.error('Erro ao criar serviço:', error);
    }
  };

  const handleUpdate = async (id, formData) => {
    try {
      await updateService(id, formData);
      setShowForm(false);
      setSelectedService(null);
      loadServices();
    } catch (error) {
      console.error('Erro ao atualizar serviço:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteService(id);
      loadServices();
    } catch (error) {
      console.error('Erro ao deletar serviço:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Serviços/Procedimentos</h1>
        <button
          onClick={() => {
            setSelectedService(null);
            setShowForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + Novo Serviço
        </button>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <DataTable
          data={services}
          columns={[
            { key: 'name', label: 'Nome' },
            { key: 'description', label: 'Descrição' },
            { key: 'category', label: 'Categoria' },
            { key: 'duration', label: 'Duração (min)' },
          ]}
          onEdit={(service) => {
            setSelectedService(service);
            setShowForm(true);
          }}
          onDelete={(id) => {
            if (window.confirm('Deletar serviço?')) {
              handleDelete(id);
            }
          }}
        />
      )}

      {showForm && (
        <FormDialog
          title={selectedService ? 'Editar Serviço' : 'Novo Serviço'}
          fields={[
            { name: 'name', label: 'Nome', required: true },
            { name: 'description', label: 'Descrição' },
            { name: 'category', label: 'Categoria' },
            { name: 'duration', label: 'Duração (minutos)', type: 'number' },
          ]}
          initialData={selectedService}
          onSubmit={selectedService ? 
            (data) => handleUpdate(selectedService.id, data) :
            handleCreate
          }
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default ServicosPage;
```

---

### FASE 4: Integrar com AppRoutes (30 minutos)

**Adicionar em `AppRoutes.jsx`:**

```javascript
// Em clinica routes, dentro de base-sistema
import { ServicosPage } from '@/pages/clinica/base-sistema/pages/ServicosPage';
import { ProfissionaisPage } from '@/pages/clinica/base-sistema/pages/ProfissionaisPage';
// ... outros imports

<Route path="base-sistema" element={<BaseSystemLayout />}>
  <Route index element={<BaseSystemLayout />} />
  
  {/* CADASTROS ESTRUTURAIS */}
  <Route path="servicos" element={<ServicosPage />} />
  <Route path="profissionais" element={<ProfissionaisPage />} />
  <Route path="convenios" element={<ConveniosPage />} />
  <Route path="salas" element={<SalasPage />} />
  <Route path="recursos" element={<RecursosPage />} />
  
  {/* REGRAS OPERACIONAIS */}
  <Route path="professional-services" element={<VinculosPage />} />
  <Route path="agenda-rules" element={<RegrasAgendaPage />} />
  
  {/* PARÂMETROS FINANCEIROS */}
  <Route path="service-prices" element={<ValoresServicoPage />} />
  <Route path="revenue-rules" element={<RepasseePage />} />
</Route>
```

---

### FASE 5: Testar Tudo (1-2 horas)

**Checklist de Testes:**

- [ ] Cada rota abre sem erro 404
- [ ] Cada página carrega dados (se houver no BD)
- [ ] Criar novo item funciona
- [ ] Editar item funciona
- [ ] Deletar item funciona (soft delete)
- [ ] Dados isolados por clinic_id (não vazam entre clínicas)
- [ ] Permissão verificada (non-admin vê erro)
- [ ] Loading state funciona
- [ ] Error state funciona
- [ ] Soft delete funciona (deleted_at preenchido)

---

## 📝 Checklist Completo

### AUDIT
- [ ] Verificar queries com colunas inexistentes
- [ ] Documentar colunas disponíveis no schema
- [ ] Listar APIs que faltam

### CRIAR APIs (8 arquivos)
- [ ] servicesApi.js
- [ ] professionalsApi.js
- [ ] conveiosApi.js
- [ ] salasApi.js
- [ ] recursosApi.js
- [ ] vinculosApi.js
- [ ] regrasAgendaApi.js
- [ ] valoresServicoApi.js
- [ ] repasseApi.js

### CRIAR COMPONENTES (9 páginas)
- [ ] ServicosPage.jsx
- [ ] ProfissionaisPage.jsx
- [ ] ConveniosPage.jsx
- [ ] SalasPage.jsx
- [ ] RecursosPage.jsx
- [ ] VinculosPage.jsx
- [ ] RegrasAgendaPage.jsx
- [ ] ValoresServicoPage.jsx
- [ ] RepasseePage.jsx

### COMPONENTES REUTILIZÁVEIS
- [ ] DataTable.jsx
- [ ] FormDialog.jsx
- [ ] ConfirmDelete.jsx

### INTEGRAÇÃO
- [ ] Registrar rotas em AppRoutes.jsx
- [ ] Registrar menu em BaseSystemLayout.jsx
- [ ] Verificar permissões (admin only)

### TESTES
- [ ] Testar cada rota
- [ ] Testar CRUD completo
- [ ] Testar isolamento clinic_id
- [ ] Testar permissões
- [ ] Testar soft delete

---

## ⏱️ Estimativa de Tempo

```
FASE 1: Audit                    → 1-2h
FASE 2: APIs (9 arquivos)        → 2-3h
FASE 3: Componentes (9 páginas)  → 4-5h
FASE 4: Integração               → 0.5h
FASE 5: Testes                   → 1-2h
                                    ─────
TOTAL                            → 8-13h
```

---

## 🚀 Começar Agora

### 1️⃣ Audit Imediato
```bash
cd "c:\Users\ferna\Desktop\Projeto Gesclinic Web"
grep -r "group_id" src/lib/
grep -r "\.user_id" src/lib/
```

### 2️⃣ Criar Primeiro API (servicesApi.js)
Use o template acima

### 3️⃣ Criar Primeira Página (ServicosPage.jsx)
Use o template acima

### 4️⃣ Registrar Rota
Adicione em AppRoutes.jsx

### 5️⃣ Testar no Navegador
Acesse `/clinica/base-sistema/servicos`

---

## 📚 Referências

- **Prompt:** `02_menu_base_do_sistema.prompt.txt`
- **Validação:** `✅_VALIDACAO_BASE_SISTEMA_IMPLEMENTACAO.md`
- **Menu Atual:** `src/pages/clinica/base-sistema/BaseSystemLayout.jsx`
- **AppRoutes:** `src/AppRoutes.jsx`

---

**Status:** 🎬 Pronto para começar  
**Próximo:** Executar FASE 1 (Audit)  
**Tempo:** 8-13 horas para completar tudo
