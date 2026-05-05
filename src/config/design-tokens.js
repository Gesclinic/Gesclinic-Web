/**
 * 🎨 DESIGN TOKENS — GESCLINIC WEB
 *
 * Sistema completo de design para toda a aplicação
 * Baseado em Tailwind CSS + CSS Variables
 *
 * 📌 USO:
 * import { COLORS, SPACING, TYPOGRAPHY } from "@/config/design-tokens";
 *
 * className={`${SPACING.cardPadding} ${COLORS.bg.primary} ${TYPOGRAPHY.body}`}
 */

// ============================================
// 🎨 CORES — HSL (CSS Variables)
// ============================================
export const COLORS = {
  // Primárias
  primary: {
    50: 'hsl(var(--primary) / 0.05)',
    100: 'hsl(var(--primary) / 0.1)',
    200: 'hsl(var(--primary) / 0.2)',
    500: 'hsl(var(--primary) / 1)',
    600: 'hsl(var(--primary) / 0.9)',
    700: 'hsl(var(--primary) / 0.8)',
    foreground: 'hsl(var(--primary-foreground) / 1)',
  },

  // Secundárias
  secondary: {
    50: 'hsl(var(--secondary) / 0.5)',
    100: 'hsl(var(--secondary) / 1)',
    200: 'hsl(var(--secondary) / 0.9)',
  },

  // Backgrounds
  bg: {
    page: 'hsl(var(--secondary) / 1)', // Fundo da página
    card: 'hsl(0 0% 100% / 1)', // Fundo dos cards
    sidebar: 'hsl(0 0% 100% / 1)', // Sidebar background
    input: 'hsl(var(--secondary) / 0.5)', // Input background
  },

  // Foregrounds
  fg: {
    primary: 'hsl(0 0% 15% / 1)', // Texto principal
    secondary: 'hsl(0 0% 45% / 1)', // Texto secundário
    muted: 'hsl(0 0% 65% / 1)', // Texto desabilitado
  },

  // Status
  status: {
    success: 'hsl(var(--success) / 1)', // Verde (#66B741)
    warning: 'hsl(var(--warning) / 1)', // Laranja (#FFB800)
    danger: 'hsl(var(--danger) / 1)', // Vermelho (#FF3B30)
    info: 'hsl(var(--primary) / 1)', // Azul
  },

  // Borders
  border: {
    light: 'hsl(0 0% 90% / 1)',
    normal: 'hsl(0 0% 80% / 1)',
    dark: 'hsl(0 0% 70% / 1)',
  },

  // Interações
  interaction: {
    hover: 'hsl(var(--primary) / 0.05)',
    active: 'hsl(var(--primary) / 0.1)',
    focus: 'hsl(var(--primary) / 1)',
  },
};

// ============================================
// 📐 ESPAÇAMENTOS
// ============================================
export const SPACING = {
  // Padding/Margin padrão
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '1rem', // 16px
  lg: '1.5rem', // 24px
  xl: '2rem', // 32px
  '2xl': '3rem', // 48px

  // Componentes específicos
  sidebarItem: 'h-10 px-3 py-2', // Menu items
  cardPadding: 'p-4 rounded-xl', // Card default
  cardPaddingLg: 'p-6 rounded-xl', // Card grande
  sectionMargin: 'mb-6', // Entre seções
  gridGap: 'gap-4', // Grid padrão

  // Específico para layout
  pageInset: 'px-6 py-8', // Margem da página
  modalInset: 'p-6', // Modal padding
};

// ============================================
// 🔤 TIPOGRAFIA
// ============================================
export const TYPOGRAPHY = {
  // Fontes
  family: {
    base: "'Inter', sans-serif",
    mono: "'Fira Code', monospace",
  },

  // Tamanhos e pesos
  h1: 'text-4xl font-bold leading-tight', // 36px, bold
  h2: 'text-3xl font-bold leading-snug', // 30px, bold
  h3: 'text-2xl font-bold leading-snug', // 24px, bold
  h4: 'text-xl font-semibold', // 20px, semibold
  h5: 'text-lg font-semibold', // 18px, semibold
  h6: 'text-base font-semibold', // 16px, semibold

  body: 'text-sm leading-relaxed', // 14px, regular
  bodyLg: 'text-base leading-relaxed', // 16px, regular
  bodySm: 'text-xs leading-relaxed', // 12px, regular

  label: 'text-sm font-medium', // 14px, medium (inputs)
  caption: 'text-xs text-muted', // 12px, muted
  helper: 'text-xs text-muted/70', // 10px, muito muted

  // Variações
  bold: 'font-bold',
  semibold: 'font-semibold',
  medium: 'font-medium',
  regular: 'font-normal',
  light: 'font-light',

  // KPI específico
  kpi: 'text-2xl font-bold', // Números grandes
  kpiLabel: 'text-sm text-muted', // Rótulo do KPI
};

// ============================================
// 🎭 ESTADOS DE INTERAÇÃO
// ============================================
export const STATES = {
  // Hover
  hover: 'hover:bg-muted/50 transition-colors',

  // Focus
  focus: 'focus:outline-none focus:ring-2 focus:ring-primary/50',

  // Disabled
  disabled: 'disabled:opacity-50 disabled:cursor-not-allowed',

  // Active (menu item)
  active: 'bg-primary/10 border-l-4 border-primary',

  // Loading
  loading: 'opacity-70 cursor-wait',

  // Transition
  transition: 'transition-all duration-200 ease-in-out',
};

// ============================================
// 🧩 COMPONENTES PREDEFINIDOS
// ============================================
export const COMPONENTS = {
  // Button
  button: {
    base: 'px-4 py-2 rounded-lg font-medium transition-all duration-200',
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-fg-primary hover:bg-secondary/80',
    outline: 'border border-border-normal text-fg-primary hover:bg-muted',
    ghost: 'text-fg-primary hover:bg-muted',
    small: 'px-3 py-1 text-sm',
    large: 'px-6 py-3 text-lg',
  },

  // Input
  input: {
    base: 'w-full px-3 py-2 rounded-lg border border-border-normal bg-bg-input text-fg-primary placeholder:text-muted transition-colors',
    focus: 'focus:border-primary focus:ring-2 focus:ring-primary/20',
    disabled: 'disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50',
  },

  // Card
  card: {
    base: 'rounded-xl bg-white border border-border-light shadow-sm',
    padding: 'p-4',
    paddingLg: 'p-6',
    interactive: 'hover:shadow-md transition-shadow',
  },

  // Badge
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  },

  // Menu Item (Sidebar)
  menuItem: {
    base: 'group relative flex items-center gap-3 rounded-lg transition-all',
    padding: 'px-3 py-2',
    text: 'text-sm font-medium',
    icon: 'h-5 w-5',
    inactive: 'text-fg-secondary hover:bg-muted hover:text-fg-primary',
    active: 'bg-primary/10 text-primary font-semibold',
  },

  // Sidebar
  sidebar: {
    background: 'bg-white',
    border: 'border-r border-border-light',
    width: 'w-64',
    widthCollapsed: 'w-20',
    transition: 'transition-all duration-200',
  },

  // Modal
  modal: {
    overlay: 'fixed inset-0 bg-black/50 transition-opacity',
    content: 'bg-white rounded-xl shadow-2xl',
    padding: 'p-6',
  },

  // Toast/Alert
  toast: {
    base: 'rounded-lg px-4 py-3 shadow-md border',
    success: 'bg-success/10 border-success text-success',
    warning: 'bg-warning/10 border-warning text-warning',
    danger: 'bg-danger/10 border-danger text-danger',
    info: 'bg-info/10 border-info text-info',
  },
};

// ============================================
// 📏 BREAKPOINTS (Tailwind padrão)
// ============================================
export const BREAKPOINTS = {
  sm: 640, // small
  md: 768, // medium
  lg: 1024, // large
  xl: 1280, // extra large
  '2xl': 1536, // 2x extra large
};

// ============================================
// ⏱️ ANIMAÇÕES
// ============================================
export const ANIMATIONS = {
  // Duração padrão
  fast: 'duration-150',
  normal: 'duration-200',
  slow: 'duration-300',
  slower: 'duration-500',

  // Easing
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',

  // Transitions comuns
  hover: 'transition-all duration-200 ease-in-out',
  fadeIn: 'animate-in fade-in',
  slideIn: 'animate-in slide-in-from-left',
};

// ============================================
// 🎯 SOMBRAS
// ============================================
export const SHADOWS = {
  none: 'shadow-none',
  sm: 'shadow-sm', // hover subtil
  md: 'shadow-md', // elevação padrão
  lg: 'shadow-lg', // modal
  xl: 'shadow-xl', // dropdown
  '2xl': 'shadow-2xl', // overlay
};

// ============================================
// 📊 KPI ESPECÍFICOS
// ============================================
export const KPI = {
  container: 'bg-white rounded-xl p-6 border border-border-light',
  value: 'text-2xl font-bold text-fg-primary',
  label: 'text-sm text-fg-secondary mt-2',
  change: 'text-xs mt-2 flex items-center gap-1',
  changeUp: 'text-success',
  changeDown: 'text-danger',
};

// ============================================
// 🎨 PALETA SUGERIDA (CSS Variables)
// ============================================
export const CSS_VARIABLES = `
  :root {
    /* Primária - Azul Profissional */
    --primary: 216 100% 40%;           /* #0055FF */
    --primary-foreground: 0 0% 100%;   /* Branco */

    /* Secundária - Cinza Claro */
    --secondary: 215 20% 95%;          /* #F0F4F8 */

    /* Status */
    --success: 142 71% 45%;            /* #66B741 */
    --warning: 38 92% 50%;             /* #FFB800 */
    --danger: 0 84% 60%;               /* #FF3B30 */

    /* Espaçamento padrão */
    --spacing-unit: 1rem;
  }
`;
