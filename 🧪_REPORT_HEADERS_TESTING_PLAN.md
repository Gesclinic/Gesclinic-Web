# 🧪 Report Headers Integration - Testing Plan

## Quick Test Checklist (5-10 minutes)

### 1. Verify Build Status ✅
```bash
npm run build
# Should show: ✓ built in 23.39s (zero errors)
```

### 2. Start Dev Server
```bash
npm run dev
# Should show: ✓ built in XXXms on port 3000
```

### 3. Test Each Report PDF Export

#### Test Case 1: Cash Management Dashboard (Caixa Gerencial)
- [ ] Navigate to `/clinica/financeiro`
- [ ] Click on "Caixa Gerencial" 
- [ ] Click "📥 Exportar para PDF" button
- [ ] Verify PDF shows:
  - Logo or building icon in top-left
  - Clinic name next to logo
  - Date/time in top-right
  - Report content below header (not overlapping)

#### Test Case 2: Doctor Repass Reports
- [ ] Navigate to `/clinica/financeiro`
- [ ] Click on "Repasses Médicos"
- [ ] Click "📥 Exportar PDF" button
- [ ] Verify PDF shows:
  - Header with logo/building icon
  - Clinic name and CNPJ
  - Report table properly positioned
  - No overlapping with header

#### Test Case 3: Operator Cash Reports
- [ ] Navigate to `/clinica/financeiro`
- [ ] Click on "Caixa do Operador"
- [ ] Click "Exportar PDF" button
- [ ] Verify PDF shows:
  - Header with clinic branding
  - Summary section positioned correctly
  - Movement table below header
  - Proper formatting/spacing

#### Test Case 4: Generic Financial Report Export
- [ ] Navigate to `/clinica/financeiro`
- [ ] On any report section, use "RelatoriosToolbar"
- [ ] Click PDF export icon
- [ ] Verify PDF shows header with logo and clinic name

## Expected Results

### Header Should Display:
```
┌─────────────────────────────────────┐
│ [Logo]  CLINIC NAME          Date   │
│         CNPJ: XX.XXX.XXX/...  Time  │
└─────────────────────────────────────┘

Report Title and Content Below...
```

### Logo Behavior:
- **If clinic has logo_url**: Logo image displays (40x40)
- **If logo_url is NULL**: Building icon displays
- **If logo load fails**: Building icon displays (with console warning)

## Browser Testing Environment

### Required:
- [ ] Logged in with valid clinic account
- [ ] Clinic has logo_url set in database (or test fallback with NULL)
- [ ] Supabase connection working
- [ ] JavaScript console open to catch any errors

### Browser DevTools Checks:
- [ ] Console: No red errors
- [ ] Network: Logo image loads (or 404 is acceptable - triggers fallback)
- [ ] No warnings about missing props
- [ ] No async/await issues

## Regression Tests

Make sure existing functionality still works:

- [ ] Reports still export to Excel ✓
- [ ] Reports still export to CSV ✓  
- [ ] Print functionality still works ✓
- [ ] Report filters still apply ✓
- [ ] Data in reports is correct ✓

## Common Issues & Solutions

### Issue: Logo doesn't appear, no building icon
**Solution**: Check if clinic object is null or clinic.logo_url is undefined
- Verify useClinicContext is working
- Check clinic data loads in ClinicContext

### Issue: PDF shows but content overlaps header
**Solution**: Check startY calculation
- Verify `startY = await addClinicHeaderToPDF(doc, clinic)` returns correct value
- Should return ~30-35 pixels for header

### Issue: Logo image 404 in network tab but no fallback
**Solution**: Check error handler in Header.jsx
- Logo should show building icon on error
- Check onError handler is attached to img tag

### Issue: Build fails with import errors
**Solution**: Verify imports in all modified files
```javascript
import { addClinicHeaderToPDF } from '@/lib/reportHeaderUtils';
import { useClinicContext } from '@/contexts/ClinicContext';
```

## Success Criteria

✅ **PASS if:**
- All 4 report PDFs export without errors
- Logo or building icon appears in each PDF header
- Clinic name displays next to logo
- Report content doesn't overlap header
- Build passes with zero errors
- No console errors during export

❌ **FAIL if:**
- Any PDF export crashes
- Logo not visible (no fallback icon either)
- Content overlaps with header
- Build has compilation errors
- Console shows JavaScript errors

## Performance Metrics

Track during testing:
- [ ] PDF export time: < 3 seconds
- [ ] No memory leaks (console check)
- [ ] Responsive UI during export (no freezing)

## After Testing

If all checks pass:
1. ✅ Report integration is complete
2. ✅ Ready for production deployment
3. ✅ Consider removing test files from workspace

If any issues found:
1. Document the issue
2. Check error in browser console
3. Review the modified file for that report
4. Fix and rebuild

---

**Estimated Time**: 5-10 minutes
**Difficulty**: Low (mostly visual verification)
**Risk**: Very Low (all changes are additive, no breaking changes)
