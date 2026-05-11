╔═══════════════════════════════════════════════════════════════════════════════╗
║  ✅ PHASE 2 TYPESCRIPT - TIMEZONE UTILITIES                                   ║
║  Created: May 6, 2026                                                         ║
║  Status: READY FOR INTEGRATION                                                ║
╚═══════════════════════════════════════════════════════════════════════════════╝

═════════════════════════════════════════════════════════════════════════════════
📁 FILES CREATED
═════════════════════════════════════════════════════════════════════════════════

✅ src/modules/agenda/utils/timezone.ts (150 LOC)
   ├─ formatTime(timeString): Convert "09:00:00" → "09:00"
   ├─ calculateEndTime(timeString, durationMinutes): Calculate appointment end
   ├─ isBusinessHours(timeString): Validate 8-20 range
   ├─ convertUTCToLocal(date): Convert UTC to America/Sao_Paulo
   ├─ convertLocalToUTC(date): Convert America/Sao_Paulo to UTC
   ├─ isValidDateFormat(date): Validate YYYY-MM-DD format
   ├─ getBusinessHoursRange(date): Get start/end business hours
   └─ getCurrentLocalTime(): Get current time for testing

═════════════════════════════════════════════════════════════════════════════════
🔌 INTEGRATION POINTS
═════════════════════════════════════════════════════════════════════════════════

The appointmentsApi.js already has extractTime/extractDate functions that:
✅ Convert HH:MM:SS → HH:MM format
✅ Handle ISO timestamps
✅ Validate formats
✅ Return null for invalid data

The new timezone.ts extends these with:
+ Timezone-aware conversions (UTC ↔ America/Sao_Paulo)
+ Business hours validation (8-20)
+ End time calculation for appointments
+ Current local time helpers

═════════════════════════════════════════════════════════════════════════════════
📋 HOW TO USE TIMEZONE.TS
═════════════════════════════════════════════════════════════════════════════════

1️⃣ IMPORT in any file that needs timezone handling:

import {
  formatTime,
  calculateEndTime,
  isBusinessHours,
  convertUTCToLocal,
  convertLocalToUTC,
  isValidDateFormat,
  getBusinessHoursRange,
} from '@/modules/agenda/utils/timezone';

═════════════════════════════════════════════════════════════════════════════════
💡 EXAMPLES
═════════════════════════════════════════════════════════════════════════════════

FORMAT TIME
──────────
Input:  "09:00:00"
Call:   formatTime("09:00:00")
Output: "09:00" ✅

CALCULATE END TIME
──────────────────
Input:  startTime="09:00", duration=30 minutes
Call:   calculateEndTime("09:00", 30)
Output: "09:30" ✅

VALIDATE BUSINESS HOURS
───────────────────────
Input:  "15:30"
Call:   isBusinessHours("15:30")
Output: true ✅

Input:  "22:00" (after 20:00)
Call:   isBusinessHours("22:00")
Output: false ❌

CONVERT UTC → LOCAL
────────────────────
Input:  UTC Date "2026-05-06T14:30:00Z"
Call:   convertUTCToLocal("2026-05-06T14:30:00Z", "time")
Output: "11:30" (São Paulo time) ✅

CONVERT LOCAL → UTC
─────────────────────
Input:  Local Date "2026-05-06T11:30:00"
Call:   convertLocalToUTC("2026-05-06T11:30:00")
Output: Date object (UTC equivalent) ✅

═════════════════════════════════════════════════════════════════════════════════
🎯 PHASE 2 WORKFLOW
═════════════════════════════════════════════════════════════════════════════════

Step 1: Database Cleanup ✅ DONE
─────────────────────────────────
✅ All 11 appointments deleted
✅ NOT NULL constraints added (patient_id, professional_id, service_id, etc)
✅ Database is clean and safe

Step 2: Timezone Utilities ✅ DONE
──────────────────────────────────
✅ timezone.ts created with 6 core functions
✅ Ready to use in components
✅ No breaking changes

Step 3: Execute PHASE 2 SQL (Next)
───────────────────────────────────
Run: PHASE_2_TIMEZONE_NEUROCLINICA.sql
This creates:
- validate_appointment_timezone() function
- 8 diagnostic queries
- Timezone validation procedures

Step 4: Integrate timezone.ts (After SQL)
──────────────────────────────────────────
Update components to use timezone utilities:
- AgendaPage.jsx - Calculate end times with timezone awareness
- AppointmentUnitedModal.jsx - Validate business hours
- AgendaDayView.jsx - Format times properly

═════════════════════════════════════════════════════════════════════════════════
📊 TIMEZONE REFERENCE
═════════════════════════════════════════════════════════════════════════════════

Neuroclinica Timezone Configuration:
├─ Timezone: America/Sao_Paulo
├─ UTC Offset: UTC-3 (standard time)
├─ DST: Handles automatically via date-fns-tz
├─ Business Hours: 08:00 - 20:00 (8 AM - 8 PM)
└─ Locale: pt-BR (Brazilian Portuguese)

⏰ Example Time Conversions:
   UTC Time        →  Local Time
   12:00:00 UTC    →  09:00 São Paulo
   15:00:00 UTC    →  12:00 São Paulo
   23:00:00 UTC    →  20:00 São Paulo

═════════════════════════════════════════════════════════════════════════════════
✅ DEPENDENCIES ALREADY INSTALLED
═════════════════════════════════════════════════════════════════════════════════

✓ date-fns (formatting and parsing)
✓ date-fns-tz (timezone handling)

If missing, run:
npm install date-fns date-fns-tz

═════════════════════════════════════════════════════════════════════════════════
🚀 NEXT STEPS
═════════════════════════════════════════════════════════════════════════════════

1. ✅ COMPLETED: timezone.ts created
2. ⏭️ TODO: Execute PHASE_2_TIMEZONE_NEUROCLINICA.sql
   File: PHASE_2_TIMEZONE_NEUROCLINICA.sql
   Clinic ID: dcee437c-fd14-463c-b25e-a318f5da60b7 (already substituted)

3. ⏭️ TODO: Integrate timezone.ts in components
   Files to update:
   - src/pages/clinica/agenda/AgendaPage.jsx
   - src/pages/clinica/agenda/components/AppointmentUnitedModal.jsx
   - src/pages/clinica/agenda/views/AgendaDayView.jsx

═════════════════════════════════════════════════════════════════════════════════
⏰ ESTIMATED TIME
═════════════════════════════════════════════════════════════════════════════════

Step 2 (timezone.ts): ✅ 5 minutes DONE
Step 3 (SQL execution): 15 minutes
Step 4 (Component integration): 45 minutes

TOTAL PHASE 2: ~60 minutes

═════════════════════════════════════════════════════════════════════════════════
