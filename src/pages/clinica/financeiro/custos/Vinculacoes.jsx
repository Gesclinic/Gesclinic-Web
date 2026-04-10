import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

export default function Vinculacoes(){
  const [rows, setRows] = useState([]);
  const addRow = () => setRows(prev => [...prev, { item:'', center:'', priority:1, active:true }]);
  return (
    <Tabs defaultValue="servicos" className="space-y-3">
      <TabsList>
        <TabsTrigger value="servicos">Serviços</TabsTrigger>
        <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
        <TabsTrigger value="convenios">Convênios</TabsTrigger>
        <TabsTrigger value="despesas">Despesas</TabsTrigger>
      </TabsList>
      <TabsContent value="servicos">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Defina regras para aplicar centro de custo automaticamente quando um serviço for lançado.</div>
          <Button size="sm" onClick={addRow}>Adicionar Regra</Button>
        </div>
        <div className="mt-2 border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Serviço</th>
                <th className="text-left p-2">Centro</th>
                <th className="text-left p-2">Prioridade</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,idx)=>(
                <tr key={idx} className="border-t">
                  <td className="p-2">—</td>
                  <td className="p-2">—</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2">{r.active ? 'Automática' : 'Inativa'}</td>
                </tr>
              ))}
              {rows.length===0 && (
                <tr><td className="p-4 text-center text-gray-500" colSpan={4}>Nenhuma regra ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>
      <TabsContent value="profissionais"><div className="text-sm text-gray-600">Defina regras por profissional (em breve).</div></TabsContent>
      <TabsContent value="convenios"><div className="text-sm text-gray-600">Defina regras por convênio (em breve).</div></TabsContent>
      <TabsContent value="despesas"><div className="text-sm text-gray-600">Defina regras automáticas para despesas (em breve).</div></TabsContent>
    </Tabs>
  );
}

