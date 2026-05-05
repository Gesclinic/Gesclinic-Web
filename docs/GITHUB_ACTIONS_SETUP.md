# GitHub Actions Setup Guide

## 🔧 CI/CD Pipeline Overview

The project includes a comprehensive GitHub Actions workflow that automatically:

✅ **Lints & Formats** code on every push  
✅ **Builds** production bundle  
✅ **Scans** for security vulnerabilities  
✅ **Analyzes** code quality  
✅ **Type checks** TypeScript (when adopted)  
✅ **Deploys** to production (main branch)  
✅ **Creates preview deployments** for PRs  

---

## 📋 Required Configuration

### Step 1: Add GitHub Secrets

Go to **GitHub Repo Settings** > **Secrets and variables** > **Actions**

Add the following secrets:

#### 1. **Supabase Configuration**
```
VITE_SUPABASE_URL
Value: https://your-project.supabase.co
```

```
VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 2. **Vercel Deployment** (Optional)
```
VERCEL_TOKEN
Value: [Get from Vercel Account Settings > Tokens]
```

```
VERCEL_ORG_ID
Value: [Found in Vercel project settings]
```

```
VERCEL_PROJECT_ID
Value: [Found in Vercel project settings]
```

#### 3. **Slack Notifications** (Optional)
```
SLACK_WEBHOOK
Value: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## 🚀 How to Add Secrets

### Via GitHub UI

1. Go to your repository
2. Click **Settings** (top right)
3. Select **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Name: `VITE_SUPABASE_URL`
6. Value: `https://your-project.supabase.co`
7. Click **Add secret**
8. Repeat for each secret

### Via GitHub CLI

```bash
gh secret set VITE_SUPABASE_URL -b "https://your-project.supabase.co"
gh secret set VITE_SUPABASE_ANON_KEY -b "your_anon_key_here"
```

---

## 📊 Workflow Jobs Explained

### Job 1: ESLint & Prettier
- **Trigger**: Every push to any branch
- **Action**: Checks code formatting and linting standards
- **Fail If**: ESLint errors found or Prettier format violated
- **Fix**: Run `npm run lint:fix && npm run format` locally

### Job 2: Build Production
- **Trigger**: After lint passes
- **Action**: Builds optimized production bundle
- **Artifact**: `dist/` folder uploaded for 5 days
- **Fail If**: Build compilation errors
- **Fix**: Check build errors: `npm run build`

### Job 3: Security Scanning
- **Trigger**: Every push
- **Action**: 
  - Runs `npm audit` for vulnerabilities
  - Scans for hardcoded secrets
- **Note**: Vulnerabilities noted but don't fail by default
- **Fix**: Run `npm audit fix` for auto-fixable issues

### Job 4: Code Quality
- **Trigger**: Every push
- **Action**: Detailed ESLint analysis
- **Output**: JSON report uploaded as artifact
- **Info**: Shows potential improvements

### Job 5: TypeScript Type Check
- **Trigger**: Every push (continues on error)
- **Action**: Validates TypeScript configuration
- **Note**: Optional, enabled after TypeScript migration
- **Fix**: Address types as TypeScript is adopted

### Job 6: Production Deployment
- **Trigger**: Push to `main` branch only
- **Action**: Deploys to production via Vercel
- **Environment**: Production
- **Requirement**: All previous jobs must pass
- **URL**: https://gesclinic.vercel.app

### Job 7: Preview Deployment
- **Trigger**: Pull requests only
- **Action**: Creates temporary preview at Vercel
- **Comment**: Adds PR comment with preview URL
- **Duration**: 48 hours (auto cleanup)

### Job 8: Notifications
- **Trigger**: After all jobs complete
- **Action**: Sends Slack notification on failure
- **Channel**: Your configured Slack webhook

---

## ✅ Testing the Workflow

### Verify Workflow Running

1. Go to **Actions** tab on GitHub
2. Click on latest workflow run
3. Expand each job to see logs
4. Check green ✅ marks for passed jobs

### Manually Trigger Workflow

```bash
# Push a new commit
git commit -m "test: trigger CI pipeline" --allow-empty
git push origin main
```

### Check Build Artifacts

1. Go to **Actions** > Latest workflow
2. Click "Build Production" job
3. Scroll down to "Artifacts"
4. Download `dist.zip` to verify build

---

## 🔍 Monitoring & Debugging

### View Workflow Logs

1. **GitHub Actions Tab**: Real-time logs
2. **Command Line**: 
   ```bash
   gh run list --repo Gesclinic/Gesclinic-Web
   gh run view <run-id> --log
   ```

### Common Issues

#### ❌ "npm ci failed"
```bash
# Run locally first
npm ci --legacy-peer-deps
```

#### ❌ "ESLint found problems"
```bash
# Fix locally
npm run lint:fix
npm run format
git push
```

#### ❌ "Build failed"
```bash
# Debug build
npm run build
# Check vite.config.js for errors
```

#### ❌ "Secrets not found"
```bash
# Verify secrets exist in GitHub Settings > Secrets
# Check secret names match exactly (case-sensitive)
```

---

## 📈 Performance Optimization

### Caching Dependencies

The workflow uses **GitHub Actions caching** for npm:
```yaml
cache: 'npm'  # Caches node_modules
```

**Benefits**:
- 60-70% faster installs on subsequent runs
- Automatic cleanup after 7 days
- Per-branch caching

---

## 🔐 Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` locally (ignored by .gitignore)
   - Use GitHub Secrets in CI/CD

2. **Rotate secrets regularly**
   - Vercel tokens: Every 90 days
   - Supabase keys: When compromised
   - Slack webhooks: When rotated

3. **Limit secret access**
   - Only needed jobs can access secrets
   - Workflows run in isolated containers
   - Logs don't expose secrets

4. **Monitor deployments**
   - Check Vercel logs for errors
   - Monitor Sentry for runtime errors
   - Review GitHub Actions audit log

---

## 📚 Next Steps

### 1. Enable Deployment Protection Rules (Optional)
```
Settings > Environments > production
Add required reviewers for production deployments
```

### 2. Setup Status Checks
```
Settings > Branches > Branch protection rules
Require status checks to pass:
- lint-and-format
- build
- security
```

### 3. Enable Auto-Merge (Optional)
```
Settings > General
Allow auto-merge (only when all checks pass)
```

### 4. Configure Code Owners
Create `.github/CODEOWNERS`:
```
* @frontend-team
src/services/ @backend-team
docs/ @tech-lead
```

---

## 🎯 Troubleshooting Checklist

- [ ] All GitHub secrets added (case-sensitive)
- [ ] Vercel project connected to GitHub
- [ ] Workflow file at `.github/workflows/ci-cd.yml`
- [ ] Branch permissions configured
- [ ] Deploy key/token valid and not expired
- [ ] Slack webhook configured (if using notifications)

---

## 📞 Support

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Team Slack**: #deployments channel

---

**Workflow File**: `.github/workflows/ci-cd.yml`  
**Last Updated**: May 4, 2026
