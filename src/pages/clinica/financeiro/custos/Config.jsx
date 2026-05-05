import React, { useEffect, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function Config() {
  const [cfg, setCfg] = useState({
    centerRequired: false,
    defaultByModule: false,
    allowMultiple: false,
    lockAfterClose: false,
  });
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cost_center_cfg');
      if (raw) {
        setCfg(JSON.parse(raw));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('cost_center_cfg', JSON.stringify(cfg));
    } catch {}
  }, [cfg]);
  const Row = ({ label, keyName }) => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={cfg[keyName]}
        onCheckedChange={(v) => setCfg((prev) => ({ ...prev, [keyName]: Boolean(v) }))}
      />
      <Label className="cursor-pointer">{label}</Label>
    </label>
  );
  return (
    <div className="border rounded-md p-3 space-y-2 w-full">
      <Row label="Centro obrigatório em lançamentos" keyName="centerRequired" />
      <Row label="Centro padrão por módulo" keyName="defaultByModule" />
      <Row label="Permitir múltiplos centros" keyName="allowMultiple" />
      <Row label="Travar edição após fechamento" keyName="lockAfterClose" />
    </div>
  );
}
