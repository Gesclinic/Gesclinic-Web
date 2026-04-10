import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listUsers } from '@/lib/usersApi';
import { fetchServicesForSelect } from '@/lib/appointmentsApi';
import { listPayers } from '@/lib/payersApi';
import { getProfessionalDetails } from '@/lib/professionalsApi';
import { asUuidOrNull, selectValue, fromSelect, isNone, asStringOrNull } from '@/lib/selectUtils';
import { PROFESSIONAL_KIND_OPTIONS } from '@/lib/professionalEnums';
import { maskCPF, maskPhone } from '@/components/MaskedInput';
import { User, X } from 'lucide-react';

const initialFormState = {
  name: '',
  email: '',
  phone: '',
  cpf: '',
  birthdate: '',
  council_number: '',
  uf: '',
  rqe: '',
  specialty: '',
  user_id: null,
  professional_kind: null,
  address: { street: '', number: '', complement: '', neighborhood: '', city: '', state: '', zip: '' },
  has_schedule: false,
  active: true,
  photo_url: null,
  photo_path: null,
  schedule_notes: '',
};

const initialSchedules = [
    { weekday: 1, start_time: '08:00', end_time: '18:00', appointment_duration: 30 },
    { weekday: 2, start_time: '08:00', end_time: '18:00', appointment_duration: 30 },
    { weekday: 3, start_time: '08:00', end_time: '18:00', appointment_duration: 30 },
    { weekday: 4, start_time: '08:00', end_time: '18:00', appointment_duration: 30 },
    { weekday: 5, start_time: '08:00', end_time: '18:00', appointment_duration: 30 },
];

const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default function ProfessionalDialog({ open, onOpenChange, onSubmit, initialData }) {
  const { toast } = useToast();
  const { clinicId } = useAuth();
  const [form, setForm] = useState(initialData || initialFormState);
  const [users, setUsers] = useState([]);
  const [services, setServices] = useState([]);
  const [payers, setPayers] = useState([]);
  
  const [professionalServices, setProfessionalServices] = useState([]);
  const [professionalPayers, setProfessionalPayers] = useState([]);
  const [professionalSchedules, setProfessionalSchedules] = useState([]);

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  const isEdit = !!initialData?.id;

  const loadRefs = useCallback(async () => {
    if (!clinicId) return;
    try {
      const [usersData, servicesData, payersData] = await Promise.all([
        listUsers(clinicId),
        fetchServicesForSelect(clinicId),
        listPayers(clinicId),
      ]);
      setUsers(usersData);
      setServices(servicesData);
      setPayers(payersData);

      if (isEdit && initialData?.id) {
        const details = await getProfessionalDetails(initialData.id);
        setForm({ 
          ...initialFormState, 
          ...details,
          uf: details.uf || details.state || '',
          cpf: maskCPF(details.cpf || ""),
          phone: maskPhone(details.phone || ""),
        });
        setPhotoPreview(details.photo_url);
        setProfessionalSchedules(details.professional_schedules || []);
        setProfessionalServices(details.professional_services || []);
        const payerRestrictions = details.professional_payer_restrictions || [];
        const mappedPayers = payersData.map(p => {
            const restriction = payerRestrictions.find(r => r.payer_id === p.id);
            return { payer_id: p.id, name: p.name, is_restricted: restriction ? restriction.is_restricted : false };
        });
        setProfessionalPayers(mappedPayers);
      } else {
        setForm(initialFormState);
        setProfessionalSchedules(initialSchedules);
        setProfessionalServices([]);
        setProfessionalPayers(payersData.map(p => ({ payer_id: p.id, name: p.name, is_restricted: false })));
        setPhotoPreview(null);
      }
      setPhotoFile(null);

    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: error.message });
    }
  }, [clinicId, toast, isEdit, initialData]);

  useEffect(() => {
    if (open) {
      loadRefs();
    } else {
        setPhotoFile(null);
        setPhotoPreview(null);
    }
  }, [open, loadRefs]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Aplicar máscaras conforme o campo
    if (name === 'cpf') {
      finalValue = maskCPF(value);
    } else if (name === 'phone') {
      finalValue = maskPhone(value);
    }
    
    setForm((prev) => ({ ...prev, [name]: finalValue }));
  };
  
  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, address: { ...prev.address, [name]: value } }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleScheduleChange = (index, field, value) => {
    const newSchedules = [...professionalSchedules];
    newSchedules[index][field] = value;
    setProfessionalSchedules(newSchedules);
  };

  const addSchedule = () => {
    setProfessionalSchedules([...professionalSchedules, { weekday: 1, start_time: '08:00', end_time: '18:00', appointment_duration: 30 }]);
  };

  const removeSchedule = (index) => {
    setProfessionalSchedules(professionalSchedules.filter((_, i) => i !== index));
  };

  const handleServiceToggle = (serviceId) => {
    const existing = professionalServices.find(s => s.service_id === serviceId);
    if (existing) {
        setProfessionalServices(professionalServices.map(s => s.service_id === serviceId ? { ...s, is_active: !s.is_active } : s));
    } else {
        setProfessionalServices([...professionalServices, { service_id: serviceId, is_active: true }]);
    }
  };

  const handlePayerRestrictionToggle = (payerId) => {
    setProfessionalPayers(professionalPayers.map(p => p.payer_id === payerId ? { ...p, is_restricted: !p.is_restricted } : p));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const basePayload = {
      ...form,
      uf: form.uf || '',
      user_id: asUuidOrNull(form.user_id),
      professional_kind: asStringOrNull(form.professional_kind),
    };

    const detailsPayload = {
        schedules: professionalSchedules,
        services: professionalServices,
        payers: professionalPayers,
    };

    onSubmit(basePayload, detailsPayload, photoFile);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--content app-dialog-shell--wide">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEdit ? 'Editar Profissional' : 'Novo Profissional'}</DialogTitle>
          <DialogDescription>{isEdit ? 'Atualize os dados do profissional.' : 'Preencha os dados do novo profissional.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <Tabs defaultValue="personal" className="flex flex-col flex-1">
                <TabsList className="grid w-full grid-cols-4 shrink-0">
                    <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
                    <TabsTrigger value="services">Serviços e Convênios</TabsTrigger>
                    <TabsTrigger value="schedule">Agenda</TabsTrigger>
                    <TabsTrigger value="address">Endereço</TabsTrigger>
                </TabsList>
                <div className="flex-1 overflow-hidden">
                  <div className="h-full overflow-y-auto p-4">
                    <TabsContent value="personal" className="space-y-4 outline-none">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-24 w-24">
                            <AvatarImage src={photoPreview || form.photo_url} alt={form.name} />
                            <AvatarFallback><User className="h-12 w-12" /></AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Label htmlFor="photo">Foto do Profissional</Label>
                            <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo*</Label>
                        <Input id="name" name="name" value={form.name} onChange={handleChange} required />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="user_id">Usuário vinculado</Label>
                        <Select name="user_id" value={selectValue(form.user_id)} onValueChange={v => setForm(f => ({ ...f, user_id: fromSelect(v) }))}>
                            <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                            <SelectContent>
                            <SelectItem value="__none__">Nenhum</SelectItem>
                            {users.map(user => <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" name="email" type="email" value={form.email || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" name="phone" value={form.phone || ''} onChange={handleChange} placeholder="(11) 99999-9999" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <Input id="cpf" name="cpf" value={form.cpf || ''} onChange={handleChange} placeholder="000.000.000-00" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="birthdate">Data de Nascimento</Label>
                            <Input id="birthdate" name="birthdate" type="date" value={form.birthdate || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="specialty">Especialidade Principal</Label>
                            <Input id="specialty" name="specialty" value={form.specialty || ''} onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="professional_kind">Tipo de Profissional</Label>
                             <Select
                                value={selectValue(form.professional_kind)}
                                onValueChange={(v) =>
                                  setForm(f => ({ ...f, professional_kind: isNone(v) ? null : v }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Tipo de profissional" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="__none__">Sem tipo</SelectItem>
                                  {PROFESSIONAL_KIND_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 flex flex-row gap-2 items-end">
                            <div className="flex-1">
                                <Label htmlFor="council_number">Número do Conselho (Ex: CRM)</Label>
                                <Input id="council_number" name="council_number" value={form.council_number || ''} onChange={handleChange} />
                            </div>
                            <div style={{ width: 80 }}>
                                <Label htmlFor="uf">UF</Label>
                                <Input id="uf" name="uf" value={form.uf || ''} onChange={e => setForm(f => ({ ...f, uf: e.target.value.toUpperCase().slice(0,2) }))} maxLength={2} className="uppercase" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rqe">RQE</Label>
                            <Input id="rqe" name="rqe" value={form.rqe || ''} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-4">
                        <Checkbox id="active" checked={form.active} onCheckedChange={c => setForm(f => ({...f, active: c}))} />
                        <Label htmlFor="active">Profissional ativo</Label>
                    </div>
                </TabsContent>
                    <TabsContent value="services" className="space-y-6 outline-none">
                    <div>
                        <h3 className="font-semibold mb-2">Serviços Atendidos</h3>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                            {services.map(service => (
                                <div key={service.id} className="flex items-center justify-between">
                                    <span>{service.name}</span>
                                    <Checkbox
                                        checked={professionalServices.find(s => s.service_id === service.id)?.is_active ?? false}
                                        onCheckedChange={() => handleServiceToggle(service.id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h3 className="font-semibold mb-2">Convênios Atendidos (marcar para restringir)</h3>
                        <div className="max-h-60 overflow-y-auto border rounded-md p-2 space-y-2">
                            {professionalPayers.map(payer => (
                                <div key={payer.payer_id} className="flex items-center justify-between">
                                    <span>{payer.name}</span>
                                    <Checkbox
                                        checked={payer.is_restricted}
                                        onCheckedChange={() => handlePayerRestrictionToggle(payer.payer_id)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </TabsContent>
                    <TabsContent value="schedule" className="space-y-4 outline-none">
                    <div className="flex items-center space-x-2">
                        <Checkbox id="has_schedule" checked={form.has_schedule} onCheckedChange={c => setForm(f => ({...f, has_schedule: c}))} />
                        <Label htmlFor="has_schedule">Possui agenda de atendimentos nesta unidade</Label>
                    </div>
                    {form.has_schedule && (
                        <>
                            <div className="space-y-2">
                                <Label>Observações para Agendamento</Label>
                                <Textarea name="schedule_notes" value={form.schedule_notes || ''} onChange={handleChange} placeholder="Ex: Atende somente na parte da manhã." />
                            </div>
                            <div className="space-y-2">
                                <Label>Dias de Atendimento</Label>
                                <div className="border rounded-md p-2 space-y-2">
                                    {professionalSchedules.map((schedule, index) => (
                                        <div key={index} className="grid grid-cols-5 gap-2 items-center">
                                            <Select value={String(schedule.weekday)} onValueChange={v => handleScheduleChange(index, 'weekday', Number(v))}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {weekdays.map((day, i) => <SelectItem key={i} value={String(i)}>{day}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input type="time" value={schedule.start_time || ''} onChange={e => handleScheduleChange(index, 'start_time', e.target.value)} />
                                            <Input type="time" value={schedule.end_time || ''} onChange={e => handleScheduleChange(index, 'end_time', e.target.value)} />
                                            <Input type="number" placeholder="Duração (min)" value={schedule.appointment_duration || ''} onChange={e => handleScheduleChange(index, 'appointment_duration', Number(e.target.value))} />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeSchedule(index)}><X className="h-4 w-4" /></Button>
                                        </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addSchedule}>Adicionar dia</Button>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
                    <TabsContent value="address" className="space-y-4 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>Rua</Label>
                            <Input name="street" value={form.address?.street || ''} onChange={handleAddressChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Número</Label>
                            <Input name="number" value={form.address?.number || ''} onChange={handleAddressChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Complemento</Label>
                            <Input name="complement" value={form.address?.complement || ''} onChange={handleAddressChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Bairro</Label>
                            <Input name="neighborhood" value={form.address?.neighborhood || ''} onChange={handleAddressChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>CEP</Label>
                            <Input name="zip" value={form.address?.zip || ''} onChange={handleAddressChange} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Cidade</Label>
                            <Input name="city" value={form.address?.city || ''} onChange={handleAddressChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Input name="state" value={form.address?.state || ''} onChange={handleAddressChange} />
                        </div>
                    </div>
                </TabsContent>
                  </div>
                </div>
            </Tabs>
            <DialogFooter className="pt-4 shrink-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}