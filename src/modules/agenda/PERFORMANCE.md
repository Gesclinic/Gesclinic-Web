/**
 * PERFORMANCE GUIDE - Agenda Module
 * =================================
 * 
 * This guide covers performance optimizations for the Agenda module.
 * Key areas: memoization, lazy loading, query optimization, re-render prevention.
 */

# Agenda Module Performance Guide

## 1. Component Memoization Strategy

### Pattern: React.memo for Props-Based Components

```typescript
// ❌ BEFORE: No memoization
export function AppointmentCard({ appointment, onClick }) {
  return <div onClick={onClick}>{appointment.id}</div>;
}

// ✅ AFTER: With memo and proper comparison
const AppointmentCard = React.memo(
  ({ appointment, onClick }) => (
    <div onClick={onClick}>{appointment.id}</div>
  ),
  (prevProps, nextProps) => {
    // Custom comparison logic
    return (
      prevProps.appointment.id === nextProps.appointment.id &&
      prevProps.onClick === nextProps.onClick
    );
  }
);

export default AppointmentCard;
```

### Pattern: useMemo for Expensive Computations

```typescript
// ❌ BEFORE: Recalculates on every render
function AgendaGrid({ appointments, viewMode }) {
  const grouped = appointments.reduce((acc, apt) => {
    // Group logic
  }, {});
  
  return <Grid data={grouped} />;
}

// ✅ AFTER: Memoize computed data
function AgendaGrid({ appointments, viewMode }) {
  const grouped = useMemo(() => 
    appointments.reduce((acc, apt) => {
      // Group logic
    }, {}),
    [appointments, viewMode]
  );
  
  return <Grid data={grouped} />;
}
```

## 2. Lazy Loading Strategy

### Code Splitting by Route

```typescript
// pages/AppRoutes.jsx
import { lazy, Suspense } from 'react';

const AgendaPage = lazy(() => import('@/modules/agenda/pages/AgendaPage'));
const AgendaFinancial = lazy(() => import('@/modules/agenda/pages/AgendaFinancial'));

export function Routes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Route path="/clinica/agenda" element={<AgendaPage />} />
      <Route path="/clinica/agenda/financeiro" element={<AgendaFinancial />} />
    </Suspense>
  );
}
```

### Lazy Load Heavy Components

```typescript
// components/AppointmentModal.jsx
const AppointmentUnitedModal = lazy(() =>
  import('./modals/AppointmentUnitedModal').then(m => ({
    default: m.AppointmentUnitedModal
  }))
);

export function useAppointmentModal() {
  return <Suspense fallback={null}><AppointmentUnitedModal /></Suspense>;
}
```

## 3. Query Optimization

### Pagination

```typescript
// ✅ Always paginate large result sets
const { data, hasMore } = await listAppointments({
  clinicId,
  limit: 50,        // Limit results
  offset: 0,        // Offset for pagination
  start: today,
  end: tomorrow,
});
```

### Selective Loading

```typescript
// ❌ Load too much
const appointments = await listAppointments({
  clinicId,
  // No filters - loads ALL appointments
});

// ✅ Load only what you need
const appointments = await listAppointments({
  clinicId,
  start: dateFrom,
  end: dateTo,
  professional_id: selectedProfessional,
  status: 'scheduled',
});
```

## 4. Re-render Prevention

### Context Splitting

```typescript
// ❌ BEFORE: Single large context causes all consumers to re-render
<AgendaProvider value={{ appointments, filters, viewMode, updateFilter, ... }}>
  <AppointmentCard /> {/* Re-renders whenever ANY value changes */}
</AgendaProvider>

// ✅ AFTER: Split into focused contexts
<AppointmentsProvider value={{ appointments, updateAppointment }}>
  <FiltersProvider value={{ filters, updateFilter }}>
    <ViewProvider value={{ viewMode, setViewMode }}>
      <AppointmentCard /> {/* Only re-renders when relevant values change */}
    </ViewProvider>
  </FiltersProvider>
</AppointmentsProvider>
```

### useCallback for Event Handlers

```typescript
// ❌ BEFORE: Creates new function on every render
function AgendaToolbar({ onFilter }) {
  return (
    <button onClick={() => onFilter({ status: 'confirmed' })}>
      Filter
    </button>
  );
}

// ✅ AFTER: Stable reference
function AgendaToolbar({ onFilter }) {
  const handleFilter = useCallback(() => {
    onFilter({ status: 'confirmed' });
  }, [onFilter]);

  return <button onClick={handleFilter}>Filter</button>;
}
```

## 5. Realtime Optimization

### Debounce Updates

```typescript
// services/agendaRealtime.service.ts
export const REALTIME_CONFIG = {
  DEBOUNCE_MS: 300,        // Batch updates within 300ms
  MAX_BATCH_SIZE: 50,      // Process up to 50 changes at once
  FLUSH_INTERVAL_MS: 5000, // Force flush every 5 seconds
};
```

### Selective Subscriptions

```typescript
// ✅ Only subscribe to relevant events
const unsubscribe = subscribeToAppointments(
  {
    clinicId,
    professional_id: selectedProfessional, // Only this professional
    start: today,
    end: tomorrow,
  },
  (event) => {
    updateAppointmentCache(event);
  }
);
```

## 6. State Management Patterns

### Normalized State

```typescript
// ✅ Store normalized data
const appointmentStore = {
  byId: {
    'apt-1': { id: 'apt-1', patient_id: 'p-1', ... },
    'apt-2': { id: 'apt-2', patient_id: 'p-2', ... },
  },
  allIds: ['apt-1', 'apt-2'],
};

// Easy to update
appointmentStore.byId['apt-1'].status = 'attended';

// Easy to access
const appointment = appointmentStore.byId['apt-1'];
```

## 7. Monitoring & Metrics

### Components to Monitor

```typescript
// Profile render times
import { ProfilerOnRender } from 'react';

<Profiler id="AgendaGrid" onRender={logRenderTime}>
  <AgendaGrid />
</Profiler>
```

### Key Metrics

- AppointmentCard render time: target < 16ms (60fps)
- AgendaGrid render time: target < 50ms
- Modal load time: target < 100ms
- Initial data load: target < 500ms

## 8. Checklist

- [ ] All list components use pagination
- [ ] Expensive computations use useMemo
- [ ] Event handlers use useCallback
- [ ] Heavy modals are lazy-loaded
- [ ] List items use React.memo
- [ ] Realtime updates are debounced
- [ ] Contexts are properly split
- [ ] Queries have selective filters
- [ ] Re-render counts are monitored
- [ ] Bundle size is tracked

## 9. Tools

- React DevTools Profiler: Built-in render profiling
- Chrome DevTools: Network and performance analysis
- Lighthouse: Core Web Vitals measurement
- Bundle Analyzer: Identify large modules

---

**Last Updated**: 2026-05-10
**Module Version**: 3.0.0 (Enterprise Modular)
