/**
 * Componente de navegação de abas reutilizável para o modal de Convênios
 */
export const TabsNavigation = ({ tabs, activeTab, onTabChange, disabled = false }) => {
  const tabColors = {
    general: 'blue',
    address: 'blue',
    fiscal: 'blue',
    billing: 'orange',
    taxes: 'blue',
    financial: 'green',
    plans: 'purple',
    pricing: 'red',
    tiss: 'purple',
  };

  const getTabColor = (tabId) => {
    const color = tabColors[tabId] || 'blue';
    const colorClasses = {
      blue: 'data-[active]:border-blue-500 data-[active]:text-blue-600',
      orange: 'data-[active]:border-orange-500 data-[active]:text-orange-600',
      green: 'data-[active]:border-green-500 data-[active]:text-green-600',
      purple: 'data-[active]:border-purple-500 data-[active]:text-purple-600',
      red: 'data-[active]:border-red-500 data-[active]:text-red-600',
    };
    return colorClasses[color] || colorClasses.blue;
  };

  return (
    <div className="flex border-b bg-white overflow-x-auto scrollbar-hide">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => !disabled && onTabChange(tab.id)}
          data-active={activeTab === tab.id}
          disabled={disabled}
          className={`
            flex-1 min-w-max px-4 py-3 text-sm font-medium
            border-b-2 border-transparent
            transition-colors duration-200
            hover:bg-gray-50
            focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500
            ${getTabColor(tab.id)}
            ${activeTab === tab.id ? 'border-b-2 font-semibold' : 'text-gray-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabsNavigation;
