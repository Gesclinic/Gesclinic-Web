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
import { FileSpreadsheet } from 'lucide-react';

export default function RelatoriosFaturamento() {
  const breadcrumbs = useBreadcrumbs([
    { label: 'Faturamento', path: '/clinica/faturamento' },
    { label: 'Relatórios' },
  ]);

  return (
    <PageLayout
      breadcrumbs={breadcrumbs}
      title="Relatórios de Faturamento"
      subtitle="Emita relatórios detalhados para convênios, produção e glosas."
    >
      <Card className="p-6 mt-6">
        {/* Filtros */}
        <div className="grid md:grid-cols-4 gap-3 mb-4">
          <Input type="date" />
          <Input type="date" />

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
              <SelectValue placeholder="Tipo de relatório" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="producao">Produção</SelectItem>
              <SelectItem value="glosas">Glosas</SelectItem>
              <SelectItem value="envio">Envio</SelectItem>
              <SelectItem value="pagamento">Pagamentos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button className="mb-6">
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Gerar Relatório
        </Button>

        <div className="border rounded p-12 text-gray-500 text-center">Nenhum dado encontrado.</div>
      </Card>
    </PageLayout>
  );
}
