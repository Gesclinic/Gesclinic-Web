# 🏥 Gesclinic Web

**Professional Healthcare Management System** built with React 18, Vite 5, and Supabase.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Configuration](#configuration)
4. [Development](#development)
5. [Production](#production)
6. [Code Standards](#code-standards)
7. [Architecture](#architecture)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js 16+ (or use nvm)
npm 8+ or yarn
Git
Supabase account (free tier available)
```

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Gesclinic/Gesclinic-Web.git
cd Gesclinic-Web

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Setup environment
cp .env.example .env.local
# Edit .env.local with your Supabase credentials:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your_anon_key_here

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3000
```

**Default Test Credentials** (if available):
```
Email: test@gesclinic.com.br
Password: [Check team Slack or 1Password]
```

---

## 📁 Project Structure

```
gesclinic-web/
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── layout/         # Layout wrappers
│   │   ├── agenda/         # Agenda-specific components
│   │   └── clinica/        # Clinic-specific components
│   ├── pages/              # Full page components (routed)
│   │   ├── auth/           # Login, register pages
│   │   ├── clinica/        # Clinic dashboard pages
│   │   ├── public/         # Public-facing pages
│   │   └── portal/         # Patient/Doctor portals
│   ├── services/           # Business logic
│   │   ├── api/            # API services (Supabase)
│   │   ├── supabase/       # Auth & Supabase client
│   │   └── [featureService.js]
│   ├── contexts/           # React Context providers
│   │   ├── SupabaseAuthContext.jsx
│   │   └── ClinicContext.jsx
│   ├── guards/             # Auth guards & middleware
│   ├── utils/              # Utility functions
│   │   ├── formatters/     # Data formatting
│   │   └── validators/     # Input validation
│   ├── hooks/              # Custom React hooks
│   ├── config/             # Configuration files
│   ├── styles/             # Global styles
│   ├── App.jsx             # Main app component
│   ├── AppRoutes.jsx       # Route definitions
│   └── main.jsx            # React entry point
├── tests/                  # Test files & E2E specs
├── public/                 # Static assets
├── docs/                   # Documentation
├── .eslintrc.json          # ESLint configuration
├── .prettierrc.json        # Prettier configuration
├── .gitignore              # Git ignore rules
├── vite.config.js          # Vite configuration
├── vercel.json             # Vercel deployment config
├── package.json            # Dependencies & scripts
└── README.md               # This file
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in project root:

```env
# Supabase (REQUIRED)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional
VITE_APP_NAME=Gesclinic
VITE_API_TIMEOUT=30000
VITE_ENABLE_ANALYTICS=true
```

**Never commit `.env.local` to git** (it's in `.gitignore`)

### Vite Configuration

Key settings in `vite.config.js`:
- **Port**: 3000 (configurable)
- **Aliases**: `@` → `./src`
- **HMR**: Enabled for hot module replacement
- **Build output**: `dist/` directory

### Prettier & ESLint

All code is automatically formatted with:
- **Prettier**: 2-space indent, single quotes, 100-char line width
- **ESLint**: React/hooks best practices + pragmatic rules

Conflicts are minimized by letting Prettier handle formatting exclusively.

---

## 💻 Development

### Available Scripts

```bash
# Start development server with HMR
npm run dev

# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Fix ESLint errors
npm run lint:fix

# Build production bundle
npm run build

# Preview production build locally
npm run preview

# Run tests (when configured)
npm run test

# Run E2E tests (when configured)
npm run test:e2e
```

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** (dev server auto-reloads)
   ```bash
   # Edit src/**/*.jsx files
   # Changes reflect immediately in browser
   ```

3. **Format & lint before commit**
   ```bash
   npm run format && npm run lint:fix
   ```

4. **Commit with conventional message**
   ```bash
   git add .
   git commit -m "feat: add new appointment booking modal"
   ```

5. **Push & create PR**
   ```bash
   git push origin feature/your-feature
   # Create PR on GitHub with description
   ```

### Code Standards

**See `.eslintrc.json` for complete rules:**

- ✅ React hooks dependencies enforced
- ✅ No unused variables (unless prefixed with `_`)
- ✅ Single quotes for strings
- ✅ Semicolons required
- ✅ `const` preferred over `let`/`var`
- ✅ Strict equality (`===`) required
- ✅ Console logs only as warnings
- ✅ Import statements sorted

### Component Best Practices

```jsx
// ✅ Good: Functional component with hooks
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const MyComponent = ({ title, onSubmit }) => {
  const [data, setData] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Load data
  }, [user?.id]);

  return (
    <div>
      <h1>{title}</h1>
      {data && <p>{data.name}</p>}
    </div>
  );
};
```

```jsx
// ❌ Avoid: Class components, prop mutations
class OldComponent extends React.Component {
  componentDidMount() {}
  render() {
    this.props.data.name = 'changed'; // ✗ Mutation
    return <div>{this.props.data.name}</div>;
  }
}
```

---

## 🏗️ Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18 + Vite 5 | UI framework & build tool |
| **Styling** | TailwindCSS | Utility-first CSS |
| **Components** | Radix UI | Headless UI primitives |
| **Routing** | React Router v6 | Client-side routing |
| **State** | React Context | Global state (Auth, Clinic) |
| **Backend** | Supabase (PostgreSQL) | Database & Auth |
| **API** | Supabase JS Client | Real-time sync & CRUD |
| **Deployment** | Vercel | Automatic deployments |

### Authentication Flow

```
1. User enters credentials on /login
   ↓
2. Supabase PKCE flow (secure)
   ↓
3. Session token stored in localStorage
   ↓
4. AuthContext loads user & clinic data
   ↓
5. Protected routes check authentication
   ↓
6. User redirected to /clinica/agenda (authenticated)
```

### Data Flow

```
Component
  ↓
Custom Hook (useAuth, useClinicContext)
  ↓
Service Layer (appointmentsService, financeService, etc.)
  ↓
Base Service (automatic clinic_id injection)
  ↓
Supabase Client (with RLS enforcement)
  ↓
PostgreSQL Database
```

### Key Patterns

**1. Service Layer (API abstraction)**
```javascript
// src/services/api/appointmentsService.js
export const listAppointments = async (clinicId, filters) => {
  return baseService.queryTableByClinic('appointments', clinicId, filters);
};
```

**2. Automatic Clinic Filtering (RLS + Code)**
```javascript
// All API calls automatically include clinic_id
// - RLS policies enforce clinic_id in database
// - Service layer adds clinic_id to all queries
// - User can only see own clinic data
```

**3. Context Providers**
```javascript
// Wraps app with global state
<HelmetProvider>
  <AuthProvider>
    <ClinicProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClinicProvider>
  </AuthProvider>
</HelmetProvider>
```

---

## 🚀 Production

### Building for Production

```bash
# Create optimized bundle
npm run build

# Expected output:
# ✓ 4,955 modules transformed
# ✓ dist/ ready for deployment
# ✓ Size: ~1.1 MB gzipped
```

### Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Build Time | < 60s | 40.38s ✅ |
| Bundle Size | < 1.5 MB | 1.1 MB ✅ |
| Lighthouse Score | > 80 | [Check locally] |
| FCP | < 2s | [Check locally] |
| LCP | < 3s | [Check locally] |

### Optimization Checklist

- ✅ Code splitting by route
- ✅ Lazy component loading
- ✅ Image optimization
- ✅ Minification & compression
- ✅ Tree-shaking unused code
- ✅ Gzip compression enabled
- ⏳ Service worker setup

---

## 📦 Deployment

### Vercel (Recommended)

**Automatic deployments on git push:**

```bash
# 1. Connect GitHub repo to Vercel
# https://vercel.com/import

# 2. Add environment variables in Vercel dashboard:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY

# 3. Every push to main/master triggers deployment
# 4. Preview URL created for each PR
# 5. Production deployment on merge to main
```

**Deployed URL:** [Production Domain]

**Preview deployments:** Automatic for all PRs

### Manual Deployment

```bash
# 1. Build production bundle
npm run build

# 2. Deploy dist/ folder to any static host:
#    - AWS S3 + CloudFront
#    - GitHub Pages
#    - Netlify
#    - Azure Static Web Apps
#    - Google Firebase Hosting
```

### Database Migrations

Supabase migrations are stored in `supabase/migrations/`:

```bash
# Apply migrations manually in Supabase dashboard
# or use Supabase CLI:
supabase db pull  # Download schema
supabase db push  # Upload migrations
```

---

## 🐛 Troubleshooting

### Dev Server Won't Start

```bash
# 1. Kill existing processes on port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000    # Windows

# 2. Clear Vite cache
rm -rf node_modules/.vite

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# 4. Try again
npm run dev
```

### Environment Variables Not Loading

```bash
# 1. Verify .env.local exists in project root
ls -la .env.local

# 2. Check format (no spaces, no quotes):
# ✅ VITE_SUPABASE_URL=https://project.supabase.co
# ❌ VITE_SUPABASE_URL = "https://project.supabase.co"

# 3. Restart dev server
# (env vars loaded only on server start)
```

### Supabase Connection Failed

```bash
# 1. Verify credentials in .env.local
# 2. Check Supabase project is running
# 3. Verify API key has correct permissions
# 4. Check network connectivity
# 5. Review browser console for detailed error
```

### Build Fails with ESLint Error

```bash
# 1. Check error message
npm run lint

# 2. Fix issues automatically
npm run lint:fix

# 3. Format code
npm run format

# 4. Retry build
npm run build
```

### Git Merge Conflicts

```bash
# 1. Identify conflicted files
git status

# 2. Resolve manually or with IDE
# 3. Reformat and lint
npm run format && npm run lint:fix

# 4. Complete merge
git add .
git commit -m "chore: resolve merge conflicts"
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design & patterns |
| [API_REFERENCE.md](docs/API_REFERENCE.md) | Service layer documentation |
| [COMPONENTS.md](docs/COMPONENTS.md) | Component catalog |
| [TYPESCRIPT_MIGRATION.md](docs/TYPESCRIPT_MIGRATION.md) | TypeScript adoption roadmap |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment procedures |
| [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues & solutions |

---

## 🔒 Security

### Key Principles

1. **RLS Policies**: All database access enforced by clinic_id
2. **Auth Guards**: Protected routes check authentication
3. **Input Validation**: All user input validated before submission
4. **HTTPS Only**: All API calls use HTTPS
5. **No Secrets in Code**: Credentials in environment variables only
6. **CORS Configured**: Only authorized domains allowed

### Security Checklist

- ✅ No hardcoded API keys
- ✅ RLS policies enforced
- ✅ Auth context loaded before routes
- ✅ Input sanitized before sending to API
- ✅ HTTPS enforced in production
- ✅ CORS headers configured
- ✅ Environment variables validated on startup
- ✅ Sensitive data not logged to console

---

## 🤝 Contributing

### Code Review Checklist

Before submitting PR, ensure:

- [ ] Code follows project standards (`npm run lint` passes)
- [ ] Code formatted (`npm run format` applied)
- [ ] Build succeeds (`npm run build` passes)
- [ ] Tests pass (`npm run test` passes)
- [ ] Commit messages follow convention
- [ ] No console.error/warning in production code
- [ ] No hardcoded API keys or secrets
- [ ] Documentation updated if needed

### Commit Message Convention

```
type(scope): subject

type: feat, fix, docs, style, refactor, test, chore
scope: agenda, financeiro, estoque, auth, etc.
subject: concise description (imperative, lowercase)

Example:
feat(agenda): add appointment rescheduling modal
fix(financeiro): correct currency formatting in reports
docs: update deployment instructions
```

---

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/Gesclinic/Gesclinic-Web/issues)
- **Discussions**: [Ask questions](https://github.com/Gesclinic/Gesclinic-Web/discussions)
- **Slack**: [Internal team channel]
- **Email**: [support@gesclinic.com.br]

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🎯 Roadmap

**Q2 2026**
- [ ] TypeScript migration complete
- [ ] E2E testing framework setup
- [ ] Performance monitoring
- [ ] Mobile app foundation

**Q3 2026**
- [ ] Advanced reporting features
- [ ] Multi-language support
- [ ] Enhanced patient portal
- [ ] Analytics dashboard

**Q4 2026**
- [ ] AI-powered scheduling
- [ ] Integration marketplace
- [ ] Custom branding engine
- [ ] Enterprise SSO support

---

**Last Updated**: May 4, 2026  
**Version**: 0.0.1  
**Maintainer**: [Team]

