import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '@/lib/customSupabaseClient';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DollarSign, Percent, Settings, Save } from 'lucide-react';

export default function RepasseConfig() {
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState([]);
  const [services, setServices] = useState([]);
  const [groups, setGroups] = useState([]);
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    professional_id: '',
    tipo: 'servico', // 'servico', 'grupo', 'geral'
    tipo_base: 'bruto', // 'bruto', 'liquido'
    percentual: 70,
    service_id: null,
    service_group_id: null,
    ativo: true,
  });

  const loadData = async () => {
    setLoading(true);
    const [{ data: profs }, { data: servs }, { data: grps }, { data: cfgs }] = await Promise.all([
      supabase.from('professionals').select('id, name').order('name'),
      supabase.from('services').select('id, name').order('name'),
      supabase.from('service_groups').select('id, name').order('name'),
      supabase.from('repasse_config_servico').select('*').order('created_at', { ascending: false }),
    ]);
    setProfessionals(profs || []);
    setServices(servs || []);
    setGroups(grps || []);
    setConfigs(cfgs || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!form.professional_id || !form.percentual) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Selecione o profissional e informe um percentual de repasse.',
      });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('repasse_config_servico').insert([
      {
        professional_id: form.professional_id,
        tipo_base: form.tipo_base,
        percentual: form.percentual,
        service_id: form.tipo === 'servico' ? form.service_id : null,
        ativo: form.ativo,
      },
    ]);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso!', description: 'Nova regra de repasse salva.' });
      loadData();
      // Reset form partially
      setForm((f) => ({ ...f, service_id: null, service_group_id: null, percentual: 70 }));
    }
    setSaving(false);
  };

  const getReferenceName = (config) => {
    if (config.service_id) {
      return services.find((s) => s.id === config.service_id)?.name || 'Serviço específico';
    }
    if (config.service_group_id) {
      return groups.find((g) => g.id === config.service_group_id)?.name || 'Grupo específico';
    }
    return 'Geral';
  };

  return (
    <>
      <Helmet>
        <title>Configuração de Repasses - Gesclinic Web</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            Configuração de Repasse Médico
          </h1>
        </div>

        <Card className="shadow-lg border-primary/20">
          <CardHeader>
            <CardTitle>Criar Nova Regra</CardTitle>
            <CardDescription>
              Defina regras de comissão para serviços específicos, grupos ou geral.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div className="flex flex-col space-y-1.5">
              <label>Profissional</label>
              <Select
                value={form.professional_id}
                onValueChange={(value) => setForm({ ...form, professional_id: value })}
              >
                <SelectTrigger>
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
            </div>

            <div className="flex flex-col space-y-1.5">
              <label>Aplicar a</label>
              <Select
                value={form.tipo}
                onValueChange={(value) =>
                  setForm({ ...form, tipo: value, service_id: null, service_group_id: null })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="servico">Serviço Específico</SelectItem>
                  <SelectItem value="grupo" disabled>
                    Grupo de Serviços (em breve)
                  </SelectItem>
                  <SelectItem value="geral" disabled>
                    Geral (em breve)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.tipo === 'servico' && (
              <div className="flex flex-col space-y-1.5">
                <label>Serviço</label>
                <Select
                  value={form.service_id || ''}
                  onValueChange={(value) => setForm({ ...form, service_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex flex-col space-y-1.5">
              <label>Percentual</label>
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  value={form.percentual}
                  onChange={(e) => setForm({ ...form, percentual: e.target.value })}
                  placeholder="Ex: 70"
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full lg:w-auto">
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Regra'}
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Regras Atuais</CardTitle>
            <CardDescription>
              Lista de todas as configurações de repasse salvas no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead className="text-center">Percentual</TableHead>
                  <TableHead className="text-center">Ativo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan="4" className="text-center">
                      Nenhuma regra configurada.
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {professionals.find((p) => p.id === c.professional_id)?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{getReferenceName(c)}</TableCell>
                      <TableCell className="text-center font-mono">{c.percentual}%</TableCell>
                      <TableCell className="text-center">{c.ativo ? 'Sim' : 'Não'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
