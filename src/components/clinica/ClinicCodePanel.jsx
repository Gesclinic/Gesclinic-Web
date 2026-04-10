import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext.jsx';
import { Loader2 } from 'lucide-react';

const CODE_RE = /^[A-Z0-9-]{2,12}$/;

export default function ClinicCodePanel() {
  const { clinicId, userType } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState('');
  const [dbCode, setDbCode] = useState('');
  const [autoNumbering, setAutoNumbering] = useState(true);
  const [validityDays, setValidityDays] = useState(30);
  const [template, setTemplate] = useState('padrao');
  const [requireApproval, setRequireApproval] = useState(false);

  const canEdit = userType === 'admin';

  const year = useMemo(() => new Date().getFullYear(), []);
  const preview = useMemo(() => {
    const c = (code || dbCode || 'CLIN').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    return `ORC-${c}-${year}-00001`;
  }, [code, dbCode, year]);

  const load = useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clinic_codes')
        .select('code, auto_numbering, validity_days, template, require_approval')
        .eq('clinic_id', clinicId)
        .maybeSingle();
      if (error) throw error;
      setDbCode(data?.code || '');
      setCode(data?.code || '');
      setAutoNumbering(data?.auto_numbering ?? true);
      setValidityDays(data?.validity_days ?? 30);
      setTemplate(data?.template ?? 'padrao');
      setRequireApproval(data?.require_approval ?? false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Falha ao carregar código da clínica', description: e.message });
    } finally {
      setLoading(false);
    }
  }, [clinicId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!clinicId) {
      toast({ variant: 'destructive', title: 'Clínica não selecionada' });
      return;
    }

    const normalized = (code || '').trim().toUpperCase();
    if (!CODE_RE.test(normalized)) {
      toast({
        variant: 'destructive',
        title: 'Código inválido',
        description: 'Use 2–12 caracteres: A–Z, 0–9 ou hífen.',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinic_codes')
        .upsert({
          clinic_id: clinicId,
          code: normalized,
          auto_numbering: autoNumbering,
          validity_days: validityDays,
          template,
          require_approval: requireApproval,
        })
        .select()
        .maybeSingle();
      if (error) throw error;

      setDbCode(normalized);
      toast({ title: 'Código salvo', description: `Novo prefixo: ${normalized}` });
    } catch (e) {
      // Erro de unicidade (código já usado por outra clínica)
      const isUniqueErr = String(e?.code || '').includes('23505') || /duplicate/i.test(e?.message || '');
      toast({
        variant: 'destructive',
        title: isUniqueErr ? 'Código já utilizado' : 'Falha ao salvar',
        description: isUniqueErr
          ? 'Escolha outro código (ele deve ser único).'
          : e.message,
      });
    } finally {
      setSaving(false);
    }
  }, [clinicId, code, autoNumbering, validityDays, template, requireApproval, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Código da Clínica (prefixo dos orçamentos)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Defina um identificador curto para a clínica. Ele será usado na numeração automática de orçamentos:
          <span className="inline-block font-mono ml-1 px-1 py-0.5 rounded bg-muted">ORC-&lt;CÓDIGO&gt;-{year}-00001</span>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2 space-y-1">
            <Label htmlFor="clinic_code">Código da clínica</Label>
            <Input
              id="clinic_code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ex.: ALFA, CLIN-01"
              disabled={loading || !canEdit}
            />
            <p className="text-xs text-muted-foreground">A–Z, 0–9 e “-”, de 2 a 12 caracteres (ex.: ALFA, CLIN-01)</p>
          </div>

          <div className="space-y-1">
            <Label>Pré-visualização</Label>
            <div className="h-10 px-3 flex items-center rounded border bg-muted font-mono text-sm">
              {preview}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={!canEdit || loading || saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Salvar
          </Button>
          {!canEdit && (
            <span className="text-xs text-muted-foreground">Apenas administradores podem editar.</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}