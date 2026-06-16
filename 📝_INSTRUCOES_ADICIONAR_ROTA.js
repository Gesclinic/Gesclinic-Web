// ============================================================================
// INSTRUÇÕES: Adicionar Rota de Recepção
// ============================================================================
// 
// Arquivo: src/AppRoutes.jsx
// 
// PASSO 1: Adicione import no topo
// ============================================================================

import { lazy } from 'react';

// ... seus outros imports ...

const ReceptionPage = lazy(() =>
  import('@/pages/Reception/ReceptionPage').then((m) => ({
    default: m.ReceptionPage,
  }))
);

// ============================================================================
// PASSO 2: Adicione rota dentro de <ProtectedRoute path="/clinica/agenda">
// ============================================================================
// 
// Encontre a seção de rotas de agenda e adicione:

{
  /* Reception Route */
}
<Route path="recepcao" element={<ReceptionPage />} />;

// ============================================================================
// EXEMPLO COMPLETO (onde adicionar)
// ============================================================================
// 
// <ProtectedRoute path="/clinica/agenda">
//   <Route index element={<AgendaPage />} />
//   <Route path="dia" element={<DayViewPage />} />
//   <Route path="semana" element={<WeekViewPage />} />
//   
//   {/* ADICIONE AQUI: */}
//   <Route path="recepcao" element={<ReceptionPage />} />
//   
//   <Route path="settings" element={<SettingsPage />} />
// </ProtectedRoute>

// ============================================================================
// RESULTADO
// ============================================================================
// 
// URL de acesso:
// http://localhost:3000/clinica/agenda/recepcao
//
// A página aparecerá com:
// - Dashboard operacional (4 seções)
// - Fila de espera (painel lateral)
// - Status realtime
// - Dicas de uso

// ============================================================================
// OPCIONAL: Adicionar link no menu
// ============================================================================
// 
// No componente de navegação/sidebar, adicione:

// <Link to="/clinica/agenda/recepcao" className="flex items-center gap-2">
//   <span>📋</span>
//   <span>Recepção</span>
// </Link>

// ============================================================================
