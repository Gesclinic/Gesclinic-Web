import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { useSavedFilters } from '@/hooks/useSavedFilters';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Info,
  Pencil,
  Paperclip,
  AlertTriangle,
  Clock,
  CalendarDays,
  CircleDollarSign,
  Download,
  Filter,
  Check,
  AlertCircle,
  Save,
} from 'lucide-react';
import SummaryCards from '@/components/clinica/financeiro/SummaryCards';
import { SaveFilterDialog } from '@/components/clinica/financeiro/SaveFilterDialog';
import { formatBRL } from '@/utils/formatters/formatCurrency';
import { toDate, todayStart } from '@/utils/helpers/dateUtils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useClinicContext } from '@/contexts/useClinicContext';
import { supabase } from '@/lib/customSupabaseClient';
import {
  listAPQuery,
  deleteAP,
  deleteAPBulk,
  updateAPBulk,
  payAccountsPayableBatch,
  listAccountPlans,
  listVendorNames,
  listPaymentMethods,
} from '@/lib/financeApi';
import { parseSearchGeneral, parcelLabel } from '@/utils/helpers/financeHelpers';
import StatusBadge from '@/components/clinica/financeiro/StatusBadge';
import { useDataCache, CacheManager } from '@/hooks/useDataCache';
import { usePagination } from '@/hooks/usePagination';
import RelatoriosToolbar from '@/components/financeiro/RelatoriosToolbar';

// Memoized APRow component - prevents re-renders when parent updates
const APRow = React.memo(
  ({
    item,
    expanded,
    toggleExpanded,
    isOverdue,
    costCenterMap,
    setViewItem,
    setViewDialogOpen,
    handleDelete,
    navigate,
    selected,
    setSelected,
    parcelLabel,
  }) => (
    <React.Fragment key={item.id}>
      <tr className={`${isOverdue(item) ? 'bg-red-50' : ''} border-b`}>
        <td className="px-3 py-3 w-[26%] truncate text-left">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              className="text-gray-600 hover:text-gray-800"
              onClick={() => toggleExpanded(item.id)}
            >
              {expanded.has(item.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {item.description ? (
              <button
                className="text-blue-600 hover:underline"
                onClick={() => {
                  setViewItem(item);
                  setViewDialogOpen(true);
                }}
              >
                {item.description}
              </button>
            ) : (
              '-'
            )}
          </div>
        </td>
        <td className="px-3 py-3 w-[20%] truncate text-left">{item.vendor_name || '-'}</td>
        <td className="px-3 py-3 w-[14%] hidden md:table-cell truncate text-left">
          {item.category_id ? costCenterMap[item.category_id] || '—' : '—'}
        </td>
        <td
          className={`px-3 py-3 w-[12%] ${isOverdue(item) ? 'text-red-600' : ''} whitespace-nowrap text-left`}
        >
          {item.due_date ? new Date(item.due_date).toLocaleDateString('pt-BR') : '-'}
        </td>
        <td className="px-3 py-3 w-[12%] font-semibold whitespace-nowrap text-right">
          {formatBRL(item.amount)}
        </td>
        <td className="px-3 py-3 w-[10%] text-left">
          <StatusBadge
            status={isOverdue(item) ? 'overdue' : (item.status || 'open').toLowerCase()}
          />
        </td>
        <td className="px-3 py-3 w-[6%] text-center flex justify-center items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate(`/clinica/financeiro/pagar/${item.id}/editar`)}
          >
            <Pencil className="w-4 h-4 text-gray-700" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </Button>
          <Checkbox
            className="h-4 w-4"
            checked={selected.has(item.id)}
            onCheckedChange={(v) => {
              setSelected((prev) => {
                const next = new Set(prev);
                if (v) {
                  next.add(item.id);
                } else {
                  next.delete(item.id);
                }
                return next;
              });
            }}
          />
        </td>
      </tr>
      <tr className="bg-gray-50 border-b" aria-expanded={expanded.has(item.id)}>
        <td colSpan="7" className="px-4 py-2">
          <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm overflow-hidden transition-all duration-300 ease-in-out ${expanded.has(item.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
          >
            <div>
              <div className="text-xs text-gray-500">Emissão</div>
              <div>
                {item.issue_date ? new Date(item.issue_date).toLocaleDateString('pt-BR') : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">NF/Documento</div>
              <div className="flex items-center gap-2">
                <span>{item.document_number || '—'}</span>
                {item.document_url && (
                  <a
                    href={item.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir anexo"
                    className="text-gray-600 hover:text-blue-600"
                  >
                    <Paperclip className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Centro de custo</div>
              <div>{item.category_id ? costCenterMap[item.category_id] || '—' : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Método</div>
              <div>{item.payment_method || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Parcela</div>
              <div>{parcelLabel(item)}</div>
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <div className="text-xs text-gray-500">Observações</div>
              <div className="text-gray-700">{item.notes || '—'}</div>
            </div>
          </div>
        </td>
      </tr>
    </React.Fragment>
  ),
  (prevProps, nextProps) => {
    // Custom comparison: only re-render if critical item data or expanded state changes
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.item.status === nextProps.item.status &&
      prevProps.item.amount === nextProps.item.amount &&
      prevProps.item.due_date === nextProps.item.due_date &&
      prevProps.expanded.has(prevProps.item.id) === nextProps.expanded.has(nextProps.item.id)
    );
  },
);

APRow.displayName = 'APRow';

export default function ContasPagar() {
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs([
    { label: 'Financeiro', path: '/clinica/financeiro' },
    { label: 'Contas a Pagar' },
  ]);

  const { toast } = useToast();
  const { clinicId, loadingClinic } = useClinicContext();

  const [form, setForm] = useState({
    vendor_name: '',
    supplier_id: '',
    description: '',
    due_date: '',
    amount: '',
    notes: '',
    payment_method: '',
    installments: '',
    document_number: '',
    status: 'open',
    category_id: '',
  });
  // Itens (opcionais) para compor a conta e calcular impostos
  const [formItems, setFormItems] = useState([]); // { name, qty, unit, taxPct }
  const [isInstallment, setIsInstallment] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  // Prazo de vencimento (padrões e personalizados)
  const [paymentTermsOptions, setPaymentTermsOptions] = useState([
    'À vista (0)',
    '15 dias',
    '30 dias',
    '45 dias',
    '60 dias',
    '90 dias',
    '30/60',
    '30/60/90',
  ]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [termDaysPattern, setTermDaysPattern] = useState(null); // ex.: [30,60,90]

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [autoSelectNext, setAutoSelectNext] = useState(false);
  const [costCenterDialogOpen, setCostCenterDialogOpen] = useState(false);
  const [costCenterId, setCostCenterId] = useState('');
  const [costCenters, setCostCenters] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedFavorite, setSelectedFavorite] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [expanded, setExpanded] = useState(new Set());

  // Options loaded from API or user additions
  const [vendorOptions, setVendorOptions] = useState([]);
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([]);

  // Favorites save dialog state
  const [saveFavDialogOpen, setSaveFavDialogOpen] = useState(false);
  const [favName, setFavName] = useState('');
  const [overwriteKey, setOverwriteKey] = useState('');

  // View/Edit dialogs and related form state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewItem, setViewItem] = useState(null);

  const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filtros
  const [vendorFilter, setVendorFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [startFilter, setStartFilter] = useState('');
  const [endFilter, setEndFilter] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [amountMinFilter, setAmountMinFilter] = useState('');
  const [amountMaxFilter, setAmountMaxFilter] = useState('');
  const [sortBy, setSortBy] = useState('due_date');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);

  // Hook para gerenciar filtros salvos
  const { savedFilters, saveFilter, deleteFilter, getFilter } = useSavedFilters('contas_pagar_filters');
  const fmtBR = (iso) => {
    if (!iso) {
      return '';
    }
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const isOverdue = (it) => {
    const d = toDate(it?.due_date);
    if (!d) {
      return false;
    }
    const status = (it.status || 'open').toLowerCase();
    if (status === 'paid' || status === 'canceled') {
      return false;
    }
    return d < todayStart();
  };

  // Status badge and parcel label provided by helpers

  const sortIndicator = (field) => {
    if (sortBy !== field) {
      return (
        <span className="inline-block align-middle opacity-40">
          <ChevronUp className="w-3 h-3" />
        </span>
      );
    }
    return sortDir === 'asc' ? (
      <ChevronUp className="w-3 h-3 inline-block align-middle" />
    ) : (
      <ChevronDown className="w-3 h-3 inline-block align-middle" />
    );
  };

  const apiOrderBy = (sb) => sb;

  const paymentMethodSuggestions = useMemo(
    () => ['PIX', 'Cartão', 'Dinheiro', 'Transferência', 'Boleto'],
    [],
  );

  // Busca geral agora via helper parseSearchGeneral

  const triggerLoad = useCallback((autoSelect = false) => {
    console.log('[ContasPagar] triggerLoad chamado com clinicId:', clinicId);
    const adv = parseSearchGeneral(searchFilter);
    loadBills({
      clinicId,
      vendor: vendorFilter,
      paymentMethod: paymentMethodFilter,
      start: startFilter || null,
      end: endFilter || null,
      search: adv.clean,
      status: adv.statusText ?? (statusFilter || null),
      searchAmountEq: adv.amountEq,
      amountMin: amountMinFilter || null,
      amountMax: amountMaxFilter || null,
      searchDateIso: adv.dateIso || null,
      categoryId: costCenterFilter || null,
      orderBy: apiOrderBy(sortBy),
      orderDir: sortDir,
      autoSelect,
    });
  }, [
    clinicId,
    loadBills,
    searchFilter,
    vendorFilter,
    paymentMethodFilter,
    startFilter,
    endFilter,
    statusFilter,
    amountMinFilter,
    amountMaxFilter,
    costCenterFilter,
    sortBy,
    sortDir,
  ]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
    triggerLoad(false);
  };

  // Memoized toggleExpanded handler to prevent re-renders
  const toggleExpanded = useCallback((id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Favorites persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ap_filter_favorites');
      if (raw) {
        setFavorites(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // 💾 Cache para metadata (categorias/contas, fornecedores, métodos de pagamento)
  const {
    data: cachedMetadata,
    loading: metadataLoading,
    refresh: refreshMetadata,
  } = useDataCache({
    key: `contas_pagar_metadata_${clinicId}`,
    fetcher: async () => {
      console.log('[ContasPagar] Iniciando carregamento de metadata com clinicId:', clinicId);
      if (!clinicId) {
        console.log('[ContasPagar] Sem clinicId, pulando metadata');
        return { costCenters: [], vendors: [], paymentMethods: [] };
      }
      const [costCentersData, vendorNames, paymentMethodsData] = await Promise.all([
        listAccountPlans(clinicId).catch((err) => {
          console.error('[ContasPagar] Erro em listAccountPlans:', err.message);
          return [];
        }),
        listVendorNames(clinicId).catch((err) => {
          console.error('[ContasPagar] Erro em listVendorNames:', err.message);
          return [];
        }),
        listPaymentMethods(clinicId).catch((err) => {
          console.error('[ContasPagar] Erro em listPaymentMethods:', err.message);
          return [];
        }),
      ]);
      console.log('[ContasPagar] Metadata carregada:', {
        costCenters: costCentersData?.length || 0,
        vendors: vendorNames?.length || 0,
        paymentMethods: paymentMethodsData?.length || 0,
      });
      return {
        costCenters: Array.isArray(costCentersData) ? costCentersData : [],
        vendors: Array.isArray(vendorNames) ? vendorNames : [],
        paymentMethods: Array.isArray(paymentMethodsData) ? paymentMethodsData : [],
      };
    },
    ttl: 15 * 60 * 1000, // 15 minutos (metadata muda raramente)
    enabled: !!clinicId,
  });

  // Sincronizar metadata em cache
  useEffect(() => {
    if (cachedMetadata) {
      setCostCenters(cachedMetadata.costCenters);
      setVendorOptions(cachedMetadata.vendors);
      setPaymentMethodOptions(cachedMetadata.paymentMethods);
    }
  }, [cachedMetadata]);

  // Map de centro de custo para exibição rápida
  const costCenterMap = useMemo(() => {
    const map = {};
    for (const c of costCenters) {
      map[c.id] = c.name;
    }
    return map;
  }, [costCenters]);

  const mergedPaymentMethods = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const m of paymentMethodSuggestions) {
      const t = m.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    for (const m of paymentMethodOptions) {
      const t = (m || '').trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
    return out;
  }, [paymentMethodSuggestions, paymentMethodOptions]);

  // Server-side sorting now supports category_name via view; no local re-sort needed
  const sortedItems = useMemo(() => items, [items]);

  // Memoized summary calculations to avoid recalculation on unrelated state changes
  const itemsSummary = useMemo(() => {
    const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const overdue = items.filter((it) => isOverdue(it)).length;
    const paid = items.filter((it) => (it.status || '').toLowerCase() === 'paid').length;
    const open = items.filter((it) => (it.status || '').toLowerCase() === 'open').length;
    return { total, overdue, paid, open, count: items.length };
  }, [items, isOverdue]);

  // Enhanced summary with amounts for visual cards
  const summaryVisual = useMemo(() => {
    const total = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const paidAmount = items
      .filter((it) => (it.status || '').toLowerCase() === 'paid')
      .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const pendingAmount = items
      .filter((it) => (it.status || '').toLowerCase() !== 'paid')
      .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const overdueAmount = items
      .filter((it) => isOverdue(it))
      .reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const paidCount = items.filter((it) => (it.status || '').toLowerCase() === 'paid').length;
    const pendingCount = items.filter((it) => (it.status || '').toLowerCase() !== 'paid').length;
    const overdueCount = items.filter((it) => isOverdue(it)).length;
    return {
      total,
      paidAmount,
      pendingAmount,
      overdueAmount,
      paidCount,
      pendingCount,
      overdueCount,
    };
  }, [items, isOverdue]);

  // Debug log
  useEffect(() => {
    console.log('[ContasPagar] Estado atual:', {
      clinicId,
      loadingClinic,
      loading,
      itemsCount: items.length,
      summaryVisual
    });
  }, [items, loading, clinicId, loadingClinic, summaryVisual]);

  // 📄 Pagination: 30 items per page
  const {
    items: paginatedItems,
    pageNum,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  } = usePagination(sortedItems, 30);

  // Extrai resumo da NF a partir de notes (quando visualizando registro já salvo)
  const parseNfSummaryFromNotes = useCallback((notes) => {
    const res = { itemsCount: null, subtotal: null, taxesTotal: null, totalAfter: null, taxes: {} };
    if (!notes || typeof notes !== 'string') {
      return res;
    }
    try {
      const itemsBlockIdx = notes.indexOf('Itens:');
      if (itemsBlockIdx >= 0) {
        const block = notes.substring(itemsBlockIdx);
        const countMatch = block.match(/\b(\d+)\)\s/g);
        res.itemsCount = countMatch ? countMatch.length : null;
        const subtotalMatch = block.match(/Subtotal:\s*([0-9]+(?:\.[0-9]{1,2})?)/);
        if (subtotalMatch) {
          res.subtotal = Number(subtotalMatch[1]);
        }
        const taxesLine = block.match(
          /Impostos\s*\(NF\):([^|]+)\|\s*Total=([0-9]+(?:\.[0-9]{1,2})?)/,
        );
        if (taxesLine) {
          const taxesStr = taxesLine[1];
          const totalTaxNum = Number(taxesLine[2]);
          res.taxesTotal = Number.isFinite(totalTaxNum) ? totalTaxNum : null;
          const map = {};
          const parseTax = (label) => {
            const m = taxesStr.match(
              new RegExp(label + '\\s*[^=]*=\\s*([0-9]+(?:\\.[0-9]{1,2})?)'),
            );
            if (m) {
              map[label] = Number(m[1]);
            }
          };
          ['IR', 'CSLL', 'PIS/COFINS', 'ISS', 'ICMS'].forEach(parseTax);
          res.taxes = map;
        }
        const totalAfterMatch = block.match(
          /Total\s*\(após\s*impostos[^)]*\):\s*([0-9]+(?:\.[0-9]{1,2})?)/,
        );
        if (totalAfterMatch) {
          res.totalAfter = Number(totalAfterMatch[1]);
        }
      }
    } catch {}
    return res;
  }, []);

  // Totais derivados dos itens
  const itemsSubtotal = useMemo(() => {
    return (formItems || []).reduce((sum, it) => {
      const q = Number(it?.qty || 0);
      const u = Number(it?.unit || 0);
      return sum + q * u;
    }, 0);
  }, [formItems]);
  // Impostos da NF (separados)
  const [nfTaxes, setNfTaxes] = useState({
    irPct: 0,
    csllPct: 0,
    pisCofinsPct: 0,
    issPct: 0,
    icmsPct: 0,
    retained: true,
  });
  const nfTaxAmounts = useMemo(() => {
    const base = itemsSubtotal;
    const ir = base * (Number(nfTaxes.irPct || 0) / 100);
    const csll = base * (Number(nfTaxes.csllPct || 0) / 100);
    const pisCofins = base * (Number(nfTaxes.pisCofinsPct || 0) / 100);
    const iss = base * (Number(nfTaxes.issPct || 0) / 100);
    const icms = base * (Number(nfTaxes.icmsPct || 0) / 100);
    return { ir, csll, pisCofins, iss, icms };
  }, [itemsSubtotal, nfTaxes]);
  const itemsTaxTotal = useMemo(() => {
    const { ir, csll, pisCofins, iss, icms } = nfTaxAmounts;
    return ir + csll + pisCofins + iss + icms;
  }, [nfTaxAmounts]);
  const itemsGrandTotal = useMemo(() => {
    const base = itemsSubtotal;
    const tax = itemsTaxTotal;
    const total = nfTaxes.retained ? base - tax : base + tax;
    return Number(total.toFixed(2));
  }, [itemsSubtotal, itemsTaxTotal, nfTaxes]);

  // Sincroniza o campo Valor com o total de itens (quando houver itens)
  useEffect(() => {
    if ((formItems || []).length > 0) {
      setForm((f) => ({ ...f, amount: String(itemsGrandTotal) }));
    }
  }, [formItems, itemsGrandTotal]);

  const saveFavorite = () => {
    setSaveFilterDialogOpen(true);
  };

  const handleSaveFilter = (name) => {
    const filterData = {
      vendorFilter,
      paymentMethodFilter,
      startFilter,
      endFilter,
      searchFilter,
      statusFilter,
      amountMinFilter,
      amountMaxFilter,
      costCenterFilter,
      sortBy,
      sortDir,
    };
    saveFilter(name, filterData);
  };

  const handleLoadFilter = (name) => {
    const filterData = getFilter(name);
    if (filterData) {
      setVendorFilter(filterData.vendorFilter || '');
      setPaymentMethodFilter(filterData.paymentMethodFilter || '');
      setStartFilter(filterData.startFilter || '');
      setEndFilter(filterData.endFilter || '');
      setSearchFilter(filterData.searchFilter || '');
      setStatusFilter(filterData.statusFilter || '');
      setAmountMinFilter(filterData.amountMinFilter || '');
      setAmountMaxFilter(filterData.amountMaxFilter || '');
      setCostCenterFilter(filterData.costCenterFilter || '');
      setSortBy(filterData.sortBy || 'due_date');
      setSortDir(filterData.sortDir || 'asc');
      triggerLoad(true);
    }
  };

  const applyFavorite = () => {
    const fav = favorites.find((f) => f.name === selectedFavorite);
    if (!fav) {
      return;
    }
    setVendorFilter(fav.vendorFilter || '');
    setPaymentMethodFilter(fav.paymentMethodFilter || '');
    setStartFilter(fav.startFilter || '');
    setEndFilter(fav.endFilter || '');
    setSearchFilter(fav.searchFilter || '');
    setStatusFilter(fav.statusFilter || '');
    setAmountMinFilter(fav.amountMinFilter || '');
    setAmountMaxFilter(fav.amountMaxFilter || '');
    setCostCenterFilter(fav.costCenterFilter || '');
    setSortBy(fav.sortBy || 'due_date');
    setSortDir(fav.sortDir || 'asc');
    triggerLoad(true);
  };

  const loadBills = useCallback(
    async ({
      clinicId: cId,
      vendor,
      paymentMethod,
      start,
      end,
      search,
      status,
      amountMin,
      amountMax,
      categoryId,
      searchDateIso,
      orderBy,
      orderDir,
      autoSelect = false,
    } = {}) => {
      if (!cId) {
        console.log('[ContasPagar] loadBills: clinicId não fornecido, retornando silenciosamente');
        return;
      }
      console.log('[ContasPagar] loadBills: iniciando com clinicId:', cId);
      setLoading(true);
      try {
        const statusLower = status ? String(status).toLowerCase() : '';
        const isOverdueSelected = statusLower === 'overdue' || statusLower === 'vencida';
        const statusForQuery = isOverdueSelected ? null : status;
        const data = await listAPQuery({
          clinicId: cId,
          vendor,
          paymentMethod,
          start,
          end,
          search,
          statusText: statusForQuery,
          amountMin,
          amountMax,
          categoryId,
          searchDateIso,
          orderBy,
          orderDir,
        });
        console.log('[ContasPagar] listAPQuery retornou:', data?.length || 0, 'itens');
        if (isOverdueSelected) {
          const filtered = Array.isArray(data) ? data.filter((it) => isOverdue(it)) : [];
          setItems(filtered);
          if (autoSelect && Array.isArray(data)) {
            setSelected(new Set(filtered.map((d) => d.id)));
          }
        } else {
          setItems(data || []);
          if (autoSelect && Array.isArray(data)) {
            setSelected(new Set(data.map((d) => d.id)));
          }
        }
        if (autoSelect) {
          setAutoSelectNext(false);
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar contas',
          description: error.message,
        });
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Carrega inicialmente e quando a clínica muda
  useEffect(() => {
    console.log('[ContasPagar] useEffect(clinicId) acionado com clinicId:', clinicId, 'loadingClinic:', loadingClinic);
    if (clinicId && !loadingClinic) {
      triggerLoad(false);
    }
  }, [clinicId, loadingClinic, triggerLoad]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Legacy creation handler removido: criação agora ocorre na página Nova Conta

  const handleDelete = async (id) => {
    const ok = window.confirm('Excluir esta conta a pagar? Esta ação não pode ser desfeita.');
    if (!ok) {
      return;
    }
    try {
      await deleteAP(id);
      toast({ title: 'Conta excluída' });

      // Invalidar cache de metadata
      refreshMetadata();

      loadBills({
        clinicId,
        vendor: vendorFilter,
        start: startFilter || null,
        end: endFilter || null,
        search: searchFilter,
        autoSelect: false,
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: error.message });
    }
  };

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Contas a Pagar"
      subtitle="Gerencie as despesas e pagamentos pendentes."
      actions={
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            className="bg-primary text-white hover:opacity-90"
            onClick={() => navigate('/clinica/financeiro/pagar/nova')}
          >
            <Plus className="w-4 h-4 mr-2" /> Nova Conta
          </Button>
          <span className="text-sm text-gray-600">Selecionados: {selected.size}</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">Ações em lote</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setCostCenterDialogOpen(true)}>
                Alterar centro de custo
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  const ids = Array.from(selected);
                  const rows = items.filter((it) => ids.includes(it.id));
                  const headers = [
                    'Descrição',
                    'Fornecedor',
                    'Vencimento',
                    'Status',
                    'Valor',
                    'ID',
                  ];
                  const toCsvRow = (r) =>
                    [
                      r.description || '',
                      r.vendor_name || '',
                      r.due_date || '',
                      r.status || '',
                      String(r.amount ?? ''),
                      r.id,
                    ].map((v) => String(v).replace(/"/g, '""'));
                  const csv = [
                    headers.join(','),
                    ...rows.map((r) => '"' + toCsvRow(r).join('","') + '"'),
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `contas_pagar_export_${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Gerar comprovante (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={async () => {
                  const ids = Array.from(selected);
                  if (ids.length === 0) {
                    return;
                  }
                  try {
                    const { updated } = await updateAPBulk(ids, { status: 'paid' });
                    toast({ title: 'Atualizado', description: `${updated} marcado(s) como pago.` });

                    // Invalidar cache
                    refreshMetadata();
                  } catch (e) {
                    toast({
                      title: 'Falha ao atualizar',
                      description: String(e.message || e),
                      variant: 'destructive',
                    });
                  }
                  triggerLoad(false);
                }}
              >
                Marcar como paga
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={async () => {
                  const ids = Array.from(selected);
                  if (ids.length === 0) {
                    return;
                  }
                  const ok = window.confirm(`Excluir ${ids.length} conta(s) selecionada(s)?`);
                  if (!ok) {
                    return;
                  }
                  try {
                    const { deleted } = await deleteAPBulk(ids);
                    toast({ title: 'Exclusão concluída', description: `${deleted} removida(s).` });

                    // Invalidar cache
                    refreshMetadata();
                  } catch (e) {
                    toast({
                      title: 'Falha ao excluir',
                      description: String(e.message || e),
                      variant: 'destructive',
                    });
                  }
                  triggerLoad(false);
                }}
              >
                Excluir selecionados
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      }
    >
      <div className="max-w-full w-full px-3 md:px-4">
        {/* 📊 RESUMO VISUAL */}
        <div className="grid md:grid-cols-4 gap-4 mb-6 mt-4">
          <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold text-blue-600">
                  {currency.format(summaryVisual.total)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{items.length} contas</p>
              </div>
              <CircleDollarSign className="w-8 h-8 text-blue-400" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pago</p>
                <p className="text-2xl font-bold text-green-600">
                  {currency.format(summaryVisual.paidAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summaryVisual.paidCount} contas</p>
              </div>
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pendente</p>
                <p className="text-2xl font-bold text-orange-600">
                  {currency.format(summaryVisual.pendingAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summaryVisual.pendingCount} contas</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vencido</p>
                <p className="text-2xl font-bold text-red-600">
                  {currency.format(summaryVisual.overdueAmount)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{summaryVisual.overdueCount} contas</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </Card>
        </div>

        {/* RELATÓRIOS TOOLBAR */}
        <RelatoriosToolbar
          title="Contas a Pagar"
          data={items.map(item => ({
            descricao: item.description,
            fornecedor: item.vendor_name,
            vencimento: item.due_date,
            status: item.status,
            valor: item.amount,
            centro_custo: item.cc_name || '-'
          }))}
          columns={[
            { key: 'descricao', label: 'Descrição', width: 25 },
            { key: 'fornecedor', label: 'Fornecedor', width: 20 },
            { key: 'vencimento', label: 'Vencimento', width: 12 },
            { key: 'status', label: 'Status', width: 12 },
            { key: 'valor', label: 'Valor', width: 15, format: 'currency' },
            { key: 'centro_custo', label: 'Centro de Custo', width: 16 }
          ]}
          templateFileName="contas_pagar"
        />

        <Card className="p-4 w-full">
          {/* 🔍 FILTROS COM COLLAPSE */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Filter className="w-4 h-4" /> Filtros avançados
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showFilters ? '▼ Ocultar' : '▶ Mostrar'}
            </button>
          </div>

          {showFilters ? (
            <div>
              {/* LINHA 1: Fornecedor, Centro de custo, Método */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
                <div>
                  <Label className="text-xs text-gray-600">Fornecedor</Label>
                  {vendorOptions.length > 0 ? (
                    <select
                      className="w-full border rounded h-8 px-2 text-sm"
                      value={vendorFilter}
                      onChange={(e) => setVendorFilter(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {vendorOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Fornecedor"
                      value={vendorFilter}
                      onChange={(e) => setVendorFilter(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Centro de custo</Label>
                  {costCenters.length > 0 ? (
                    <select
                      className="w-full border rounded h-8 px-2 text-sm"
                      value={costCenterFilter}
                      onChange={(e) => setCostCenterFilter(e.target.value)}
                    >
                      <option value="">Todos</option>
                      {costCenters
                        .filter((c) => (c.type || '').toLowerCase() === 'despesa' || !c.type)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Input
                      className="h-8 text-sm"
                      placeholder="Centro de custo"
                      value={costCenterFilter}
                      onChange={(e) => setCostCenterFilter(e.target.value)}
                    />
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Método</Label>
                  <select
                    className="w-full border rounded h-8 px-2 text-sm"
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {mergedPaymentMethods.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Status</Label>
                  <select
                    className="w-full border rounded h-8 px-2 text-sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="open">Em aberto</option>
                    <option value="paid">Pago</option>
                    <option value="scheduled">Agendada</option>
                    <option value="overdue">Vencida</option>
                    <option value="partial">Parcial</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* LINHA 2: Datas e Valores */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 pb-4 border-b">
                <div>
                  <Label className="text-xs text-gray-600">Vencimento de</Label>
                  <Input
                    className="h-8 text-sm"
                    type="date"
                    value={startFilter}
                    onChange={(e) => setStartFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Vencimento até</Label>
                  <Input
                    className="h-8 text-sm"
                    type="date"
                    value={endFilter}
                    onChange={(e) => setEndFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Valor (mín)</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    step="0.01"
                    value={amountMinFilter}
                    onChange={(e) => setAmountMinFilter(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-600">Valor (máx)</Label>
                  <Input
                    className="h-8 text-sm"
                    type="number"
                    step="0.01"
                    value={amountMaxFilter}
                    onChange={(e) => setAmountMaxFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* BARRA DE AÇÕES */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="bg-blue-600"
                  onClick={() => triggerLoad(autoSelectNext)}
                  disabled={loading}
                >
                  {loading ? 'Filtrando...' : 'Pesquisar'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setVendorFilter('');
                    setPaymentMethodFilter('');
                    setStartFilter('');
                    setEndFilter('');
                    setSearchFilter('');
                    setStatusFilter('');
                    setAmountMinFilter('');
                    setAmountMaxFilter('');
                    setCostCenterFilter('');
                    setAutoSelectNext(false);
                    loadBills({
                      clinicId,
                      vendor: '',
                      paymentMethod: '',
                      start: null,
                      end: null,
                      search: '',
                      status: null,
                      amountMin: null,
                      amountMax: null,
                      categoryId: null,
                      orderBy: apiOrderBy(sortBy),
                      orderDir: sortDir,
                      autoSelect: false,
                    });
                  }}
                >
                  Limpar
                </Button>

                {/* Salvar Filtro */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSaveFilterDialogOpen(true)}
                  disabled={loading}
                  title="Salvar configuração atual como filtro"
                >
                  <Save className="w-4 h-4" />
                </Button>

                {/* Carregar Filtro */}
                {savedFilters.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={loading}
                        title="Carregar um filtro salvo"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Filtros Salvos</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {savedFilters.map((filter) => (
                        <div key={filter.name} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100">
                          <button
                            onClick={() => handleLoadFilter(filter.name)}
                            className="flex-1 text-left text-sm hover:text-blue-600"
                          >
                            {filter.name}
                          </button>
                          <button
                            onClick={() => deleteFilter(filter.name)}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <Button size="sm" variant="ghost" className="ml-auto">
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              </div>

              {/* SaveFilterDialog */}
              <SaveFilterDialog
                open={saveFilterDialogOpen}
                onOpenChange={setSaveFilterDialogOpen}
                onSave={handleSaveFilter}
                existingNames={savedFilters.map((f) => f.name)}
                loading={loading}
              />
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <Search className="absolute w-4 h-4 left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Buscar fornecedor, descrição..."
                  className="pl-9"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                />
              </div>
              <Button size="sm" onClick={() => triggerLoad(false)} disabled={loading}>
                Buscar
              </Button>
            </div>
          )}
          {/* Favoritos: abaixo do Status em linha */}
          <div className="flex flex-wrap gap-2 items-center mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFavName(selectedFavorite || '');
                setOverwriteKey(selectedFavorite || '');
                setSaveFavDialogOpen(true);
              }}
              title="Salva os filtros atuais como favorito"
            >
              Salvar favorito
            </Button>
            <select
              className="border rounded h-8 px-2 text-sm"
              value={selectedFavorite}
              onChange={(e) => setSelectedFavorite(e.target.value)}
            >
              <option value="">Meus favoritos</option>
              {favorites.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={applyFavorite}
              disabled={!selectedFavorite}
              title="Carrega o filtro salvo e aplica na lista"
            >
              Carregar favorito
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (!selectedFavorite) {
                  toast({ variant: 'destructive', title: 'Selecione um favorito' });
                  return;
                }
                const newName = window.prompt('Novo nome para o favorito', selectedFavorite);
                if (!newName) {
                  return;
                }
                const trimmed = newName.trim();
                if (!trimmed) {
                  return;
                }
                const idx = favorites.findIndex((f) => f.name === selectedFavorite);
                if (idx < 0) {
                  return;
                }
                let list = [...favorites];
                if (list.some((f, i) => f.name === trimmed && i !== idx)) {
                  const ok = window.confirm(
                    'Já existe favorito com esse nome. Deseja sobrescrever?',
                  );
                  if (!ok) {
                    return;
                  }
                  list = list.filter((f, i) => !(f.name === trimmed && i !== idx));
                }
                list[idx] = { ...list[idx], name: trimmed };
                setFavorites(list);
                try {
                  localStorage.setItem('ap_filter_favorites', JSON.stringify(list));
                } catch {}
                setSelectedFavorite(trimmed);
                toast({
                  title: 'Favorito renomeado',
                  description: `${selectedFavorite} → ${trimmed}`,
                });
              }}
              disabled={!selectedFavorite}
            >
              Renomear
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!selectedFavorite) {
                  toast({ variant: 'destructive', title: 'Selecione um favorito' });
                  return;
                }
                const ok = window.confirm(`Excluir favorito "${selectedFavorite}"?`);
                if (!ok) {
                  return;
                }
                const list = favorites.filter((f) => f.name !== selectedFavorite);
                setFavorites(list);
                try {
                  localStorage.setItem('ap_filter_favorites', JSON.stringify(list));
                } catch {}
                setSelectedFavorite('');
                toast({ title: 'Favorito excluído' });
              }}
              disabled={!selectedFavorite}
            >
              Excluir
            </Button>
          </div>
          {startFilter && endFilter && (
            <div className="text-xs text-gray-500 mb-4">
              Período: {fmtBR(startFilter)} → {fmtBR(endFilter)}
            </div>
          )}

          {/* Presets de período */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Button
              variant="outline"
              onClick={() => {
                const today = new Date();
                const y = today.getFullYear(),
                  m = String(today.getMonth() + 1).padStart(2, '0'),
                  d = String(today.getDate()).padStart(2, '0');
                const iso = `${y}-${m}-${d}`;
                setStartFilter(iso);
                setEndFilter(iso);
                setAutoSelectNext(true);
              }}
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const end = new Date();
                const start = new Date();
                start.setDate(start.getDate() - 6);
                const fmt = (dt) =>
                  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                setStartFilter(fmt(start));
                setEndFilter(fmt(end));
                setAutoSelectNext(true);
              }}
            >
              Últimos 7 dias
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const fmt = (dt) =>
                  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
                setStartFilter(fmt(start));
                setEndFilter(fmt(end));
                setAutoSelectNext(true);
              }}
            >
              Este mês
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStartFilter('');
                setEndFilter('');
              }}
            >
              Limpar período
            </Button>
          </div>

          {/* Resumo financeiro */}
          <SummaryCards items={items} startFilter={startFilter} endFilter={endFilter} />

          <div className="overflow-x-visible">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th
                    className="text-left px-3 py-2 w-[26%] cursor-pointer"
                    onClick={() => toggleSort('description')}
                  >
                    Descrição {sortIndicator('description')}
                  </th>
                  <th
                    className="text-left px-3 py-2 w-[20%] cursor-pointer"
                    onClick={() => toggleSort('vendor_name')}
                  >
                    Fornecedor {sortIndicator('vendor_name')}
                  </th>
                  <th
                    className="text-left px-3 py-2 w-[14%] hidden md:table-cell cursor-pointer"
                    onClick={() => toggleSort('category_name')}
                  >
                    Centro de custo {sortIndicator('category_name')}
                  </th>
                  <th
                    className="text-left px-3 py-2 w-[12%] cursor-pointer whitespace-nowrap"
                    onClick={() => toggleSort('due_date')}
                  >
                    Vencimento {sortIndicator('due_date')}
                  </th>
                  <th
                    className="text-right px-3 py-2 w-[12%] cursor-pointer whitespace-nowrap"
                    onClick={() => toggleSort('amount')}
                  >
                    Valor {sortIndicator('amount')}
                  </th>
                  <th className="text-left px-3 py-2 w-[10%]">Status</th>
                  <th className="px-3 py-2 w-[6%]">
                    <span className="inline-flex items-center justify-center gap-2 w-full">
                      Ações
                      <Checkbox
                        className="h-4 w-4"
                        checked={
                          paginatedItems.length > 0 &&
                          paginatedItems.every((it) => selected.has(it.id))
                        }
                        onCheckedChange={(v) => {
                          if (v) {
                            setSelected(new Set(paginatedItems.map((it) => it.id)));
                          } else {
                            setSelected(new Set());
                          }
                        }}
                      />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-gray-500">
                      Nenhuma conta registrada.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it) => (
                    <APRow
                      key={it.id}
                      item={it}
                      expanded={expanded}
                      toggleExpanded={toggleExpanded}
                      isOverdue={isOverdue}
                      costCenterMap={costCenterMap}
                      setViewItem={setViewItem}
                      setViewDialogOpen={setViewDialogOpen}
                      handleDelete={handleDelete}
                      navigate={navigate}
                      selected={selected}
                      setSelected={setSelected}
                      parcelLabel={parcelLabel}
                    />
                  ))
                )}
              </tbody>
            </table>

            {/* 📄 Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-gray-600">
                  Página <span className="font-semibold">{pageNum + 1}</span> de{' '}
                  <span className="font-semibold">{totalPages}</span>({sortedItems.length} contas)
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={prevPage} disabled={pageNum === 0}>
                    ← Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageIndex = i;
                      if (totalPages > 5 && pageNum > 2) {
                        pageIndex = pageNum - 2 + i;
                      }
                      if (pageIndex >= totalPages) {
                        return null;
                      }
                      return (
                        <Button
                          key={pageIndex}
                          size="sm"
                          variant={pageNum === pageIndex ? 'default' : 'outline'}
                          onClick={() => goToPage(pageIndex)}
                        >
                          {pageIndex + 1}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={nextPage}
                    disabled={pageNum >= totalPages - 1}
                  >
                    Próximo →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Dialog Nova Conta (AP) removido: a criação agora acontece na página dedicada */}

      {/* Helpers */}
      {/* Nota: parcela mostrada como i/N se constar em notes; caso contrário exibe número simples */}

      {/* Dialog Alterar Centro de Custo */}
      <Dialog open={costCenterDialogOpen} onOpenChange={setCostCenterDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Alterar centro de custo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Centro de custo</Label>
            {costCenters.length > 0 ? (
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {costCenters
                  .filter((c) => (c.type || '').toLowerCase() === 'despesa' || !c.type)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            ) : (
              <Input
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                placeholder="UUID do centro de custo"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostCenterDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                const ids = Array.from(selected);
                if (ids.length === 0 || !costCenterId) {
                  setCostCenterDialogOpen(false);
                  return;
                }
                try {
                  const { updated } = await updateAPBulk(ids, { category_id: costCenterId });
                  toast({
                    title: 'Centro de custo atualizado',
                    description: `${updated} conta(s) atualizada(s).`,
                  });

                  // Invalidar cache
                  refreshMetadata();
                } catch (e) {
                  toast({
                    title: 'Falha ao atualizar centro de custo',
                    description: String(e.message || e),
                    variant: 'destructive',
                  });
                }
                setCostCenterDialogOpen(false);
                triggerLoad(false);
              }}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Salvar Favorito */}
      <Dialog open={saveFavDialogOpen} onOpenChange={setSaveFavDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Salvar favorito</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Favorito existente (opcional)</Label>
              <select
                className="w-full border rounded h-9 px-2 text-sm"
                value={overwriteKey}
                onChange={(e) => {
                  setOverwriteKey(e.target.value);
                  setFavName(e.target.value || '');
                }}
              >
                <option value="">— Nenhum —</option>
                {favorites.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Nome do favorito</Label>
              <Input
                value={favName}
                onChange={(e) => setFavName(e.target.value)}
                placeholder="Ex.: Vencidos do mês"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveFavDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!overwriteKey) {
                  toast({
                    variant: 'destructive',
                    title: 'Selecione um favorito para sobrescrever',
                  });
                  return;
                }
                const fav = {
                  name: overwriteKey,
                  vendorFilter,
                  paymentMethodFilter,
                  startFilter,
                  endFilter,
                  searchFilter,
                  statusFilter,
                  amountMinFilter,
                  amountMaxFilter,
                  costCenterFilter,
                  sortBy,
                  sortDir,
                };
                const next = [...favorites.filter((f) => f.name !== overwriteKey), fav];
                setFavorites(next);
                try {
                  localStorage.setItem('ap_filter_favorites', JSON.stringify(next));
                } catch {}
                setSelectedFavorite(overwriteKey);
                toast({
                  title: 'Favorito sobrescrito',
                  description: `Atualizado: ${overwriteKey}`,
                });
                setSaveFavDialogOpen(false);
              }}
            >
              Sobrescrever selecionado
            </Button>
            <Button
              onClick={() => {
                const name = (favName || '').trim();
                if (!name) {
                  toast({ variant: 'destructive', title: 'Informe um nome' });
                  return;
                }
                let allow = true;
                if (favorites.some((f) => f.name === name)) {
                  allow = window.confirm(
                    'Já existe um favorito com este nome. Deseja sobrescrever?',
                  );
                }
                if (!allow) {
                  return;
                }
                const fav = {
                  name,
                  vendorFilter,
                  paymentMethodFilter,
                  startFilter,
                  endFilter,
                  searchFilter,
                  statusFilter,
                  amountMinFilter,
                  amountMaxFilter,
                  costCenterFilter,
                  sortBy,
                  sortDir,
                };
                const next = [...favorites.filter((f) => f.name !== name), fav];
                setFavorites(next);
                try {
                  localStorage.setItem('ap_filter_favorites', JSON.stringify(next));
                } catch {}
                setSelectedFavorite(name);
                toast({ title: 'Favorito salvo', description: `Criado: ${name}` });
                setSaveFavDialogOpen(false);
              }}
            >
              Salvar como novo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Ver Detalhes */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="app-dialog-shell app-dialog-shell--compact">
          <DialogHeader>
            <DialogTitle>Detalhes da conta</DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-gray-600">Descrição</Label>
                <div>{viewItem.description || '—'}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Fornecedor</Label>
                <div>{viewItem.vendor_name || '—'}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Emissão</Label>
                <div>
                  {viewItem.issue_date
                    ? new Date(viewItem.issue_date).toLocaleDateString('pt-BR')
                    : '—'}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">NF/Documento</Label>
                <div className="break-words">
                  {viewItem.document_number || '—'}
                  {viewItem.document_url && (
                    <div className="mt-1">
                      <a
                        href={viewItem.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Abrir anexo
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Vencimento</Label>
                <div>
                  {viewItem.due_date
                    ? new Date(viewItem.due_date).toLocaleDateString('pt-BR')
                    : '—'}
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Valor</Label>
                <div>{currency.format(Number(viewItem.amount || 0))}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Método</Label>
                <div>{viewItem.payment_method || '—'}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Parcela</Label>
                <div>{parcelLabel(viewItem)}</div>
              </div>
              <div>
                <Label className="text-xs text-gray-600">Centro de custo</Label>
                <div>{viewItem.category_id ? costCenterMap[viewItem.category_id] || '—' : '—'}</div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs text-gray-600">Observações</Label>
                <div className="whitespace-pre-wrap break-words">{viewItem.notes || '—'}</div>
              </div>
              {/* Resumo da NF (a partir das observações) */}
              {(() => {
                const nf = parseNfSummaryFromNotes(viewItem.notes);
                const show = nf.itemsCount || nf.subtotal || nf.taxesTotal || nf.totalAfter;
                if (!show) {
                  return null;
                }
                return (
                  <div className="md:col-span-2 border rounded-md p-3 bg-gray-50 space-y-2">
                    <div className="text-xs text-gray-600">Resumo da NF</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-gray-600">Produtos adicionados</div>
                        <div className="font-medium">{nf.itemsCount ?? '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Subtotal</div>
                        <div className="font-medium">
                          {nf.subtotal !== null
                            ? nf.subtotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Total impostos</div>
                        <div className="font-medium">
                          {nf.taxesTotal !== null
                            ? nf.taxesTotal.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              })
                            : '—'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                      {['IR', 'CSLL', 'PIS/COFINS', 'ISS', 'ICMS'].map((k) => (
                        <div key={k} className="bg-white rounded p-2 border">
                          <div className="text-gray-600">{k}</div>
                          <div className="font-medium">
                            {typeof nf.taxes[k] === 'number'
                              ? nf.taxes[k].toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                })
                              : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="text-sm">
                      Total após impostos:{' '}
                      <strong>
                        {(nf.totalAfter ?? Number(viewItem.amount || 0)).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          <DialogFooter>
            <Button
              onClick={() => {
                if (viewItem) {
                  navigate(`/clinica/financeiro/pagar/${viewItem.id}/editar`);
                }
              }}
            >
              Editar
            </Button>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Conta removido: edição agora ocorre na página dedicada */}
    </PageLayout>
  );
}

// SummaryCards extracted to component
