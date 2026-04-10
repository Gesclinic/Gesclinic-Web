# 🚀 GUIA RÁPIDO - IMPLEMENTAÇÃO DO SISTEMA DE SUGESTÕES

## ⚡ 3 Passos para Colocar em Produção

### PASSO 1: Aplicar Migration no Supabase (2 min)

```sql
-- Acessar: Supabase Dashboard > SQL Editor
-- Copiar e executar:

CREATE TABLE IF NOT EXISTS public.suggestion_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  suggestion_type VARCHAR(50) NOT NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  action_taken VARCHAR(50) NOT NULL,
  result JSONB,
  executed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suggestion_audit_logs_clinic_id ON public.suggestion_audit_logs(clinic_id);
CREATE INDEX idx_suggestion_audit_logs_executed_at ON public.suggestion_audit_logs(executed_at);

ALTER TABLE public.suggestion_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suggestion_audit_logs_view_by_role" ON public.suggestion_audit_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM clinic_members WHERE clinic_members.clinic_id = suggestion_audit_logs.clinic_id AND clinic_members.user_id = auth.uid() AND clinic_members.role IN ('gestor', 'admin', 'recepcion')));

CREATE POLICY "suggestion_audit_logs_insert_by_system" ON public.suggestion_audit_logs FOR INSERT WITH CHECK (TRUE);
```

### PASSO 2: Integrar na Página de Agenda (10 min)

**Arquivo:** `src/pages/clinica/agenda/AgendaPage.jsx` (ou similar)

```jsx
import React, { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useClinicContext } from "@/contexts/ClinicContext";
import SuggestionsDrawer, { useSuggestionsDrawer } from "./components/SuggestionsDrawer";
import { useAgendaSuggestions } from "./hooks/useAgendaSuggestions";

export default function AgendaPage() {
  const { user } = useAuth();
  const { clinicId } = useClinicContext();
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const suggestionsDrawer = useSuggestionsDrawer();
  const { suggestions } = useAgendaSuggestions(clinicId, selectedDate, refreshTrigger);

  const handleSuggestionAction = useCallback((data) => {
    const { suggestion, action } = data;
    
    // TODO: Implementar ações (abrir modal, criar encaixe, etc)
    console.log("Ação:", action, "Sugestão:", suggestion);
    
    // Recarregar sugestões
    setTimeout(() => setRefreshTrigger(prev => prev + 1), 500);
  }, []);

  return (
    <div className="flex h-full">
      {/* Coluna Principal */}
      <div className="flex-1">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h1 className="text-2xl font-bold">Agenda</h1>
          
          {/* Botão Sugestões */}
          {suggestions.length > 0 && (
            <button
              onClick={suggestionsDrawer.toggle}
              className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg"
            >
              💡 {suggestions.length} sugestão{suggestions.length !== 1 ? "es" : ""}
            </button>
          )}
        </div>

        {/* Seu Grid/Calendário da Agenda */}
        <div className="p-4">
          {/* [Seu componente de agenda aqui] */}
        </div>
      </div>

      {/* Drawer Desktop (opcional) */}
      <div className="hidden lg:block w-96 border-l p-4">
        {suggestions.length > 0 ? (
          <div>
            <h3 className="font-bold mb-4">💡 Sugestões Inteligentes</h3>
            {/* Renderizar sugestões aqui */}
          </div>
        ) : (
          <p className="text-gray-500">Nenhuma sugestão</p>
        )}
      </div>

      {/* Drawer Mobile */}
      <SuggestionsDrawer
        clinicId={clinicId}
        date={selectedDate}
        isOpen={suggestionsDrawer.isOpen}
        onClose={suggestionsDrawer.close}
        onSuggestionAction={handleSuggestionAction}
        userRole={user?.role}
      />
    </div>
  );
}
```

### PASSO 3: Atualizar quando eventos ocorrem (5 min)

Adicionar refresh em eventos que afetam agenda:

```jsx
// Quando check-in é marcado
const handleCheckIn = async (appointmentId) => {
  await createCheckIn(appointmentId);
  setRefreshTrigger(prev => prev + 1); // Recarregar sugestões
};

// Quando falta é marcada
const handleMarkNoShow = async (appointmentId) => {
  await updateAppointmentStatus(appointmentId, "falta");
  setRefreshTrigger(prev => prev + 1);
};

// Quando encaixe é criado
const handleCreateAppointment = async (data) => {
  await createAppointment(data);
  setRefreshTrigger(prev => prev + 1);
};

// Quando atendimento é finalizado
const handleFinishAppointment = async (appointmentId) => {
  await finishAttendance(appointmentId);
  setRefreshTrigger(prev => prev + 1);
};
```

---

## ✅ CHECKLIST

- [ ] Migration aplicada no Supabase
- [ ] Componentes importados na página de Agenda
- [ ] Hook `useAgendaSuggestions` configurado
- [ ] Drawer renderizado (mobile + desktop)
- [ ] Callbacks de ação implementados
- [ ] Refresh de sugestões em eventos principais
- [ ] Testado com dados reais
- [ ] Permissões verificadas (recepcion/gestor pode ver)

---

## 🧪 TESTE RÁPIDO

Após implementar, no console do navegador:

```javascript
// Importar API
import { generateEncaixeSuggestions } from "@/lib/agendaSuggestionsApi";

// Testar
const suggestions = await generateEncaixeSuggestions(
  "seu-clinic-uuid",
  "2026-01-14"
);

console.log(suggestions);
```

Se houver erro de indicadores, garantir que a RPC `get_agenda_indicators` está criada.

---

## 🎯 PRÓXIMAS OTIMIZAÇÕES

Após implementação básica:

1. **Dashboard de Analytics**
   - Sugestões aceitas vs ignoradas
   - Receita gerada por sugestão

2. **Notificações**
   - Toast quando nova sugestão ALTA
   - Badge no menu de Agenda

3. **IA/Machine Learning**
   - Aprender padrões de aceitação do usuário
   - Personalizar tipos de sugestão

4. **Integração SMS**
   - Contatar pacientes automaticamente
   - Acompanhar confirmação

---

## 📞 SUPORTE

Se houver erros:

1. Verificar console (F12)
2. Verificar se migration foi aplicada
3. Verificar se `clinic_id` está correto
4. Verificar permissões de RLS no Supabase
5. Consultar SISTEMA_SUGESTOES_INTELIGENTES_GUIA_COMPLETO.md

---

**Tempo total: ~20 minutos para produção** ⚡
