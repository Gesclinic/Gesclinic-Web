// src/components/layout/Sidebar.jsx
import React, { useState, useMemo, useEffect, useLayoutEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Importar TODOS os novos ícones
import {
  LayoutDashboard,
  Calendar,
  Users,
  FilePlus,
  Stethoscope,
  Layers,
  HeartHandshake,
  FileText,
  FileSpreadsheet,
  DollarSign,
  CircleDollarSign,
  ArrowDown,
  ArrowUp,
  Landmark,
  Boxes,
  ShoppingBag,
  Box,
  Truck,
  Warehouse,
  ArrowRightLeft,
  BarChart3,
  FileUp,
  Settings,
  Shield,
  Building,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  CalendarDays,
  UserCheck,
  DoorOpen,
  CheckCircle,
  Clock,
  Bell,
  MessageSquare,
  ScrollText,
  List,
  IdCard,
  History,
  ClipboardList,
  Folder,
  Image,
  ShieldCheck,
  UsersRound,
  Database,
  Activity,
  Handshake,
  Wallet,
  TrendingUp,
  TrendingDown,
  LineChart,
  Banknote,
  Settings2,
  ListTree,
  Target,
  Zap,
  PieChart,
  Sliders,
  Clock3,
  Package,
  Tags,
  Shuffle,
  ScanLine,
  FileBarChart,
  UploadCloud,
  Lock,
  CalendarCog,
  WalletCards,
  Building2,
  Receipt,
} from 'lucide-react';

import { getMenuItems } from '@/constants/menu.js';
import logoG from '@/assets/logo_gesclinic_g.png';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { usePermissions as usePermissionsContext } from '@/contexts/PermissionsContext';
import { cn } from '@/lib/utils';

const isPathActive = (itemPath, pathname) => {
  if (!itemPath) {
    return false;
  }

  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
};

const buildActiveTrail = (items, pathname, parents = []) => {
  // First: search children recursively (highest priority - more specific paths)
  for (const item of items) {
    if (item.children?.length) {
      const childTrail = buildActiveTrail(item.children, pathname, [...parents, item.id]);
      if (childTrail.length > 0) {
        return childTrail;
      }
    }
  }

  // Second: look for exact match in current level (for items without children or leaf items)
  for (const item of items) {
    if (item.path === pathname) {
      return [...parents, item.id];
    }
  }

  // Third: look for prefix match (but only in leaf items without children)
  for (const item of items) {
    // Only use prefix matching for items without children
    if (!item.children?.length && isPathActive(item.path, pathname)) {
      return [...parents, item.id];
    }
  }

  return [];
};

const buildDescendantsMap = (items) => {
  const map = {};

  const visit = (item) => {
    const descendants = [];

    for (const child of item.children || []) {
      descendants.push(child.id);
      descendants.push(...visit(child));
    }

    map[item.id] = descendants;
    return descendants;
  };

  items.forEach(visit);
  return map;
};

// Mapa COMPLETO de ícones
const ICONS = {
  LayoutDashboard,
  Calendar,
  Users,
  FilePlus,
  Stethoscope,
  Layers,
  HeartHandshake,
  FileText,
  FileSpreadsheet,
  DollarSign,
  CircleDollarSign,
  ArrowDown,
  ArrowUp,
  Landmark,
  Boxes,
  ShoppingBag,
  Box,
  Truck,
  Warehouse,
  ArrowRightLeft,
  BarChart3,
  FileUp,
  Settings,
  Shield,
  Building,
  UserCog,
  LogOut,
  CalendarDays,
  UserCheck,
  DoorOpen,
  CheckCircle,
  Clock,
  Bell,
  MessageSquare,
  ScrollText,
  List,
  IdCard,
  History,
  ClipboardList,
  Folder,
  Image,
  ShieldCheck,
  UsersRound,
  Database,
  Activity,
  Handshake,
  Wallet,
  TrendingUp,
  TrendingDown,
  LineChart,
  Banknote,
  Settings2,
  ListTree,
  Target,
  Zap,
  PieChart,
  Sliders,
  Clock3,
  Package,
  Tags,
  Shuffle,
  ScanLine,
  FileBarChart,
  UploadCloud,
  Lock,
  CalendarCog,
  WalletCards,
  UsersRound,
  Building2,
  Receipt,
};

export default function Sidebar({ isOpen, setIsOpen }) {
  const { currentRole, handleLogout } = useAuth();
  const { canView, permissions, loading: loadingPermissions } = usePermissionsContext();
  const location = useLocation();
  const navigate = useNavigate();
  const navRef = React.useRef(null);
  const scrollPosRef = React.useRef(null);

  // Determina o role: primeiro da sessão customizada, depois do Supabase Auth
  const getRoleForMenu = () => {
    const customSession = localStorage.getItem('gesclinic_session');
    if (customSession) {
      try {
        const sessionData = JSON.parse(customSession);
        return sessionData.role || 'recepcao';
      } catch (e) {
        console.error('Erro ao parsear sessão customizada', e);
      }
    }
    return currentRole || 'recepcao';
  };

  // Gera menu baseado no perfil
  const menu = useMemo(() => {
    const role = getRoleForMenu();
    const enablePermissionFilter =
      !loadingPermissions &&
      Array.isArray(permissions) &&
      permissions.some((item) => {
        if (typeof item === 'string') {
          return item === '*';
        }
        return !!item?.permission_key;
      });

    const filteredMenu = getMenuItems(role, { canView, enablePermissionFilter });
    return filteredMenu;
  }, [currentRole, canView, permissions, loadingPermissions]);

  const descendantsById = useMemo(() => buildDescendantsMap(menu), [menu]);
  const activeTrail = useMemo(
    () => buildActiveTrail(menu, location.pathname),
    [menu, location.pathname],
  );

  // Estado para rastrear módulos e subgrupos abertos
  const [openItems, setOpenItems] = useState({});
  const [pendingOpenItemId, setPendingOpenItemId] = useState(null);

  const rememberNavScroll = () => {
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }
  };

  const restoreNavScroll = () => {
    const navElement = navRef.current;
    const scrollTop = scrollPosRef.current;

    if (!navElement || scrollTop === null) {
      return;
    }

    const applyScroll = () => {
      if (navRef.current) {
        navRef.current.scrollTop = scrollTop;
      }
    };

    applyScroll();
    requestAnimationFrame(applyScroll);
    setTimeout(applyScroll, 0);
  };

  useEffect(() => {
    if (!isOpen) {
      setOpenItems({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTrail.length === 0) {
      if (!isOpen && pendingOpenItemId) {
        setPendingOpenItemId(null);
      }
      return;
    }

    const nextOpenItems = activeTrail.reduce((accumulator, itemId) => {
      accumulator[itemId] = true;
      return accumulator;
    }, {});

    if (pendingOpenItemId) {
      nextOpenItems[pendingOpenItemId] = true;
    }

    setOpenItems((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(nextOpenItems);

      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key])) {
        return prev;
      }

      return nextOpenItems;
    });

    if (pendingOpenItemId) {
      setPendingOpenItemId(null);
    }
  }, [activeTrail, location.pathname, isOpen, pendingOpenItemId]);

  // Interceptar cliques em links para prevenir auto-scroll do navegador
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const handleLinkClick = (e) => {
      const linkElement = e.target.closest('a[href]');
      if (!linkElement || !navElement.contains(linkElement)) return;

      // Não interceptar links externos ou especiais
      if (linkElement.hasAttribute('download') || linkElement.target === '_blank') return;

      rememberNavScroll();

      // Extrair o path (remover leading slash se houver)
      const href = linkElement.getAttribute('href');
      if (!href) return;

      restoreNavScroll();
    };

    navElement.addEventListener('click', handleLinkClick, true);
    return () => navElement.removeEventListener('click', handleLinkClick, true);
  }, [location.pathname]);

  useLayoutEffect(() => {
    restoreNavScroll();
  }, [location.pathname, location.search]);

  useLayoutEffect(() => {
    restoreNavScroll();
  }, [openItems]);

  const toggleItem = (item, siblingIds = []) => {
    const shouldOpen = !openItems[item.id];

    rememberNavScroll();

    if (!isOpen) {
      setPendingOpenItemId(item.id);
      setIsOpen(true);
      setOpenItems({ [item.id]: true });
      return;
    }

    setOpenItems((prev) => {
      const next = { ...prev };

      siblingIds.forEach((siblingId) => {
        delete next[siblingId];
        descendantsById[siblingId]?.forEach((descendantId) => {
          delete next[descendantId];
        });
      });

      delete next[item.id];
      descendantsById[item.id]?.forEach((descendantId) => {
        delete next[descendantId];
      });

      if (shouldOpen) {
        next[item.id] = true;
      }

      return next;
    });

    restoreNavScroll();
  };

  const renderIcon = (name, size = 'h-5 w-5') => {
    const IconComponent = ICONS[name] || LayoutDashboard;
    return <IconComponent className={size} />;
  };

  // Componente para renderizar item com até 3 níveis
  const MenuItem = ({ item, level = 0, siblingIds = [] }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = isPathActive(item.path, location.pathname);
    const isBranchActive = activeTrail.includes(item.id);
    const isItemOpen = !!openItems[item.id];
    const currentLevelSiblingIds =
      level === 0
        ? menu.filter((menuItem) => menuItem.children?.length).map((menuItem) => menuItem.id)
        : siblingIds;

    // Level 0: Dashboard ou módulo principal
    // Level 1: Subitem principal
    // Level 2: Subitem aninhado (máximo)

    if (level === 0) {
      // DASHBOARD - Item especial (sem children possíveis)
      if (item.path && !hasChildren) {
        return (
          <Link
            to={item.path}
            title={!isOpen ? item.label : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-xl transition-all font-medium min-h-[48px]',
              isOpen ? 'px-3 py-3' : 'justify-center px-2 py-3',
              isActive
                ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shadow-sm ring-1 ring-[hsl(var(--primary))]/10'
                : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isActive ? 'bg-[hsl(var(--primary))]/12' : 'group-hover:bg-[hsl(var(--primary))]/8',
              )}
            >
              {renderIcon(item.icon, 'h-5 w-5')}
            </span>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                  className="text-sm font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        );
      }

      // Módulo principal com children
      return (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleItem(item, currentLevelSiblingIds)}
            aria-expanded={isItemOpen}
            className={cn(
              'group flex items-center w-full rounded-xl transition-all duration-200 min-h-[48px]',
              isOpen ? 'gap-3 px-3 py-3' : 'justify-center px-2 py-3',
              isItemOpen || isBranchActive
                ? 'bg-[hsl(var(--primary))]/8 text-[hsl(var(--primary))] shadow-sm ring-1 ring-[hsl(var(--primary))]/10'
                : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/4',
              'font-medium cursor-pointer',
            )}
            title={!isOpen ? item.label : undefined}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
                isItemOpen || isBranchActive
                  ? 'bg-[hsl(var(--primary))]/12'
                  : 'group-hover:bg-[hsl(var(--primary))]/8',
              )}
            >
              {renderIcon(item.icon, 'h-5 w-5')}
            </span>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.16 }}
                  className="flex-1 text-sm font-medium text-left whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {hasChildren && isOpen && (
              <motion.div
                animate={{ rotate: isItemOpen ? 180 : 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                className="flex items-center opacity-60"
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            )}
          </button>

          {/* Children Level 1 */}
          <AnimatePresence initial={false}>
            {isOpen && isItemOpen && hasChildren && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pl-3 ml-4 mt-1 space-y-1 border-l border-[hsl(var(--primary))]/10">
                  {item.children.map((child) => (
                    <MenuItem
                      key={child.id}
                      item={child}
                      level={1}
                      siblingIds={item.children
                        .filter((childItem) => childItem.children?.length)
                        .map((childItem) => childItem.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 1) {
      // Item principal (com ou sem filhos)
      const hasGrandchildren = hasChildren;

      if (item.path && !hasGrandchildren) {
        // Link direto
        return (
          <Link
            to={item.path}
            className={cn(
              'flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-all',
              isActive
                ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] shadow-sm'
                : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5',
            )}
          >
            {renderIcon(item.icon, 'h-4 w-4')}
            <span className="font-normal">{item.label}</span>
          </Link>
        );
      }

      // Subgrupo com children (Level 2)
      return (
        <div className="space-y-0.5">
          <button
            type="button"
            onClick={() => toggleItem(item, currentLevelSiblingIds)}
            aria-expanded={isItemOpen}
            className={cn(
              'flex items-center w-full gap-2 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
              isItemOpen || isBranchActive
                ? 'bg-[hsl(var(--primary))]/6 text-[hsl(var(--primary))]'
                : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/4',
            )}
          >
            {renderIcon(item.icon, 'h-4 w-4')}
            <span className="flex-1 text-left font-normal">{item.label}</span>
            {hasGrandchildren && (
              <motion.div
                animate={{ rotate: isItemOpen ? 180 : 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="flex items-center opacity-50"
              >
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            )}
          </button>

          {/* Children Level 2 */}
          <AnimatePresence initial={false}>
            {isItemOpen && hasGrandchildren && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                <div className="pl-3 ml-3 mt-1 space-y-1 border-l border-[hsl(var(--primary))]/10">
                  {item.children.map((grandchild) => (
                    <MenuItem key={grandchild.id} item={grandchild} level={2} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    if (level === 2) {
      // Link final (sem filhos possíveis)
      return (
        <Link
          to={item.path}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all',
            isActive
              ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
              : 'text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/5',
          )}
        >
          {item.icon && renderIcon(item.icon, 'h-3 w-3')}
          <span className="font-normal">{item.label}</span>
        </Link>
      );
    }
  };

  return (
    <motion.aside
      className={cn(
        'flex flex-col bg-white/99 backdrop-blur border-r border-[hsl(var(--primary))]/5 shadow-sm h-screen z-40',
        isOpen ? 'w-64' : 'w-[4.2rem]',
      )}
      animate={{ width: isOpen ? 256 : 68 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
    >
      {/* LOGO */}
      <div className="flex items-center justify-between h-16 border-b border-[hsl(var(--primary))]/5 px-3 bg-white/70 backdrop-blur">
        <motion.div
          animate={{ scale: isOpen ? 1 : 0.85 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="flex items-center gap-2"
        >
          <img src={logoG} className="w-9 h-9 rounded-lg" alt="Gesclinic" />
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="font-bold text-[hsl(var(--primary))] text-lg whitespace-nowrap"
              >
                Gesclinic
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* MENU */}
      <nav 
        ref={navRef}
        onScroll={rememberNavScroll}
        onPointerDownCapture={rememberNavScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-[hsl(var(--primary))]/20 scrollbar-track-[hsl(var(--primary))]/5 hover:scrollbar-thumb-[hsl(var(--primary))]/40 py-3 px-2 space-y-1"
        style={{ scrollPaddingTop: '0', scrollBehavior: 'auto' }}
      >
        {isOpen && Object.keys(openItems).length > 0 && (
          <button
            type="button"
            onClick={() => {
              rememberNavScroll();
              setOpenItems({});
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[hsl(var(--primary))]/60 hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/4 transition-all duration-200 mb-2"
          >
            <ChevronUp className="h-3 w-3" />
            {isOpen && <span>Recolher Tudo</span>}
          </button>
        )}
        {menu && menu.length > 0 ? (
          menu.map((item) => <MenuItem key={item.id} item={item} level={0} />)
        ) : (
          <div className="px-3 py-4 text-xs text-[hsl(var(--primary))]/60 text-center">
            <p>Nenhum menu disponível</p>
            <p className="mt-1 text-[10px]">Role: {currentRole || 'não definida'}</p>
          </div>
        )}
      </nav>

      {/* LOGOUT */}
      <motion.div
        className="border-t border-[hsl(var(--primary))]/5 p-3 bg-white/50 backdrop-blur"
        animate={{ padding: isOpen ? 12 : 8 }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
      >
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={handleLogout}
          className={cn(
            'w-full text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/10 transition-all duration-200',
            'flex items-center gap-3 px-3 py-2 rounded-lg font-medium',
            'hover:shadow-sm',
            !isOpen && 'justify-center p-2',
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <AnimatePresence mode="wait">
            {isOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                Sair
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* BOTÃO TOGGLE */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        className="absolute -right-3 top-16 w-7 h-7 rounded-full bg-white shadow-md border border-[hsl(var(--primary))]/15 hover:shadow-lg transition-all duration-200 flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: isOpen ? 0 : 180 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
        >
          {isOpen ? (
            <ChevronLeft className="h-4 w-4 text-[hsl(var(--primary))]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[hsl(var(--primary))]" />
          )}
        </motion.div>
      </motion.button>
    </motion.aside>
  );
}
