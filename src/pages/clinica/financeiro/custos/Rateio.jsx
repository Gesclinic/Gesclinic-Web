import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Rateio(){
  const [items, setItems] = useState([
    { name:'Aluguel', rows:[] },
    { name:'Energia', rows:[] },
    { name:'Internet', rows:[] },
    { name:'Limpeza', rows:[] },
  ]);
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600">Selecione uma despesa e defina como será rateada entre os centros. Prévia do valor é calculada automaticamente.</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((it, idx) => (
          <div key={idx} className="border rounded-md p-3 space-y-2">
            <div className="font-semibold">{it.name}</div>
            <div className="text-xs text-gray-600">Tipo de rateio (em breve): Percentual • Faturamento • Atendimentos</div>
            <div className="text-sm text-gray-600">Configuração de rateio chegará em breve.</div>
            <Button size="sm" variant="outline" disabled>Configurar Rateio</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

