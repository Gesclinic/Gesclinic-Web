# 🐛 Supabase Staging Connection Issue - Debug Report

## 📋 Problem Summary

Staging deployment connects to Supabase but receives `ERR_CONNECTION_CLOSED` when trying to fetch data. Production works perfectly with the same credentials.

---

## 🔍 Environment Details

### Production (Working ✅)
```
URL: https://gesclinic-web.vercel.app
Branch: main/master
Environment: Production
Status: ✅ FULLY OPERATIONAL
```

### Staging (Not Working ❌)
```
URL: https://develop.gesclinic.vercel.app
Branch: develop
Environment: Preview
Status: ❌ ERR_CONNECTION_CLOSED
```

---

## 🔑 Supabase Configuration

### Project Details
```
Project URL: https://gvdkdjyupktlflwurike.supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZGtkanl1cGt0bGZsd3VyaWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyMjUyMTEsImV4cCI6MjA4MzgwMTIxMX0.lpPjHUO_prS1-l8wLv7vdN7jtzrY0Oy71X_1ozXiErA
```

### Redirect URLs Configured ✅
```
✅ https://gesclinic-web.vercel.app
✅ https://gesclinic-web.vercel.app/**
✅ https://develop.gesclinic.vercel.app
✅ https://develop.gesclinic.vercel.app/**
```

### Environment Variables
```
Vercel (Preview Environment):
  VITE_SUPABASE_URL = https://gvdkdjyupktlflwurike.supabase.co
  VITE_SUPABASE_ANON_KEY = [configured]
  Both set to: Production AND Preview environments
```

---

## 🧪 What Was Tested

### ✅ Working
- Production deployment (main branch) - 100% functional
- Local development (`npm run dev`) - 100% functional
- Build process - passes successfully
- GitHub Actions CI/CD - deploys without errors
- Vercel deployment - completes successfully
- Environment variables - correctly injected

### ❌ Not Working
- Staging environment Supabase connection
- Data fetch from any table (clinics, appointments, etc.)
- Authentication initialization
- Browser console shows: `ERR_CONNECTION_CLOSED`

---

## 🌐 Network/CORS Status

### Checked
```
✅ Redirect URLs added to Supabase Auth
✅ Domain whitelisting attempted
✅ Environment variables present
✅ Vercel deployment successful
✅ No build errors
```

### Error Details
```
Error: develop.gesclinic.vercel.app encerrou a conexão inesperadamente
Message: ERR_CONNECTION_CLOSED
Cause: Unknown - appears to be connection termination from server
```

---

## 📊 Comparison

| Aspect | Production | Staging |
|--------|-----------|---------|
| Deploy | ✅ Works | ✅ Works |
| Vercel | ✅ Works | ✅ Works |
| Build | ✅ Passes | ✅ Passes |
| Environment | ✅ Injected | ✅ Injected |
| Supabase Connect | ✅ Works | ❌ Fails |
| Data Fetch | ✅ Works | ❌ Fails |

---

## 🚀 Steps to Reproduce

1. Deploy `develop` branch to Vercel (staging)
2. Configure Supabase redirect URLs with `develop.gesclinic.vercel.app`
3. Set environment variables in Vercel (Preview)
4. Visit `https://develop.gesclinic.vercel.app`
5. Observe: Page loads, but shows connection error

---

## 💡 Possible Causes

1. **RLS Policies** - May require authentication for anon user
2. **Domain Validation** - Redirect URL not matching exactly
3. **Vercel Preview Environment** - Different handling of env vars
4. **Supabase Auth Issue** - Token validation for staging domain
5. **Network/CORS** - Staging domain being blocked

---

## 📝 Questions for Support

1. Are there any specific RLS policies blocking anon user connections to preview domains?
2. Do Supabase Redirect URLs need exact domain match or can they use wildcards differently?
3. Is there a difference in how Supabase handles production vs preview/staging domains?
4. Are there any rate limits or access policies specific to preview environments?
5. Should we configure a separate Supabase project for staging?

---

## 📞 Contact Info

**When contacting Supabase Support:**
- Mention: Staging/Preview domain connection issue with anon user
- Reference: Production works with same config, only staging fails
- Provide: Project URL and redirect URLs configured
- Include: This debug report

---

**Generated:** May 9, 2026
**Status:** Awaiting Supabase Support Response
