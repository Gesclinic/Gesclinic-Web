# 🔄 FLUXO COMPLETO: auth.uid() + Auditoria + Sessão

## 📊 DIAGRAMA DO FLUXO

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Modal: NovoAgendamento.jsx / AgendamentoEditarModal.jsx   │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Form State (camelCase EN):                           │  │ │
│  │  │  - date, startTime, endTime                          │  │ │
│  │  │  - patientId, professionalId, serviceId             │  │ │
│  │  │  - payerId, roomId, status, notes                   │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └──────────────────────┬───────────────────────────────────────┘ │
└─────────────────────────┼──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              HOOK: useAgendamentoMutation.js                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1️⃣  Validar: user?.id !== null (autenticado?)            │ │
│  │  ✅ Se não estiver autenticado: ERRO                       │ │
│  │                                                             │ │
│  │  2️⃣  normalizePayload(form, clinic)                        │ │
│  │  ✅ Converte PT-BR alternativas para EN canonical         │ │
│  │                                                             │ │
│  │  3️⃣  validateCreatePayload(payload)                        │ │
│  │  ✅ Valida obrigatórios                                    │ │
│  │                                                             │ │
│  │  4️⃣  criarAgendamento(payload)                             │ │
│  │  ✅ Chama service API                                      │ │
│  │                                                             │ │
│  │  5️⃣  Debug: console.log("📝 [CRIAR] Como usuário: ...")   │ │
│  │  ✅ Mostra no console quem está fazendo                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│         SERVICE API: agenda.api.mutations.js                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  criarAgendamento(payload):                                │ │
│  │  - Desestrutura com nomes EN:                              │ │
│  │    clinicId, date, startTime, patientId, etc             │ │
│  │  - Mapeia para snake_case:                                 │ │
│  │    clinic_id, scheduled_date, scheduled_time, patient_id  │ │
│  │  - INSERT na tabela appointments                           │ │
│  │  - Retorna dados criados                                   │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│         CLIENT SUPABASE: createBrowserClient                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Configuração:                                              │ │
│  │  ✅ persistSession: true                                    │ │
│  │  ✅ autoRefreshToken: true                                  │ │
│  │  ✅ detectSessionInUrl: true                                │ │
│  │  ✅ storageKey: "gesclinic-auth-token"                      │ │
│  │  ✅ flowType: "pkce"                                        │ │
│  │                                                             │ │
│  │  Resultado:                                                 │ │
│  │  ✅ localStorage["gesclinic-auth-token"] salvo              │ │
│  │  ✅ Token enviado em headers automaticamente                │ │
│  │  ✅ auth.uid() disponível no banco                         │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              SUPABASE (Backend)                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Headers recebidos:                                        │ │
│  │  - Authorization: Bearer {access_token}                   │ │
│  │  - x-client-info: gesclinic-web@1.0.0                    │ │
│  │                                                             │ │
│  │  ✅ Supabase extrai user_id do token                      │ │
│  │  ✅ auth.uid() agora retorna user_id                      │ │
│  │  ✅ RLS policies validam clinic_id                        │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│           Tabela: appointments                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  INSERT VALUES (                                            │ │
│  │    clinic_id = 'uuid-1234',                                │ │
│  │    scheduled_date = '2026-04-23',                          │ │
│  │    scheduled_time = '14:30:00',                            │ │
│  │    patient_id = 'uuid-5678',                               │ │
│  │    ...                                                      │ │
│  │  )                                                           │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  🔔 TRIGGER: appointment_audit_insert_trigger DISPARADO       │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│         TRIGGER: audit_appointment_insert()                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1️⃣  current_user_id := auth.uid()                         │ │
│  │  ✅ Obtém ID do usuário autenticado                        │ │
│  │                                                             │ │
│  │  2️⃣  SELECT role FROM users WHERE id = current_user_id    │ │
│  │  ✅ Obtém role do usuário                                  │ │
│  │                                                             │ │
│  │  3️⃣  INSERT INTO appointment_audit_logs (                  │ │
│  │       appointment_id = NEW.id,                             │ │
│  │       performed_by = current_user_id,  ✅ PREENCHIDO       │ │
│  │       performed_by_role = role,         ✅ PREENCHIDO       │ │
│  │       action = 'create',                ✅ PREENCHIDO       │ │
│  │       changes = to_jsonb(NEW)                              │ │
│  │     )                                                       │ │
│  └──────────────────────────────────────────────────────────┘ │
└─────────────────────────┬──────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│    Tabela: appointment_audit_logs (AUDITORIA COMPLETA)         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  {                                                          │ │
│  │    "id": "uuid-audit-123",                                 │ │
│  │    "appointment_id": "uuid-1234",                          │ │
│  │    "performed_by": "uuid-user-999",  ✅ NÃO NULL          │ │
│  │    "performed_by_role": "admin",     ✅ PREENCHIDO         │ │
│  │    "action": "create",                                     │ │
│  │    "changes": { ...full appointment data... },            │ │
│  │    "created_at": "2026-04-23T14:32:00Z"                   │ │
│  │  }                                                          │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ✅ AUDITORIA COMPLETA                                         │ │
│  ✅ USUÁRIO IDENTIFICADO                                       │ │
│  ✅ RASTREABILIDADE TOTAL                                      │ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 SEGURANÇA EM CADA CAMADA

| Camada | Segurança | Status |
|--------|-----------|--------|
| Frontend | Validação de form | ✅ HTML5 + custom |
| Hook | Validação de auth | ✅ user?.id check |
| Service | Desestrutura segura | ✅ Sem injeção SQL |
| Client | Sessão persistida | ✅ createBrowserClient |
| Supabase | RLS policies | ✅ clinic_id validation |
| RLS | auth.uid() validation | ✅ Por clinic |
| Audit | auth.uid() automático | ✅ Triggers |
| Compliance | Rastreabilidade | ✅ Quem/Quando/O quê |

---

## 📱 SESSÃO PERSISTIDA

```
┌─────────────────────────────────────────────────────────────────┐
│  localStorage                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  gesclinic-auth-token = {                                  │ │
│  │    "user": {                                                │ │
│  │      "id": "uuid-user-999",                                │ │
│  │      "email": "usuario@clinic.com"                         │ │
│  │    },                                                       │ │
│  │    "access_token": "eyJ...",                               │ │
│  │    "refresh_token": "sbv...",                              │ │
│  │    "expires_in": 3600                                      │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ✅ Persiste entre reloads                                      │
│  ✅ Auto-renewal de token expirado                             │
│  ✅ Enviado em todas as requisições                            │
│  ✅ Seguro (HTTPS + HttpOnly na produção)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧪 VERIFICAÇÃO PASSO A PASSO

### 1️⃣ Usuário Faz Login
```
Usuário: usuario@clinic.com → Supbase.auth.signInWithPassword()
↓
Supabase retorna: { user, access_token, refresh_token }
↓
localStorage["gesclinic-auth-token"] = { user, access_token, ... }
↓
SupabaseAuthContext marca como autenticado
↓
useAuth() retorna { user, clinicId, currentRole }
```

---

### 2️⃣ Usuário Cria Agendamento
```
Modal preenchido → handleSubmit()
↓
await createMutation.mutateAsync(form)
↓
Hook valida: if (!user?.id) throw Error ✅
↓
normalizePayload(form, clinic)
↓
criarAgendamento(payload)
↓
supabase.from('appointments').insert([...])
↓
Headers: Authorization: Bearer {access_token} ✅
↓
Supabase extrai user_id do token
↓
auth.uid() = user_id ✅
```

---

### 3️⃣ Trigger de Auditoria Dispara
```
INSERT completado em appointments
↓
appointment_audit_insert_trigger DISPARA
↓
current_user_id := auth.uid() = "uuid-user-999" ✅
↓
SELECT role FROM users WHERE id = current_user_id
↓
INSERT INTO appointment_audit_logs:
   performed_by = "uuid-user-999" ✅
   performed_by_role = "admin" ✅
   action = "create" ✅
↓
AUDITORIA REGISTRADA ✅
```

---

### 4️⃣ Verificação no Console
```javascript
// Frontend
console.log("👤 [AUTH] Usuário logado:", { id: "uuid-user-999", email: "usuario@clinic.com" });

// SQL
SELECT performed_by, performed_by_role FROM appointment_audit_logs LIMIT 1;
// Resultado: uuid-user-999 | admin ✅
```

---

## ✅ RESULTADO ESPERADO

```
Frontend:
✅ Login funciona
✅ Usuário aparece nos logs
✅ Operações enviadas corretamente

Backend:
✅ auth.uid() não é NULL
✅ performed_by preenchido
✅ Triggers funcionam
✅ Auditoria completa

Compliance:
✅ Rastreabilidade
✅ LGPD compliant
✅ Pronto para produção
```

---

## 🚀 PRÓXIMAS AÇÕES

1. ✅ Frontend refatorado (CONCLUÍDO)
2. ⏳ Executar SQL triggers no Supabase
3. ⏳ Fazer login real e testar
4. ⏳ Verificar auditoria no banco
5. ⏳ Deploy para produção

Vá para: `⚡_EXECUTAR_TRIGGERS_SUPABASE.md` para próximas etapas

