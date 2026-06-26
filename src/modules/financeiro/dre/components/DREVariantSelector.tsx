import React from 'react';
import { Button } from '@/components/ui/button';
import type { DREVariantType } from '@/lib/dreEnterpriseEngine';
import {
  BarChart3,
  Building2,
  Hospital,
  Stethoscope,
  ShieldCheck,
  Factory,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

type Props = {
  value: DREVariantType;
  onChange: (value: DREVariantType) => void;
};

const OPTIONS: Array<{
  value: DREVariantType;
  label: string;
  icon: React.ElementType;
  activeClass: string;
  idleClass: string;
}> = [
  {
    value: 'gerencial',
    label: 'Gerencial',
    icon: BarChart3,
    activeClass: 'bg-slate-900 text-white border-slate-900 shadow-sm',
    idleClass: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  },
  {
    value: 'contabil',
    label: 'Contabil',
    icon: Building2,
    activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-sm',
    idleClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  },
  {
    value: 'centro',
    label: 'Centro de Custo',
    icon: Factory,
    activeClass: 'bg-orange-600 text-white border-orange-600 shadow-sm',
    idleClass: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  {
    value: 'medico',
    label: 'Medico',
    icon: Stethoscope,
    activeClass: 'bg-blue-600 text-white border-blue-600 shadow-sm',
    idleClass: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    value: 'convenio',
    label: 'Convenio',
    icon: ShieldCheck,
    activeClass: 'bg-teal-600 text-white border-teal-600 shadow-sm',
    idleClass: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  },
  {
    value: 'unidade',
    label: 'Unidade',
    icon: Hospital,
    activeClass: 'bg-violet-600 text-white border-violet-600 shadow-sm',
    idleClass: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  },
  {
    value: 'especialidade',
    label: 'Especialidade',
    icon: Sparkles,
    activeClass: 'bg-cyan-700 text-white border-cyan-700 shadow-sm',
    idleClass: 'bg-cyan-50 text-cyan-800 border-cyan-200 hover:bg-cyan-100',
  },
  {
    value: 'projetada',
    label: 'Projetada',
    icon: TrendingUp,
    activeClass: 'bg-amber-600 text-white border-amber-600 shadow-sm',
    idleClass: 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100',
  },
];

export default function DREVariantSelector({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => (
        <span key={option.value} className="inline-flex">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onChange(option.value)}
          className={`gap-2 border transition-all duration-150 ${
            option.value === value ? option.activeClass : option.idleClass
          }`}
        >
          <option.icon className="h-4 w-4" />
          {option.label}
        </Button>
        </span>
      ))}
    </div>
  );
}
