# TypeScript Migration Guide

## 📋 Overview

This document provides a roadmap for gradually migrating the Gesclinic Web project from JavaScript to TypeScript.

## 🎯 Benefits of TypeScript

- **Type Safety**: Catch errors at compile-time instead of runtime
- **Better IDE Support**: Improved autocomplete and refactoring
- **Self-Documenting Code**: Types serve as inline documentation
- **Reduced Bugs**: 15-38% fewer production bugs (studies show)
- **Better Refactoring**: Confident large-scale code changes

## 📊 Current Status

- ✅ `tsconfig.json` created and configured
- ✅ `tsconfig.node.json` for build tools configured
- ✅ `.eslintrc.json` updated with TypeScript-ready config
- ⏳ Project ready for incremental migration

## 🚀 Migration Strategy

### **Phase 1: Foundation (Week 1)**
```bash
# Install TypeScript and related packages
npm install --save-dev typescript
npm install --save-dev @types/react @types/react-dom
npm install --save-dev @types/node

# Rename main config files to .ts
mv vite.config.js vite.config.ts
```

### **Phase 2: Core Services (Week 2-3)**

Priority order for conversion:
1. **Service Layer** (`src/services/**/*.js` → `*.ts`)
   - `supabaseClient.js` → `supabaseClient.ts`
   - `auth.js` → `auth.ts`
   - `baseService.js` → `baseService.ts`
   - All `*Api.js` files → `*Api.ts`

2. **Utilities** (`src/utils/**/*.js` → `*.ts`)
   - Formatters
   - Validators
   - Helpers

3. **Guards** (`src/guards/**/*.js` → `*.ts`)
   - `authGuard.js` → `authGuard.ts`

### **Phase 3: Components (Week 4-6)**

1. **Start with simplest components**
   - Stateless functional components first
   - No complex prop structures

2. **Work up to complex components**
   - Components with state management
   - Custom hooks

3. **Type definitions** (`src/types/`)
   - Create `index.ts` with all type definitions
   - Example: `Patient.ts`, `Appointment.ts`, `FinancialRecord.ts`

### **Phase 4: Pages (Week 7-8)**

1. Convert pages following feature areas:
   - Agenda pages
   - Financeiro pages
   - Estoque pages
   - Configurações pages

### **Phase 5: Context & Hooks (Week 9)**

1. Convert context providers:
   - `AuthContext.tsx`
   - `ClinicContext.tsx`

2. Convert custom hooks

## 📝 Type Definitions Template

Create `src/types/index.ts`:

```typescript
// User & Auth
export interface User {
  id: string;
  email: string;
  user_metadata: {
    clinic_id: string;
    role: 'admin' | 'manager' | 'professional' | 'staff';
    full_name: string;
  };
  aud: string;
  iss: string;
  sub: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Clinic
export interface Clinic {
  id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  brand_name?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// Appointment
export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  professional_id: string;
  room_id: string;
  start_time: string; // ISO 8601
  end_time: string; // ISO 8601
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Financial
export interface FinancialRecord {
  id: string;
  clinic_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  status: 'open' | 'paid' | 'cancelled' | 'partial';
  due_date: string;
  payment_date?: string;
  created_at: string;
  updated_at: string;
}

// API Response
export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

## 🔧 Component Migration Example

### Before (JavaScript)
```javascript
// src/components/UserProfile.jsx
import React, { useState } from 'react';
import { updateUser } from '@/services/userService';

export const UserProfile = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleUpdate = async (userData) => {
    setLoading(true);
    try {
      const result = await updateUser(userData);
      onUpdate(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {/* JSX */}
    </div>
  );
};
```

### After (TypeScript)
```typescript
// src/components/UserProfile.tsx
import React, { useState, FC } from 'react';
import { updateUser } from '@/services/userService';
import { User, ApiError } from '@/types';

interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

export const UserProfile: FC<UserProfileProps> = ({ user, onUpdate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (userData: Partial<User>): Promise<void> => {
    setLoading(true);
    try {
      const result = await updateUser(userData);
      onUpdate(result);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="error">{error}</p>}
      {/* JSX */}
    </div>
  );
};
```

## 🎓 Best Practices

### 1. **Use Discriminated Unions for State**
```typescript
type LoadingState = { status: 'loading' };
type SuccessState = { status: 'success'; data: User };
type ErrorState = { status: 'error'; error: ApiError };

type UserState = LoadingState | SuccessState | ErrorState;
```

### 2. **Create Utility Types**
```typescript
// Reusable types for common patterns
export type Async<T> = {
  loading: boolean;
  data: T | null;
  error: Error | null;
};

export type AsyncRequest<T> = Promise<{ data: T | null; error: Error | null }>;
```

### 3. **Use React Hooks with TypeScript**
```typescript
export const useAuth = (): [User | null, (user: User | null) => void] => {
  const [user, setUser] = useState<User | null>(null);
  return [user, setUser];
};
```

### 4. **API Service Types**
```typescript
// src/services/api/baseService.ts
export class BaseService {
  async queryTableByClinic<T>(
    table: string,
    clinicId: string,
    filters?: Record<string, any>
  ): Promise<T[]> {
    // Implementation
  }
}
```

## 📦 Gradual Adoption Checklist

- [ ] Phase 1: TypeScript foundation setup
- [ ] Phase 2: Services layer converted
- [ ] Phase 3: Utilities converted
- [ ] Phase 4: Utility types created
- [ ] Phase 5: Components converted (start simple)
- [ ] Phase 6: Pages converted
- [ ] Phase 7: Context & hooks converted
- [ ] Phase 8: Testing with TypeScript
- [ ] Phase 9: Documentation updated
- [ ] Phase 10: Full migration complete

## 🚨 Troubleshooting

### Error: "Cannot find module '@types/...'
```bash
npm install --save-dev @types/package-name
```

### JSX not recognized
Ensure `jsx: 'react-jsx'` in tsconfig.json and React 17+ is installed.

### Type any propagation
Use `noImplicitAny: true` in tsconfig to enforce types everywhere.

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React with TypeScript](https://react-typescript-cheatsheet.netlify.app/)
- [Vite TypeScript Support](https://vitejs.dev/guide/features.html#typescript)
- [Supabase TypeScript Client](https://supabase.com/docs/reference/javascript/introduction)

## 🎯 Success Criteria

- ✅ All source files have `.ts` or `.tsx` extension
- ✅ `strict` mode enabled in tsconfig
- ✅ No `any` types except in well-documented exceptions
- ✅ Build completes without TypeScript errors
- ✅ All tests pass with TypeScript
- ✅ Developers understand the codebase better
