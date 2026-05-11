/**
 * IMPLEMENTATION EXAMPLE - Agenda Module
 * =====================================
 * 
 * Complete examples of how to use the refactored Agenda module
 * in different scenarios and components.
 */

# Implementation Examples - Agenda Module v3.0

## 1. Listing Appointments with Real-time Updates

```typescript
// components/AgendaMainView.tsx
import { useAppointments } from '@/modules/agenda/hooks';
import { AppointmentCard } from '@/modules/agenda/components';
import type { Appointment } from '@/modules/agenda/types';
import { useState, useCallback } from 'react';

export function AgendaMainView() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { 
    appointments, 
    isLoading, 
    error,
    updateAppointment 
  } = useAppointments({
    clinicId: 'clinic-123',
    start: selectedDate.toISOString().split('T')[0],
    end: selectedDate.toISOString().split('T')[0],
    autoSubscribe: true, // Enable real-time updates
  });

  const handleStatusChange = useCallback(
    async (appointmentId: string, newStatus: string) => {
      try {
        await updateAppointment(appointmentId, { booking_status: newStatus });
      } catch (err) {
        console.error('Failed to update status:', err);
      }
    },
    [updateAppointment]
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="grid gap-4">
      {appointments.map((apt) => (
        <AppointmentCard
          key={apt.id}
          appointment={apt}
          onStatusChange={(status) => handleStatusChange(apt.id, status)}
        />
      ))}
    </div>
  );
}
```

## 2. Filtering Appointments

```typescript
// components/AgendaWithFilters.tsx
import { useAppointments, useAgendaFilters } from '@/modules/agenda/hooks';
import { AgendaFiltersPanel } from '@/modules/agenda/components';
import type { AgendaFilters } from '@/modules/agenda/types';
import { useMemo } from 'react';

export function AgendaWithFilters({ clinicId }: { clinicId: string }) {
  const { filters, updateFilter } = useAgendaFilters();

  const { appointments } = useAppointments({
    clinicId,
    professional_id: filters.professional_id,
    room_id: filters.room_id,
    status: filters.status,
  });

  // Apply additional client-side filtering
  const filtered = useMemo(() => {
    return appointments.filter((apt) => {
      if (filters.searchText) {
        return apt.patient?.name
          .toLowerCase()
          .includes(filters.searchText.toLowerCase());
      }
      return true;
    });
  }, [appointments, filters.searchText]);

  return (
    <div className="space-y-4">
      <AgendaFiltersPanel
        filters={filters}
        onFilterChange={(key, value) => updateFilter(key, value)}
      />
      
      <div className="grid gap-4">
        {filtered.map((apt) => (
          <div key={apt.id} className="p-4 border rounded">
            {apt.id} - {apt.patient?.name}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 3. Creating an Appointment

```typescript
// components/CreateAppointmentForm.tsx
import { useAppointmentForm } from '@/modules/agenda/hooks';
import { createAppointment } from '@/modules/agenda/services';
import type { AppointmentPayload } from '@/modules/agenda/types';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export function CreateAppointmentForm({ clinicId }: { clinicId: string }) {
  const { user } = useAuth();
  const { formData, updateField, errors, validate } = useAppointmentForm();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      console.error('Form validation failed:', errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AppointmentPayload = {
        clinic_id: clinicId,
        patient_id: formData.patient_id!,
        professional_id: formData.professional_id,
        scheduled_date: formData.scheduled_date!,
        scheduled_time: formData.scheduled_time!,
        duration_minutes: formData.duration_minutes,
        service_id: formData.service_id,
        payer_id: formData.payer_id,
        notes: formData.notes,
      };

      const created = await createAppointment(payload, user.id);
      console.log('Appointment created:', created);
      // Reset form or redirect
    } catch (err) {
      console.error('Failed to create appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Paciente</label>
        <input
          type="text"
          value={formData.patient_id || ''}
          onChange={(e) => updateField('patient_id', e.target.value)}
          className={errors.patient_id ? 'border-red-500' : ''}
        />
        {errors.patient_id && <span className="text-red-500">{errors.patient_id}</span>}
      </div>

      <div>
        <label>Data</label>
        <input
          type="date"
          value={formData.scheduled_date || ''}
          onChange={(e) => updateField('scheduled_date', e.target.value)}
        />
      </div>

      <div>
        <label>Hora</label>
        <input
          type="time"
          value={formData.scheduled_time || ''}
          onChange={(e) => updateField('scheduled_time', e.target.value)}
        />
      </div>

      <button 
        type="submit" 
        disabled={isSubmitting}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        {isSubmitting ? 'Salvando...' : 'Criar Agendamento'}
      </button>
    </form>
  );
}
```

## 4. Status Badge with Color Mapping

```typescript
// components/AppointmentStatusDisplay.tsx
import { STATUS_COLOR_MAP, STATUS_LABEL_MAP, getStatusConfig } from '@/modules/agenda/constants';
import type { AppointmentStatus } from '@/modules/agenda/types';

export function AppointmentStatusDisplay({ status }: { status: AppointmentStatus }) {
  const config = getStatusConfig(status);
  const label = STATUS_LABEL_MAP[status] || 'Desconhecido';
  const colors = STATUS_COLOR_MAP[status];

  return (
    <span className={`inline-block px-3 py-1 rounded-full ${colors}`}>
      <span className="mr-1">{config.icon}</span>
      {label}
    </span>
  );
}
```

## 5. Memoized Appointment Card

```typescript
// components/OptimizedAppointmentCard.tsx
import React, { useCallback, memo } from 'react';
import type { Appointment } from '@/modules/agenda/types';

interface Props {
  appointment: Appointment;
  onClick?: (apt: Appointment) => void;
  onStatusChange?: (status: string) => void;
}

// Custom comparison to prevent unnecessary re-renders
const AppointmentCardMemo = memo<Props>(
  ({ appointment, onClick, onStatusChange }) => {
    const handleClick = useCallback(() => {
      onClick?.(appointment);
    }, [appointment, onClick]);

    const handleStatusChange = useCallback((status: string) => {
      onStatusChange?.(status);
    }, [onStatusChange]);

    return (
      <div
        onClick={handleClick}
        className="p-4 border rounded cursor-pointer hover:bg-gray-50"
      >
        <div className="flex justify-between">
          <div>
            <h3 className="font-semibold">{appointment.patient?.name}</h3>
            <p className="text-sm text-gray-600">
              {appointment.scheduled_date} {appointment.scheduled_time}
            </p>
          </div>
          <select
            value={appointment.booking_status}
            onChange={(e) => handleStatusChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="scheduled">Agendado</option>
            <option value="confirmed">Confirmado</option>
            <option value="at_reception">Na Recepção</option>
            <option value="attended">Atendido</option>
            <option value="canceled">Cancelado</option>
          </select>
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Return true if props are equal (don't re-render)
    return (
      prevProps.appointment.id === nextProps.appointment.id &&
      prevProps.appointment.booking_status === nextProps.appointment.booking_status &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.onStatusChange === nextProps.onStatusChange
    );
  }
);

AppointmentCardMemo.displayName = 'AppointmentCard';
export default AppointmentCardMemo;
```

## 6. Type-Safe Query

```typescript
// services/queries.ts
import { listAppointments } from '@/modules/agenda/services';
import type { Appointment, PaginatedResult } from '@/modules/agenda/types';

export async function getClinicAppointments(
  clinicId: string,
  dateRange: { start: string; end: string }
): Promise<PaginatedResult<Appointment>> {
  return listAppointments({
    clinicId,
    start: dateRange.start,
    end: dateRange.end,
    limit: 50,
    offset: 0,
  });
}

// Usage with type safety
const result = await getClinicAppointments('clinic-123', {
  start: '2025-05-10',
  end: '2025-05-17',
});

result.data.forEach((apt) => {
  // All properties are type-safe
  console.log(apt.id, apt.patient?.name, apt.booking_status);
});
```

## 7. Lazy Loading Modal

```typescript
// components/AppointmentModalLazy.tsx
import { lazy, Suspense } from 'react';

const AppointmentUnitedModal = lazy(() =>
  import('@/modules/agenda/components').then((m) => ({
    default: m.AppointmentUnitedModal,
  }))
);

export function AppointmentModalContainer({ appointmentId }: { appointmentId: string }) {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <AppointmentUnitedModal appointmentId={appointmentId} />
    </Suspense>
  );
}
```

## 8. Integration with Routes

```typescript
// pages/AppRoutes.jsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';

// Lazy load agenda modules
const AgendaPage = lazy(() => import('@/modules/agenda/pages/AgendaPage'));
const AgendaFinanceiro = lazy(() => import('@/modules/agenda/pages/AgendaFinanceiro'));

const LoadingSpinner = () => <div className="p-8">Carregando...</div>;

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/clinica/agenda"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <AgendaPage />
            </Suspense>
          }
        />
        <Route
          path="/clinica/agenda/financeiro"
          element={
            <Suspense fallback={<LoadingSpinner />}>
              <AgendaFinanceiro />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
```

---

**Last Updated**: 2026-05-10
**Architecture Version**: 3.0.0 (Enterprise Modular)
