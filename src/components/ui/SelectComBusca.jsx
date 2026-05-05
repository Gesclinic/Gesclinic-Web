// src/components/ui/SelectComBusca.jsx
// ============================================================
// Componente Reutilizável de Select com Busca
// Uso: Quando há 50+ itens para selecionar
// ============================================================

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

/**
 * SelectComBusca - Select dropdown com funcionalidade de busca
 *
 * Props:
 * - label (string): Texto da label
 * - placeholder (string): Placeholder do input
 * - options (array): Array de { id, name, description? }
 * - value (string): Valor selecionado (ID)
 * - onChange (function): Callback ao selecionar
 * - disabled (bool): Estado desabilitado
 * - required (bool): Campo obrigatório
 * - searchThreshold (number): Número de itens para mostrar busca (default: 20)
 * - showEmpty (bool): Mostrar opção vazia (default: true)
 * - emptyLabel (string): Texto da opção vazia (default: "Selecione...")
 *
 * Exemplo:
 * <SelectComBusca
 *   label="Serviço"
 *   placeholder="Buscar serviço..."
 *   options={services}
 *   value={selectedServiceId}
 *   onChange={(id) => setSelectedServiceId(id)}
 *   searchThreshold={20}
 * />
 */
export function SelectComBusca({
  label,
  placeholder = 'Buscar...',
  options = [],
  value,
  onChange,
  disabled = false,
  required = false,
  searchThreshold = 20,
  showEmpty = true,
  emptyLabel = 'Selecione...',
  description = null,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Mostrar busca apenas se há muitos itens
  const showSearch = options.length >= searchThreshold;

  // Filtrar opções por busca
  const filtered = showSearch
    ? options.filter(
      (opt) =>
        opt.name.toLowerCase().includes(search.toLowerCase()) ||
          (opt.description && opt.description.toLowerCase().includes(search.toLowerCase())),
    )
    : options;

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focar input de busca quando abre
  useEffect(() => {
    if (isOpen && showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, showSearch]);

  // Obter label do valor selecionado
  const selectedOption = options.find((opt) => opt.id === value);
  const selectedLabel = selectedOption?.name || emptyLabel;

  const handleSelect = (optionId) => {
    onChange(optionId);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 border rounded-lg
          flex items-center justify-between
          text-left transition
          focus:outline-none focus:ring-2 focus:ring-blue-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-50' : 'bg-white hover:bg-gray-50'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-300'}
        `}
      >
        <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>{selectedLabel}</span>
        <div className="flex items-center gap-1">
          {value && !disabled && (
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" onClick={handleClear} />
          )}
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          {showSearch && (
            <div className="p-2 border-b sticky top-0 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={placeholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`
                    w-full pl-9 pr-3 py-2 border rounded-lg
                    text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                    border-gray-300
                  `}
                />
              </div>
            </div>
          )}

          {/* Options List */}
          <ul className="max-h-64 overflow-y-auto">
            {showEmpty && (
              <li>
                <button
                  onClick={() => handleSelect(null)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-blue-50
                    transition
                    ${!value ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}
                  `}
                >
                  {emptyLabel}
                </button>
              </li>
            )}

            {filtered.length > 0 ? (
              filtered.map((option) => (
                <li key={option.id}>
                  <button
                    onClick={() => handleSelect(option.id)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-blue-50
                      transition
                      ${value === option.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}
                    `}
                  >
                    <div>{option.name}</div>
                    {option.description && (
                      <div className="text-xs text-gray-500">{option.description}</div>
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-4 text-center text-sm text-gray-500">
                Nenhum resultado encontrado
              </li>
            )}
          </ul>

          {/* Info Footer */}
          <div className="px-3 py-2 border-t text-xs text-gray-500 bg-gray-50">
            {showSearch && filtered.length > 0 && (
              <>
                Mostrando <strong>{filtered.length}</strong> de <strong>{options.length}</strong>{' '}
                itens
              </>
            )}
            {!showSearch && (
              <>
                <strong>{options.length}</strong> itens disponíveis
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default SelectComBusca;
