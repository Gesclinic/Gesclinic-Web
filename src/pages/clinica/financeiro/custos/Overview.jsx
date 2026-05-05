import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useNavigate } from 'react-router-dom';

function currency(n) {
  const v = Number(n || 0);
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function Overview() {
  const { clinicId } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState([]);
  const [apByCenter, setApByCenter] = useState({});
  const [monthRev, setMonthRev] = useState(0);
  const [monthCost, setMonthCost] = useState(0);

  useEffect(() => {
    if (!clinicId) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const iso = (d) =>
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const [{ data: centersData }, { data: ap }, { data: inv }] = await Promise.all([
          supabase.from('cost_centers').select('*').eq('clinic_id', clinicId).order('name'),
          supabase
            .from('ap_bills')
            .select('cost_center_id, amount, status, due_date')
            .eq('clinic_id', clinicId)
            .gte('due_date', iso(start))
            .lte('due_date', iso(end)),
          supabase
            .from('invoices')
            .select('total, due_date')
            .eq('clinic_id', clinicId)
            .gte('due_date', iso(start))
            .lte('due_date', iso(end)),
        ]);
        setCenters(centersData || []);
        const apMap = {};
        let costSum = 0;
        for (const row of ap || []) {
          const cid = row.cost_center_id || 'uncat';
          apMap[cid] = (apMap[cid] || 0) + Number(row.amount || 0);
          costSum += Number(row.amount || 0);
        }
        setApByCenter(apMap);
        setMonthCost(costSum);
        let rev = 0;
        for (const r of inv || []) {
          rev += Number(r.total || 0);
        }
        setMonthRev(rev);
      } finally {
        setLoading(false);
      }
    })();
  }, [clinicId]);

  const resultado = useMemo(() => Number((monthRev - monthCost).toFixed(2)), [monthRev, monthCost]);

  return (
    <div className="space-y-4">
      {/* Cards topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Centros Ativos</div>
            <div className="text-2xl font-semibold">{centers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Receita (mês)</div>
            <div className="text-2xl font-semibold">{currency(monthRev)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Custos (mês)</div>
            <div className="text-2xl font-semibold">{currency(monthCost)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-gray-500">Resultado</div>
            <div
              className={`text-2xl font-semibold ${resultado >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
            >
              {currency(resultado)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <div className="flex items-center gap-2">
        <Button onClick={() => navigate('/clinica/financeiro/centro-custos/cadastro')}>
          Novo Centro
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/clinica/financeiro/centro-custos/analises')}
        >
          Ver Análise
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/clinica/financeiro/centro-custos/config')}
        >
          Configurações
        </Button>
      </div>

      {/* Tabela resumida */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Centro</th>
              <th className="text-right p-2">Receita</th>
              <th className="text-right p-2">Custos</th>
              <th className="text-right p-2">Resultado</th>
              <th className="text-center p-2">Status</th>
              <th className="text-right p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {centers.map((c) => {
              const receita = 0; // aguardando regras de vinculação
              const custo = Number(apByCenter[c.id] || 0);
              const res = receita - custo;
              return (
                <tr key={c.id} className="border-t hover:bg-muted/40">
                  <td className="p-2">{c.name}</td>
                  <td className="p-2 text-right">{currency(receita)}</td>
                  <td className="p-2 text-right">{currency(custo)}</td>
                  <td
                    className={`p-2 text-right ${res >= 0 ? 'text-emerald-700' : 'text-red-700'}`}
                  >
                    {currency(res)}
                  </td>
                  <td className="p-2 text-center">Ativo</td>
                  <td className="p-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/clinica/financeiro/centro-custos/hierarquia?edit=${c.id}`)
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          navigate(`/clinica/financeiro/centro-custos/analises?center=${c.id}`)
                        }
                      >
                        Ver análise
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
