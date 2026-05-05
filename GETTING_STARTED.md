# Getting Started - Gesclinic Web

## ⚡ 30-Second Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Setup environment
echo "VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here" > .env.local

# 3. Start dev server
npm run dev

# Open: http://localhost:3000
```

---

## 📝 Full Setup (5 minutes)

### Step 1: Clone & Install

```bash
git clone https://github.com/Gesclinic/Gesclinic-Web.git
cd Gesclinic-Web
npm install --legacy-peer-deps
```

### Step 2: Configure Supabase

1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Create new project
4. Go to **Settings** > **API**
5. Copy `Project URL` and `Anon Public Key`

### Step 3: Create `.env.local`

```bash
# Copy example
cp .env.example .env.local

# Edit with your credentials
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 4: Start Development

```bash
npm run dev
```

**Browser opens automatically:** http://localhost:3000

---

## 🎯 First Workflow

### 1️⃣ Create Feature Branch
```bash
git checkout -b feature/your-feature-name
```

### 2️⃣ Edit Code
```bash
# Files in src/ auto-reload in browser
# Changes visible instantly
```

### 3️⃣ Format & Lint
```bash
npm run format
npm run lint:fix
```

### 4️⃣ Commit
```bash
git add .
git commit -m "feat: describe your changes"
```

### 5️⃣ Push & PR
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

---

## 🔧 Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build |
| `npm run format` | Auto-format code |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Fix ESLint errors |

---

## 🚨 Troubleshooting

### Port 3000 in Use?
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000    # Windows
```

### Environment Variables Not Loading?
```bash
# 1. Verify .env.local exists
# 2. Restart dev server (env vars loaded on start)
# 3. Check format: VITE_KEY=value (no spaces)
```

### Build Failing?
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
npm run build
```

---

## 📚 Learn More

- [Full README](README_PROFESSIONAL.md)
- [Project Structure](../docs/PROJECT_STRUCTURE.md)
- [Architecture Guide](../docs/ARCHITECTURE.md)
- [API Reference](../docs/API_REFERENCE.md)

---

**Happy Coding! 🚀**

