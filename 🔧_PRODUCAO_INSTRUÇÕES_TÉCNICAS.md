# 🔧 PRODUCTION DEPLOYMENT - TECHNICAL INSTRUCTIONS
## Agenda Enterprise v0.3.0 - DevOps Runbook

**For:** DevOps Engineer  
**Duration:** 45 minutes (11:15-12:00)  
**Objective:** Deploy v0.3.0 to production and achieve go-live

---

## 📋 PRE-DEPLOYMENT VERIFICATION

```
BEFORE YOU START:
[ ] Git: Latest commit is v0.3.0 (tag verified)
[ ] Artifacts: Build binaries prepared
[ ] Database: Backup completed
[ ] Monitoring: Dashboards open
[ ] Rollback: Script tested & ready
[ ] Team: All leads confirmed ready

IF ANY FAILS → STOP & ESCALATE
```

---

## 🚀 STEP 1: VERIFY BUILD (5 minutes)

### **1.1 Pull Latest Code**

```bash
# SSH to build server
ssh build@production-ci.gesclinic.com

# Navigate to project
cd /opt/gesclinic/web

# Verify we're on v0.3.0
git tag | grep v0.3.0
git checkout v0.3.0

# Status check
git log -1 --oneline
# Expected: "feat: merge agenda enterprise v0.3.0..."
```

### **1.2 Verify Build Artifacts**

```bash
# Check if build exists
ls -la dist/ | head -5

# Expected structure:
# -rw-r--r-- ... index.html
# -rw-r--r-- ... assets/main-*.js
# -rw-r--r-- ... assets/*.css
# -rw-r--r-- ... ...

# Verify build integrity
sha256sum dist/index.html
# Compare with: [staging-build-hash from Etapa 2]

# If different → STOP & investigate
```

### **1.3 Verify Dependencies**

```bash
# Check node_modules
du -sh node_modules/
# Expected: ~500-600 MB

# Verify package.json
cat package.json | grep -A 5 '"version"'
# Expected: "version": "0.3.0"

# Verify critical deps
npm list react react-dom vite
# All should be present & correct version
```

**Status:** [ ] ✅ BUILD VERIFIED

---

## 🌐 STEP 2: DATABASE MIGRATION (5 minutes)

### **2.1 Connect to Database**

```bash
# SSH to database server
ssh postgres@db-prod.gesclinic.com

# Verify Supabase connection
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres -d postgres -c "SELECT version();"

# Expected: PostgreSQL version info

# Test authentication
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres -d postgres -c "SELECT NOW();"
```

### **2.2 Backup Database**

```bash
# Create backup
pg_dump -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres \
  -d postgres \
  -F custom \
  -f /backups/gesclinic_prod_$(date +%Y%m%d_%H%M%S).backup

# Verify backup
ls -lh /backups/gesclinic_prod_*.backup
# Expected: ~50-200 MB file created

# Log backup location
echo "Backup saved: /backups/gesclinic_prod_[timestamp].backup"
```

### **2.3 Run Migration Script**

```bash
# Navigate to migrations
cd /opt/gesclinic/web/supabase/migrations

# List migration files
ls -1 *.sql | sort

# Run migration (if any pending from v0.2.5 → v0.3.0)
# Check: Are there new migrations?
# If yes: Execute them now
# If no: Skip this step

# Example migration (if needed):
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres \
  -d postgres \
  -f 20260113_COMPREHENSIVE_INIT.sql

# Expected output: "CREATE TABLE" or "ALTER TABLE" statements
# Check for errors
```

### **2.4 Verify Schema**

```bash
# Connect to database
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres -d postgres

# Run verification
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema='public';

# Expected: 30+ tables present

# Check key tables exist
\dt public.appointments
\dt public.users
\dt public.clinics
\dt public.professionals

# All should return table info
# If not found → STOP & investigate
```

**Status:** [ ] ✅ DATABASE MIGRATED

---

## 📦 STEP 3: APP DEPLOYMENT (10 minutes)

### **3.1 Stop Current Services**

```bash
# SSH to app server
ssh app@prod-app.gesclinic.com

# Stop web service
sudo systemctl stop gesclinic-web
# Wait 5 seconds
sleep 5

# Verify stopped
sudo systemctl status gesclinic-web
# Expected: "inactive (dead)"
```

### **3.2 Deploy New Code**

```bash
# Navigate to deployment directory
cd /opt/gesclinic

# Backup current version
tar -czf backups/gesclinic-web-v0.2.5-$(date +%Y%m%d_%H%M%S).tar.gz web/

# Copy new build
cp -r /opt/gesclinic/web/dist /opt/gesclinic/web-v0.3.0-build
rm -rf /opt/gesclinic/web/dist
cp -r /opt/gesclinic/web-v0.3.0-build /opt/gesclinic/web/dist

# Verify new build
ls -la /opt/gesclinic/web/dist/
# Expected: index.html and assets/ present

# Set permissions
chown -R app:app /opt/gesclinic/web/
chmod -R 755 /opt/gesclinic/web/dist/
```

### **3.3 Update Configuration**

```bash
# Verify environment variables
cat /opt/gesclinic/web/.env.production | grep VITE_
# Expected output:
# VITE_SUPABASE_URL=https://xfzvkvvyzzblmfxdmbty.supabase.co
# VITE_SUPABASE_ANON_KEY=eyJhbGc...

# If missing or incorrect → STOP & fix
# Do NOT start service without correct env vars!

# Verify version
echo "Deploying v0.3.0"
echo "Timestamp: $(date)"
```

### **3.4 Start Services**

```bash
# Start web service
sudo systemctl start gesclinic-web
sleep 5

# Verify started
sudo systemctl status gesclinic-web
# Expected: "active (running)"

# Check service logs
sudo journalctl -u gesclinic-web -n 20
# Expected: No errors, service started successfully

# Verify process
ps aux | grep gesclinic-web | grep -v grep
# Expected: Process running with correct PID
```

### **3.5 Update Load Balancer**

```bash
# SSH to load balancer
ssh lb@lb-prod.gesclinic.com

# Update upstream to v0.3.0
# Edit nginx config
sudo nano /etc/nginx/conf.d/gesclinic.conf

# Change upstream_app to point to new v0.3.0 servers
upstream gesclinic_app {
    server prod-app-1:3000 max_fails=3 fail_timeout=30s;
    server prod-app-2:3000 max_fails=3 fail_timeout=30s;
}

# Reload nginx (no downtime)
sudo nginx -t
sudo systemctl reload nginx
# Expected: "Nginx configuration OK"
```

**Status:** [ ] ✅ APP DEPLOYED

---

## 🏥 STEP 4: HEALTH CHECKS (5 minutes)

### **4.1 Homepage Load Test**

```bash
# Test homepage
curl -v https://app.gesclinic.com/ | head -20

# Expected HTTP 200
# Content includes: <!DOCTYPE html>, <title>Agenda Enterprise
# Response time < 2 seconds
```

### **4.2 API Connectivity**

```bash
# Test API endpoints
curl -H "Authorization: Bearer $ANON_KEY" \
  https://xfzvkvvyzzblmfxdmbty.supabase.co/rest/v1/clinics \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json"

# Expected: JSON response with clinic data
# HTTP 200 status
```

### **4.3 Database Connection**

```bash
# Test DB from app
curl -X POST https://xfzvkvvyzzblmfxdmbty.supabase.co/functions/v1/health \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected: {"status": "ok", "database": "connected"}
```

### **4.4 SSL Certificate**

```bash
# Verify SSL
echo | openssl s_client -servername app.gesclinic.com \
  -connect app.gesclinic.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Expected:
# notBefore=... (valid)
# notAfter=... (> 30 days in future)
```

### **4.5 DNS Resolution**

```bash
# Verify DNS
nslookup app.gesclinic.com
# Expected: Resolves to correct IP

dig app.gesclinic.com +short
# Expected: Shows IP address
```

**Status:** [ ] ✅ ALL HEALTH CHECKS PASS

---

## 📊 STEP 5: BASELINE METRICS (5 minutes)

### **5.1 Record Performance Baseline**

```bash
# HTTP Response Time
ab -n 100 -c 10 https://app.gesclinic.com/

# Expected output:
# Requests per second: [should be > 50]
# Mean response time: [should be < 100ms]
# Error rate: [should be 0%]

# Record:
# Response Time (avg): _____ ms
# Response Time (max): _____ ms
# Requests/sec: _____
# Errors: _____
```

### **5.2 System Metrics**

```bash
# CPU Usage
top -bn1 | grep "Cpu(s)" | awk '{print $2}'
# Expected: < 50%

# Memory Usage
free -h | grep "Mem:"
# Expected: < 70% used

# Disk Usage
df -h / | tail -1
# Expected: < 80% full

# Record:
# CPU: _____ %
# Memory: _____ %
# Disk: _____ %
```

### **5.3 Database Metrics**

```bash
# Query Performance
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres -c \
  "SELECT COUNT(*) FROM pg_stat_statements WHERE mean_time > 1000;"

# Expected: < 5 slow queries

# Connection Count
psql -h xfzvkvvyzzblmfxdmbty.supabase.co -U postgres -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state='active';"

# Expected: < 20 active connections
```

### **5.4 Error Rate

```bash
# Application errors (last 5 min)
grep "ERROR" /var/log/gesclinic-web.log | wc -l
# Expected: < 5 errors (should be 0!)

# Record:
# Error Count (5 min): _____
# Error Rate: _____ %
```

**Status:** [ ] ✅ BASELINE METRICS RECORDED

---

## ✅ DEPLOYMENT COMPLETE

```
╔═══════════════════════════════════════════════════╗
║                                                   ║
║         v0.3.0 DEPLOYED TO PRODUCTION            ║
║                                                   ║
║  Build Verified:        ✅ COMPLETE             ║
║  Database Migrated:     ✅ COMPLETE             ║
║  App Deployed:          ✅ COMPLETE             ║
║  Health Checks:         ✅ ALL PASS             ║
║  Baseline Metrics:      ✅ RECORDED             ║
║                                                   ║
║  STATUS: 🟢 READY FOR SMOKE TESTS               ║
║                                                   ║
║  Next: Hand off to QA team (12:00)              ║
║  Location: 🎯_ETAPA3_PRODUCAO_PLANO.md          ║
║                                                   ║
╚═══════════════════════════════════════════════════╝
```

---

## 📞 TROUBLESHOOTING

### **If Something Fails:**

```
BUILD FAILED:
→ Check: git status, dist/ exists?
→ Action: Re-run build or investigate
→ Escalate to Tech Lead

MIGRATION FAILED:
→ Check: SQL syntax, database connectivity
→ Action: Review backup, rollback if needed
→ Escalate to Database Admin

APP WON'T START:
→ Check: Env vars, logs, permissions
→ Action: Check systemctl status, journal logs
→ Escalate to AppOps team

HEALTH CHECKS FAIL:
→ Check: Service running? Load balancer config?
→ Action: Debug and retry
→ Decision: Proceed or rollback?
```

---

**Reference:** 🔧_PRODUCAO_INSTRUÇÕES_TÉCNICAS.md  
**Duration:** ~45 minutes  
**Status:** Ready for DevOps execution  
**Next:** QA Smoke Tests at 12:00

🚀 **LET'S DEPLOY IT!** 🚀
