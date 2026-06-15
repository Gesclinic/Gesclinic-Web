import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AuditDashboardWidget } from '@/pages/clinica/auditoria/components/AuditDashboardWidget';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { listAuditLogs } from '@/lib/auditApi';

export default function DashboardAtendimentos() {
  const { clinicId } = useAuth();
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clinicId) return;

    const loadAuditLogs = async () => {
      try {
        // Carregar logs dos últimos 7 dias
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const logs = await listAuditLogs(
          clinicId,
          sevenDaysAgo.toISOString(),
          now.toISOString()
        );

        setAuditLogs(logs || []);
      } catch (error) {
        console.error('Erro ao carregar logs de auditoria:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuditLogs();
  }, [clinicId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>📋 Dashboard de Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">Visão geral dos atendimentos realizados na clínica. (Em breve: gráficos e KPIs)</p>
        </CardContent>
      </Card>

      {/* Audit Dashboard Widget */}
      {!loading && (
        <Card>
          <CardContent className="pt-6">
            <AuditDashboardWidget logs={auditLogs} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
