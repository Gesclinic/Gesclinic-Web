import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Plus, Trash2, Upload, FileText, Calculator } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
// import { Calendar } from '@/components/ui/calendar';
import { Calendar } from 'react-calendar';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data fetchers (replace with real hooks/API calls)
import { listPatients } from '@/lib/patientsApi';
import { listProfessionals } from '@/lib/professionalsApi';
import { listPayers } from '@/lib/payersApi';
import { supabase } from '@/lib/customSupabaseClient';

export default function OrcamentoForm({ clinicId, initialData, onCancel, onSubmit }) {
  // --- STATE ---
  const [loading, setLoading] = useState(false);

  // Data Lists
  const [patients, setPatients] = useState([]);
  const [payers, setPayers] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [materialsList, setMaterialsList] = useState([]);

  // Form Fields
  const [numero, setNumero] = useState(initialData?.numero || '');
  const [selectedPatientId, setSelectedPatientId] = useState(initialData?.patient_id || '');
  const [selectedPayerId, setSelectedPayerId] = useState(initialData?.payer_id || '');
  const [selectedPlanId, setSelectedPlanId] = useState(initialData?.payer_plan_id || '');
  const [validade, setValidade] = useState(
    initialData?.validade
      ? new Date(initialData.validade)
      : new Date(new Date().setMonth(new Date().getMonth() + 1)),
  );

  const [items, setItems] = useState(initialData?.items || []);

  const [localTipo, setLocalTipo] = useState(initialData?.local_tipo || 'clinica');
  const [hospitalNome, setHospitalNome] = useState(initialData?.hospital_nome || '');

  // Dynamic Lists
  const [extraProfessionals, setExtraProfessionals] = useState(
    initialData?.extraProfessionals || [],
  );
  const [extraMaterials, setExtraMaterials] = useState(initialData?.extraMaterials || []);

  // Hospital Fields
  const [diasQuarto, setDiasQuarto] = useState(initialData?.dias_quarto || 0);
  const [diasUti, setDiasUti] = useState(initialData?.dias_uti || 0);
  const [valorDiariaQuarto, setValorDiariaQuarto] = useState(initialData?.valor_diaria || 0);
  const [valorDiariaUti, setValorDiariaUti] = useState(initialData?.valor_diaria_uti || 0);
  const [complementacaoValor, setComplementacaoValor] = useState(
    initialData?.complementacao_valor || 0,
  );

  const [descontoPercent, setDescontoPercent] = useState(0);
  const [descontoValor, setDescontoValor] = useState(initialData?.desconto || 0);
  const [formaPagamento, setFormaPagamento] = useState(initialData?.forma_pagamento || 'vista');

  const [cid, setCid] = useState(initialData?.cid_principal || '');
  const [obs, setObs] = useState(initialData?.observacoes || '');

  // --- LOAD DATA ---
  useEffect(() => {
    if (!clinicId) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [pats, pros, pays, servs, mats] = await Promise.all([
          listPatients(clinicId).catch(() => []),
          listProfessionals(clinicId).catch(() => []),
          listPayers(clinicId).catch(() => []),
          supabase
            .from('services')
            .select('*')
            .eq('clinic_id', clinicId)
            .then((r) => r.data || []),
          supabase
            .from('materials')
            .select('*')
            .eq('clinic_id', clinicId)
            .then((r) => r.data || []),
        ]);

        setPatients(pats);
        setProfessionals(pros);
        setPayers(pays);
        setServices(servs);
        setMaterialsList(mats);
      } catch (e) {
        console.error('Error loading form data', e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [clinicId]);

  // --- SYNC INITIAL DATA ---
  useEffect(() => {
    if (initialData) {
      setNumero(initialData.numero || '');
      setSelectedPatientId(initialData.patient_id || '');
      setSelectedPayerId(initialData.payer_id || '');
      setSelectedPlanId(initialData.plano_tipo || initialData.payer_plan_id || '');
      setValidade(
        initialData.validade
          ? new Date(initialData.validade)
          : new Date(new Date().setMonth(new Date().getMonth() + 1)),
      );

      setItems(initialData.items || []);

      setLocalTipo(initialData.local_tipo || 'clinica');
      setHospitalNome(initialData.hospital_nome || '');

      setExtraProfessionals(initialData.extraProfessionals || []);
      setExtraMaterials(initialData.extraMaterials || []);

      setDiasQuarto(initialData.dias_quarto || 0);
      setDiasUti(initialData.dias_uti || 0);
      setValorDiariaQuarto(initialData.valor_diaria || 0);
      setValorDiariaUti(initialData.valor_diaria_uti || 0);
      setComplementacaoValor(initialData.complementacao_valor || 0);

      setDescontoValor(initialData.desconto || 0);
      setFormaPagamento(initialData.forma_pagamento || 'vista');

      setCid(initialData.cid_principal || '');
      setObs(initialData.observacoes || '');
    }
  }, [initialData]);

  // --- CALCULATIONS ---
  const totalBruto = useMemo(() => {
    // 1. Items (Services)
    const itemsTotal = items.reduce((acc, item) => {
      const val = Number(item.valor || 0);
      // Removed honorario from total calculation as requested
      return acc + val;
    }, 0);

    // 2. Extra Professionals
    const prosTotal = extraProfessionals.reduce((acc, p) => acc + Number(p.valor || 0), 0);

    // 3. Materials
    const matsTotal = extraMaterials.reduce(
      (acc, m) => acc + Number(m.qtd || 1) * Number(m.valor_unitario || 0),
      0,
    );

    // 4. Hospital costs
    let hospitalTotal = 0;
    if (localTipo === 'hospital') {
      const totalQuarto = Number(diasQuarto || 0) * Number(valorDiariaQuarto || 0);
      const totalUti = Number(diasUti || 0) * Number(valorDiariaUti || 0);
      const compl = Number(complementacaoValor || 0);
      hospitalTotal = totalQuarto + totalUti + compl;
    }

    return itemsTotal + prosTotal + matsTotal + hospitalTotal;
  }, [
    items,
    extraProfessionals,
    extraMaterials,
    localTipo,
    diasQuarto,
    diasUti,
    valorDiariaQuarto,
    valorDiariaUti,
    complementacaoValor,
  ]);

  const totalDesconto = useMemo(() => {
    // 1. Items Discount (Percentage based)
    const itemsDiscount = items.reduce((acc, item) => {
      const val = Number(item.valor || 0);
      const descPerc = Number(item.desconto || 0);
      return acc + val * (descPerc / 100);
    }, 0);

    // 2. Professionals Discount (Percentage based)
    const prosDiscount = extraProfessionals.reduce((acc, p) => {
      const val = Number(p.valor || 0);
      const descPerc = Number(p.desconto || 0);
      return acc + val * (descPerc / 100);
    }, 0);

    // 3. Materials Discount (Percentage based)
    const matsDiscount = extraMaterials.reduce((acc, m) => {
      const totalVal = Number(m.qtd || 1) * Number(m.valor_unitario || 0);
      const descPerc = Number(m.desconto || 0);
      return acc + totalVal * (descPerc / 100);
    }, 0);

    return itemsDiscount + prosDiscount + matsDiscount;
  }, [items, extraProfessionals, extraMaterials]);

  const totalFinal = useMemo(() => {
    return Math.max(0, totalBruto - totalDesconto);
  }, [totalBruto, totalDesconto]);

  // --- HANDLERS ---

  // Items
  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Math.random().toString(36).substr(2, 9),
        service_id: '',
        medico_id: '',
        // honorario removed
        valor: 0,
        desconto: 0, // Now represents percentage
        obs: '',
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'service_id') {
      const svc = services.find((s) => s.id === value);
      if (svc) {
        newItems[index].service_name = svc.name;
      }
    }
    setItems(newItems);
  };

  // Extra Professionals
  const handleAddProfessional = () => {
    setExtraProfessionals([
      ...extraProfessionals,
      {
        id: Math.random().toString(36).substr(2, 9),
        professional_id: '',
        role: '',
        valor: 0,
        desconto: 0, // Added discount field
      },
    ]);
  };

  const handleRemoveProfessional = (index) => {
    const newPros = [...extraProfessionals];
    newPros.splice(index, 1);
    setExtraProfessionals(newPros);
  };

  const handleProfessionalChange = (index, field, value) => {
    const newPros = [...extraProfessionals];
    newPros[index] = { ...newPros[index], [field]: value };
    if (field === 'professional_id') {
      const pro = professionals.find((p) => p.id === value);
      if (pro) {
        newPros[index].role = pro.specialty || '';
      }
    }
    setExtraProfessionals(newPros);
  };

  // Materials
  const handleAddMaterial = () => {
    setExtraMaterials([
      ...extraMaterials,
      {
        id: Math.random().toString(36).substr(2, 9),
        material_id: '',
        qtd: 1,
        valor_unitario: 0,
        desconto: 0, // Added discount field
      },
    ]);
  };

  const handleRemoveMaterial = (index) => {
    const newMats = [...extraMaterials];
    newMats.splice(index, 1);
    setExtraMaterials(newMats);
  };

  const handleMaterialChange = (index, field, value) => {
    const newMats = [...extraMaterials];
    newMats[index] = { ...newMats[index], [field]: value };

    if (field === 'material_id') {
      const mat = materialsList.find((m) => m.id === value);
      if (mat) {
        newMats[index].valor_unitario = mat.default_value || 0;
      }
    }
    setExtraMaterials(newMats);
  };

  const handleSubmit = () => {
    const payload = {
      numero: numero,
      patient_id: selectedPatientId,
      payer_id: selectedPayerId,
      plano_tipo: selectedPlanId,
      validade: validade,
      local_tipo: localTipo,
      hospital_nome: localTipo === 'hospital' ? hospitalNome : null,

      // Hospital specific
      dias_quarto: localTipo === 'hospital' ? Number(diasQuarto || 0) : 0,
      dias_uti: localTipo === 'hospital' ? Number(diasUti || 0) : 0,
      valor_diaria: localTipo === 'hospital' ? Number(valorDiariaQuarto || 0) : 0,
      valor_diaria_uti: localTipo === 'hospital' ? Number(valorDiariaUti || 0) : 0,
      complementacao_valor: localTipo === 'hospital' ? Number(complementacaoValor || 0) : 0,

      valor_bruto: totalBruto,
      desconto: descontoValor,
      valor_final: totalFinal,
      forma_pagamento: formaPagamento,
      cid_principal: cid,
      observacoes: obs,

      // Lists
      items: items.map((i) => ({
        ...i,
        medico_id: i.medico_id || null,
      })),
      extraProfessionals: extraProfessionals.map((p) => ({
        ...p,
        professional_id: p.professional_id || null,
      })),
      extraMaterials: extraMaterials.map((m) => ({
        ...m,
        material_id: m.material_id || null,
      })),
    };
    onSubmit(payload);
  };

  // --- RENDER ---
  return (
    <div className="space-y-8 py-4">
      {/* 1. HEADER: PACIENTE & CONVÊNIO */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-3 space-y-2">
          <Label>Número</Label>
          <Input
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ex: 001/2025"
          />
        </div>

        <div className="md:col-span-9 space-y-2">
          <Label>Paciente</Label>
          <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o paciente..." />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-5 space-y-2">
          <Label>Convênio</Label>
          <Select value={selectedPayerId} onValueChange={setSelectedPayerId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {payers.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-4 space-y-2">
          <Label>Plano</Label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="participativo">Participativo</SelectItem>
              <SelectItem value="integral">Integral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-3 space-y-2">
          <Label>Validade</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !validade && 'text-muted-foreground',
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {validade ? format(validade, 'dd/MM/yyyy') : <span>Data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={validade} onSelect={setValidade} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Separator />

      {/* 2. PROCEDIMENTOS / SERVIÇOS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="bg-blue-100 text-blue-600 p-1 rounded">🩺</span> Procedimentos /
            Serviços
          </h3>
          <Button size="sm" variant="outline" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar serviço
          </Button>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Serviço</th>
                <th className="px-3 py-2 text-left font-medium">Médico</th>
                {/* Removed Honorário Header */}
                <th className="px-3 py-2 text-right font-medium">Valor (R$)</th>
                <th className="px-3 py-2 text-right font-medium">Desconto (%)</th>
                <th className="px-3 py-2 text-left font-medium">Obs</th>
                <th className="px-3 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    Nenhum procedimento adicionado.
                  </td>
                </tr>
              )}
              {items.map((item, idx) => (
                <tr key={item.id} className="bg-white">
                  <td className="px-3 py-2">
                    <Select
                      value={item.service_id}
                      onValueChange={(v) => handleItemChange(idx, 'service_id', v)}
                    >
                      <SelectTrigger className="h-8 w-[200px]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      value={item.medico_id}
                      onValueChange={(v) => handleItemChange(idx, 'medico_id', v)}
                    >
                      <SelectTrigger className="h-8 w-[140px]">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  {/* Removed Honorário Input */}
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-8 text-right w-24 ml-auto"
                      value={item.valor}
                      onChange={(e) => handleItemChange(idx, 'valor', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-8 text-right w-24 ml-auto text-red-600"
                      value={item.desconto}
                      onChange={(e) => handleItemChange(idx, 'desconto', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 w-full"
                      value={item.obs}
                      onChange={(e) => handleItemChange(idx, 'obs', e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* 3. LOCAL */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-purple-100 text-purple-600 p-1 rounded">🏥</span> Local do
              procedimento
            </h3>
            <RadioGroup value={localTipo} onValueChange={setLocalTipo} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="clinica" id="r-clinica" />
                <Label htmlFor="r-clinica">Clínica</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hospital" id="r-hospital" />
                <Label htmlFor="r-hospital">Hospital</Label>
              </div>
            </RadioGroup>

            {localTipo === 'hospital' && (
              <div className="space-y-4 pt-2 border-t border-dashed">
                <Input
                  placeholder="Nome do Hospital"
                  value={hospitalNome}
                  onChange={(e) => setHospitalNome(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Dias Quarto</Label>
                    <Input
                      type="number"
                      value={diasQuarto}
                      onChange={(e) => setDiasQuarto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dias UTI</Label>
                    <Input
                      type="number"
                      value={diasUti}
                      onChange={(e) => setDiasUti(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Diária Quarto (R$)</Label>
                    <Input
                      type="number"
                      className="text-right"
                      value={valorDiariaQuarto}
                      onChange={(e) => setValorDiariaQuarto(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Diária UTI (R$)</Label>
                    <Input
                      type="number"
                      className="text-right"
                      value={valorDiariaUti}
                      onChange={(e) => setValorDiariaUti(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Complementação (R$)</Label>
                  <Input
                    type="number"
                    className="text-right"
                    value={complementacaoValor}
                    onChange={(e) => setComplementacaoValor(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. PROFISSIONAIS ADICIONAIS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-green-100 text-green-600 p-1 rounded">👨‍⚕️</span> Profissionais
                adicionais
              </h3>
              <Button size="sm" variant="ghost" onClick={handleAddProfessional}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {extraProfessionals.length === 0 && (
                <div className="text-sm text-gray-500 italic">Nenhum profissional adicional.</div>
              )}
              {extraProfessionals.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Select
                      value={item.professional_id}
                      onValueChange={(v) => handleProfessionalChange(idx, 'professional_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Profissional..." />
                      </SelectTrigger>
                      <SelectContent>
                        {professionals.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-32 space-y-1">
                    <Input
                      className="h-9"
                      placeholder="Função"
                      value={item.role}
                      onChange={(e) => handleProfessionalChange(idx, 'role', e.target.value)}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Input
                      type="number"
                      className="h-9 text-right"
                      placeholder="R$"
                      value={item.valor}
                      onChange={(e) => handleProfessionalChange(idx, 'valor', e.target.value)}
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Input
                      type="number"
                      className="h-9 text-right text-red-600"
                      placeholder="Desc %"
                      value={item.desconto}
                      onChange={(e) => handleProfessionalChange(idx, 'desconto', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500"
                    onClick={() => handleRemoveProfessional(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. MATERIAIS E MEDICAMENTOS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <span className="bg-yellow-100 text-yellow-600 p-1 rounded">💊</span> Materiais e
                Medicamentos
              </h3>
              <Button size="sm" variant="ghost" onClick={handleAddMaterial}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {extraMaterials.length === 0 && (
                <div className="text-sm text-gray-500 italic">Nenhum material adicionado.</div>
              )}
              {extraMaterials.map((item, idx) => (
                <div key={item.id} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1">
                    <Select
                      value={item.material_id}
                      onValueChange={(v) => handleMaterialChange(idx, 'material_id', v)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {materialsList.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Input
                      type="number"
                      className="h-9 text-center"
                      placeholder="Qtd"
                      value={item.qtd}
                      onChange={(e) => handleMaterialChange(idx, 'qtd', e.target.value)}
                    />
                  </div>
                  <div className="w-24 space-y-1">
                    <Input
                      type="number"
                      className="h-9 text-right"
                      placeholder="Unit."
                      value={item.valor_unitario}
                      onChange={(e) => handleMaterialChange(idx, 'valor_unitario', e.target.value)}
                    />
                  </div>
                  <div className="w-20 space-y-1">
                    <Input
                      type="number"
                      className="h-9 text-right text-red-600"
                      placeholder="Desc %"
                      value={item.desconto}
                      onChange={(e) => handleMaterialChange(idx, 'desconto', e.target.value)}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500"
                    onClick={() => handleRemoveMaterial(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 6. DOCUMENTAÇÃO */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span className="bg-orange-100 text-orange-600 p-1 rounded">🗂</span> Documentação
            </h3>
            <div className="space-y-2">
              <Button variant="outline" className="w-full border-dashed">
                <Upload className="w-4 h-4 mr-2" /> Anexar exames / documentos
              </Button>
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <Label>CID Principal</Label>
                  <Input
                    value={cid}
                    onChange={(e) => setCid(e.target.value)}
                    placeholder="Ex: M17"
                  />
                </div>
                <div className="col-span-3">
                  <Label>Observações</Label>
                  <Textarea
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    placeholder="Artrose de joelho, indicação cirúrgica..."
                    className="h-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - FINANCES */}
        <div className="space-y-6">
          <Card className="bg-slate-50 border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <Calculator className="w-5 h-5" /> Finanças
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Valor total bruto:</span>
                <span className="font-medium text-lg">
                  R$ {totalBruto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Total Descontos:</span>
                <span className="font-medium text-lg text-red-600">
                  - R$ {totalDesconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="text-gray-800 font-semibold">Valor final:</span>
                <span className="font-bold text-2xl text-green-600">
                  R$ {totalFinal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="space-y-2 pt-4">
                <Label>Forma de pagamento</Label>
                <RadioGroup
                  value={formaPagamento}
                  onValueChange={setFormaPagamento}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="vista" id="fp-vista" />
                    <Label htmlFor="fp-vista">À vista</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="parcelado" id="fp-parcelado" />
                    <Label htmlFor="fp-parcelado">Parcelado</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="convenio" id="fp-convenio" />
                    <Label htmlFor="fp-convenio">Convênio</Label>
                  </div>
                </RadioGroup>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" size="lg" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 min-w-[150px]"
              onClick={handleSubmit}
            >
              Criar orçamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
