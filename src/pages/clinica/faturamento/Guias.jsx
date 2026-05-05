import React from 'react';
import PageLayout from '@/components/ui/PageLayout';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Plus, FileCheck } from 'lucide-react';

export default function Guias() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Faturamento', path: '/clinica/faturamento' },
    { label: 'Guias' },
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Guias TISS"
      subtitle="Gerencie guias de consultas, exames, SADT e procedimentos."
      actions={
        <Button className="bg-blue-600 text-white">
          <Plus className="mr-2 w-4 h-4" /> Nova Guia
        </Button>
      }
    >
      <Card className="p-6 mt-6">
        {/* Filtros */}
        <div className="grid md:grid-cols-5 gap-3 mb-4">
          <Input placeholder="Paciente" />
          <Input placeholder="Número da guia" />

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Convênio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="unimed">Unimed</SelectItem>
              <SelectItem value="bradesco">Bradesco</SelectItem>
            </SelectContent>
          </Select>

          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="pago">Pago</SelectItem>
              <SelectItem value="glosado">Glosado</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Buscar" className="pl-9" />
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Guia</th>
                <th className="px-4 py-2 text-left">Paciente</th>
                <th className="px-4 py-2 text-left">Convênio</th>
                <th className="px-4 py-2 text-left">Data</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Valor</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td colSpan="7" className="text-center py-10 text-gray-500">
                  Nenhuma guia encontrada.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </PageLayout>
  );
}
