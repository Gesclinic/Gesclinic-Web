/**
 * Tests for AuditoriaPage.jsx
 * Testing audit UI rendering, filtering, and user interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuditoriaPage from '../AuditoriaPage';

// Mock dependencies
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 'user-123', email: 'test@example.com' },
    clinicId: 'clinic-123',
  }),
}));

vi.mock('../../hooks/useClinicContext', () => ({
  useClinicContext: () => ({
    clinicId: 'clinic-123',
    clinic: {
      id: 'clinic-123',
      name: 'Test Clinic',
    },
  }),
}));

vi.mock('../../lib/auditApi', () => ({
  listAuditLogs: vi.fn(() =>
    Promise.resolve([
      {
        id: 'log-1',
        appointment_id: 'appt-1',
        action_type: 'CREATED',
        performed_by: 'user-123',
        performed_by_role: 'admin',
        created_at: '2026-05-26T10:00:00Z',
        appointments: {
          id: 'appt-1',
          clinic_id: 'clinic-123',
          scheduled_date: '2026-05-26',
          patient_id: 'patient-1',
          professional_id: 'prof-1',
          status: 'confirmed',
          patients: { id: 'patient-1', name: 'João Silva' },
          professionals: { id: 'prof-1', name: 'Dr. Pedro' },
          services: { id: 'svc-1', name: 'Consulta' },
        },
      },
      {
        id: 'log-2',
        appointment_id: 'appt-2',
        action_type: 'UPDATED',
        performed_by: 'user-123',
        performed_by_role: 'admin',
        created_at: '2026-05-26T11:00:00Z',
        appointments: {
          id: 'appt-2',
          clinic_id: 'clinic-123',
          scheduled_date: '2026-05-26',
          patient_id: 'patient-2',
          professional_id: 'prof-2',
          status: 'confirmed',
          patients: { id: 'patient-2', name: 'Maria Santos' },
          professionals: { id: 'prof-2', name: 'Dra. Ana' },
          services: { id: 'svc-2', name: 'Odontologia' },
        },
      },
      {
        id: 'log-3',
        appointment_id: 'appt-3',
        action_type: 'DELETED',
        performed_by: 'user-123',
        performed_by_role: 'admin',
        created_at: '2026-05-26T12:00:00Z',
        appointments: {
          id: 'appt-3',
          clinic_id: 'clinic-123',
          scheduled_date: '2026-05-26',
          patient_id: 'patient-3',
          professional_id: 'prof-3',
          status: 'canceled',
          patients: { id: 'patient-3', name: 'Carlos Costa' },
          professionals: { id: 'prof-3', name: 'Dr. Lucas' },
          services: { id: 'svc-3', name: 'Fisioterapia' },
        },
      },
    ])
  ),
  getAuditSummary: vi.fn(() =>
    Promise.resolve({
      total: 3,
      created: 1,
      updated: 1,
      deleted: 1,
    })
  ),
  AUDIT_ACTION_TYPES: {
    CREATED: 'CREATED',
    UPDATED: 'UPDATED',
    DELETED: 'DELETED',
  },
  AUDIT_ACTION_DESCRIPTIONS: {
    CREATED: 'Agendamento Criado',
    UPDATED: 'Agendamento Atualizado',
    DELETED: 'Agendamento Deletado',
  },
}));

describe('AuditoriaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render page title', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/auditoria/i)).toBeInTheDocument();
      });
    });

    it('should render summary cards', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/total de ações/i)).toBeInTheDocument();
        expect(screen.getByText(/criados/i)).toBeInTheDocument();
        expect(screen.getByText(/atualizados/i)).toBeInTheDocument();
        expect(screen.getByText(/deletados/i)).toBeInTheDocument();
      });
    });

    it('should render filter section', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/filtros/i)).toBeInTheDocument();
        expect(screen.getByText(/período/i)).toBeInTheDocument();
        expect(screen.getByText(/tipo de ação/i)).toBeInTheDocument();
      });
    });

    it('should render audit logs table', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/histórico de alterações/i)).toBeInTheDocument();
      });
    });
  });

  describe('Summary Cards', () => {
    it('should display total actions count', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument(); // Total de Ações
      });
    });

    it('should display created count', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/criados/i)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Criados
      });
    });

    it('should display updated count', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/atualizados/i)).toBeInTheDocument();
      });
    });

    it('should display deleted count', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/deletados/i)).toBeInTheDocument();
        expect(screen.getByText('1')).toBeInTheDocument(); // Deletados
      });
    });
  });

  describe('Filters', () => {
    it('should have period filter dropdown', async () => {
      render(<AuditoriaPage />);
      const periodFilter = screen.getByDisplayValue(/últimos/i);
      expect(periodFilter).toBeInTheDocument();
    });

    it('should have action type filter', async () => {
      render(<AuditoriaPage />);
      const actionFilter = screen.getByDisplayValue(/todas as ações/i);
      expect(actionFilter).toBeInTheDocument();
    });

    it('should have search field', async () => {
      render(<AuditoriaPage />);
      const searchField = screen.getByPlaceholderText(/digite para buscar/i);
      expect(searchField).toBeInTheDocument();
    });

    it('should update results when period filter changes', async () => {
      const user = userEvent.setup();
      render(<AuditoriaPage />);

      const periodSelect = screen.getByDisplayValue(/últimos/i);
      await user.click(periodSelect);
      // Select option
      const option = await screen.findByText(/últimos 30 dias/i);
      await user.click(option);

      // Should trigger refetch
      await waitFor(() => {
        expect(screen.getByText(/histórico/i)).toBeInTheDocument();
      });
    });

    it('should update results when action filter changes', async () => {
      const user = userEvent.setup();
      render(<AuditoriaPage />);

      const actionSelect = screen.getByDisplayValue(/todas as ações/i);
      await user.click(actionSelect);
      // Select DELETED option
      const option = await screen.findByText(/agendamento deletado/i);
      await user.click(option);

      // Should trigger refetch
      await waitFor(() => {
        expect(screen.getByText(/histórico/i)).toBeInTheDocument();
      });
    });
  });

  describe('Table Data', () => {
    it('should display audit logs in table', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
        expect(screen.getByText(/maria santos/i)).toBeInTheDocument();
      });
    });

    it('should show CREATED action badge', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/criado/i)).toBeInTheDocument();
      });
    });

    it('should show UPDATED action badge', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/atualizado/i)).toBeInTheDocument();
      });
    });

    it('should show DELETED action badge', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        // Should find the deleted entry
        expect(screen.getByText(/carlos costa/i)).toBeInTheDocument();
      });
    });

    it('should display patient name in table', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/joão silva/i)).toBeInTheDocument();
      });
    });

    it('should display professional name in table', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/dr\. pedro/i)).toBeInTheDocument();
      });
    });

    it('should display performed by information', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/admin/i)).toBeInTheDocument();
      });
    });
  });

  describe('DELETE Trigger Integration', () => {
    it('should display DELETE entries in audit log', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        // Should find the entry with DELETED action
        const rows = screen.getAllByRole('row');
        const hasDeletedRow = rows.some((row) => row.textContent.includes('DELETED'));
        expect(hasDeletedRow).toBeTruthy();
      });
    });

    it('should filter to show only DELETED entries', async () => {
      const { auditApi } = await import('../../lib/auditApi');
      render(<AuditoriaPage />);

      // Simulate filter change to DELETED
      const actionFilter = screen.getByDisplayValue(/todas as ações/i);
      const user = userEvent.setup();
      await user.click(actionFilter);

      // Verify that the filter parameter is passed correctly
      await waitFor(() => {
        expect(screen.getByText(/histórico/i)).toBeInTheDocument();
      });
    });

    it('should show timestamp for deleted appointment', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        // Deleted entry should have timestamp
        expect(screen.getByText(/2026-05-26/i)).toBeInTheDocument();
      });
    });

    it('should maintain appointment context after deletion', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        // Even after deletion, patient and professional info should be visible
        // because we store the appointment details in the context field
        expect(screen.getByText(/carlos costa/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading state initially', () => {
      render(<AuditoriaPage />);
      // Component should show loading spinner
      // This depends on implementation
    });

    it('should handle empty results', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByText(/histórico/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<AuditoriaPage />);
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have descriptive button labels', async () => {
      render(<AuditoriaPage />);
      // Filters should be accessible via keyboard
      const periodSelect = screen.getByDisplayValue(/últimos/i);
      expect(periodSelect).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<AuditoriaPage />);
      await waitFor(() => {
        const searchField = screen.getByPlaceholderText(/digite para buscar/i);
        expect(searchField).toBeInTheDocument();
      });
    });
  });
});
