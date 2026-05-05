/**
 * Configuração padrão de cores para abas de visualização da Agenda
 * Garante consistência visual em todas as visualizações (Geral, Profissional, Sala)
 * e suas respectivas visualizações (Dia, Semana, Mês)
 */

export const AGENDA_TABS_COLORS = {
  // Cores para abas ATIVAS
  active: {
    backgroundColor: '#1976d2',
    // Azul padrão
    color: '#ffffff',
    // Branco
    borderColor: '#1976d2',
    fontSize: 13,
    fontWeight: 600
  },
  // Cores para abas INATIVAS
  inactive: {
    backgroundColor: 'transparent',
    color: '#666666',
    // Cinza médio
    borderColor: 'transparent',
    fontSize: 13,
    fontWeight: 600
  },
  // Cores para CONTAINER de abas
  container: {
    background: '#f0f0f0',
    borderRadius: '4px',
    padding: '4px',
    display: 'flex',
    gap: '4px'
  },
  // Cores para abas principais (Geral, Profissional, Sala)
  mainTabs: {
    active: {
      color: '#1976d2',
      borderColor: '#1976d2',
      backgroundColor: '#f0f7ff'
    },
    inactive: {
      color: '#666666',
      borderColor: 'transparent',
      backgroundColor: 'transparent'
    }
  }
};

/**
 * Hook para aplicar estilos padrão de aba
 */
export const getTabStyle = (isActive, useMainTabsStyle = false) => {
  const colors = useMainTabsStyle ? AGENDA_TABS_COLORS.mainTabs : AGENDA_TABS_COLORS;
  const style = isActive ? colors.active : colors.inactive;
  return {
    padding: '8px 12px',
    background: style.backgroundColor,
    color: style.color,
    border: 0,
    borderRadius: 4,
    fontWeight: style.fontWeight,
    cursor: 'pointer',
    fontSize: style.fontSize,
    transition: 'all 0.2s ease'
  };
};

/**
 * Estilos de botão padrão da aplicação
 */
export const PRIMARY_BUTTON_STYLE = {
  padding: '6px 14px',
  background: '#1976d2',
  color: '#fff',
  border: 0,
  borderRadius: 4,
  fontWeight: 600,
  cursor: 'pointer'
};

/**
 * Estilos de input padrão
 */
export const INPUT_STYLE = {
  border: '1px solid #ccc',
  borderRadius: 4,
  padding: '4px 8px',
  fontSize: 14
};