import React, { useState, useEffect } from 'react';
import { AuditMigrationManager } from './AuditMigrationManager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';

/**
 * AuditMigrationPanel - Manages migration of localStorage data to Supabase
 * Allows users to view migration status and manually trigger migration
 */
export function AuditMigrationPanel() {
  const { clinicId, user } = useAuth();
  const [status, setStatus] = useState(null);
  const [migrating, setMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);

  // Check migration status on mount
  useEffect(() => {
    const checkStatus = () => {
      const migrationStatus = AuditMigrationManager.getMigrationStatus();
      setStatus(migrationStatus);
    };

    checkStatus();
  }, []);

  const handleMigrate = async () => {
    setMigrating(true);
    setMigrationResult(null);

    try {
      const result = await AuditMigrationManager.runAllMigrations(clinicId, user?.id);
      setMigrationResult(result);
      
      if (result.success) {
        // Mark migration as completed
        localStorage.setItem('audit_migration_completed', JSON.stringify({
          completedAt: new Date().toISOString(),
          version: 1,
        }));
        
        // Refresh status
        const newStatus = AuditMigrationManager.getMigrationStatus();
        setStatus(newStatus);
      }
    } catch (err) {
      console.error('Migration error:', err);
      setMigrationResult({ success: false, error: err });
    } finally {
      setMigrating(false);
    }
  };

  if (!clinicId) return null;

  return (
    <div className="space-y-4">
      <Card className="p-6 border-2 border-blue-200 bg-blue-50">
        <h3 className="text-lg font-bold text-blue-900 mb-4">📊 Migração de Dados para Supabase</h3>
        
        {/* Status Summary */}
        {status && (
          <div className="space-y-2 mb-4">
            <div className="text-sm">
              <span className={`font-semibold ${status.hasReports ? 'text-orange-600' : 'text-gray-500'}`}>
                📈 Relatórios: {Object.keys(status.hasReports).length > 0 ? '❌ Pendente' : '✅ Migrado'}
              </span>
            </div>
            <div className="text-sm">
              <span className={`font-semibold ${status.hasAlerts ? 'text-orange-600' : 'text-gray-500'}`}>
                🔔 Alertas: {status.hasAlerts ? '❌ Pendente' : '✅ Migrado'}
              </span>
            </div>
            <div className="text-sm">
              <span className={`font-semibold ${status.hasUserEvents ? 'text-orange-600' : 'text-gray-500'}`}>
                👤 Eventos Usuário: {status.hasUserEvents ? '❌ Pendente' : '✅ Migrado'}
              </span>
            </div>
          </div>
        )}

        {/* Migration Explanation */}
        <div className="bg-white p-4 rounded-lg mb-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>O que é?</strong> Esta migração transfere dados armazenados localmente (no seu navegador) 
            para o servidor Supabase, permitindo:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Persistência de dados entre sessões e dispositivos</li>
            <li>Sincronização em tempo real entre múltiplos usuários</li>
            <li>Backups automáticos e segurança de dados</li>
            <li>Análise centralizada de auditoria</li>
          </ul>
        </div>

        {/* Migration Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleMigrate}
            disabled={migrating || (!status?.hasReports && !status?.hasAlerts && !status?.hasUserEvents)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2"
          >
            {migrating ? (
              <>
                <span className="animate-spin">⏳</span>
                Migrando...
              </>
            ) : (
              <>
                ⬆️ Migrar Agora
              </>
            )}
          </Button>
          
          {migrationResult?.success && (
            <div className="flex items-center gap-2 text-green-600 font-semibold">
              <span>✅ {migrationResult.totalMigrated} itens migrados!</span>
            </div>
          )}
          {migrationResult?.error && (
            <div className="flex items-center gap-2 text-red-600 font-semibold">
              <span>❌ Erro: {migrationResult.error.message}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Migration Details */}
      {migrationResult && (
        <Card className="p-4 bg-gray-50">
          <h4 className="font-bold mb-3">Detalhes da Migração:</h4>
          <div className="space-y-2 text-sm">
            {migrationResult.results?.reports?.migrated > 0 && (
              <p className="text-green-600">
                ✅ Relatórios: {migrationResult.results.reports.migrated} migrado(s)
              </p>
            )}
            {migrationResult.results?.alerts?.migrated > 0 && (
              <p className="text-green-600">
                ✅ Alertas: {migrationResult.results.alerts.migrated} migrado(s)
              </p>
            )}
            {migrationResult.results?.userEvents?.migrated > 0 && (
              <p className="text-green-600">
                ✅ Eventos: {migrationResult.results.userEvents.migrated} migrado(s)
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Post-Migration Info */}
      {localStorage.getItem('audit_migration_completed') && (
        <Card className="p-4 bg-green-50 border-2 border-green-200">
          <h4 className="font-bold text-green-900 mb-2">✅ Migração Concluída</h4>
          <p className="text-sm text-green-800">
            Seus dados foram movidos para o Supabase com sucesso! 
            A sincronização em tempo real está ativa. 
            Seus dados agora serão sincronizados automaticamente entre todos os seus dispositivos.
          </p>
        </Card>
      )}
    </div>
  );
}
