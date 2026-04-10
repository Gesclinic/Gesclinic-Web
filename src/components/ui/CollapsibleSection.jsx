/**
 * CollapsibleSection.jsx
 * Componente accordion reutilizável para agrupar seções
 * 
 * Objetivo: Reduzir clutter da página mantendo acesso a funcionalidades
 * - Resumo sempre visível
 * - Conteúdo colapsável
 * - Lembra estado (localStorage)
 * - Responsivo
 */

import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
  title,
  icon,
  summary,
  children,
  defaultOpen = false,
  storageKey = null, // Para lembrar estado entre visitas
  variant = 'default', // 'default' | 'compact'
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Carregar estado do localStorage se disponível
  useEffect(() => {
    if (storageKey) {
      try {
        const savedState = localStorage.getItem(storageKey);
        if (savedState !== null) {
          setOpen(JSON.parse(savedState));
        }
      } catch (err) {
        console.warn('Erro ao carregar estado colapsável:', err);
      }
    }
  }, [storageKey]);

  // Salvar estado no localStorage ao mudar
  useEffect(() => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(open));
      } catch (err) {
        console.warn('Erro ao salvar estado colapsável:', err);
      }
    }
  }, [open, storageKey]);

  const toggleOpen = () => setOpen(!open);

  return (
    <div
      className={`
        border rounded-lg bg-white transition-all
        ${variant === 'compact' ? 'border-gray-200' : 'border-gray-300'}
        ${className}
      `}
    >
      {/* Header clicável */}
      <button
        onClick={toggleOpen}
        className={`
          w-full flex justify-between items-center
          transition-colors duration-200
          ${variant === 'compact' 
            ? 'p-3 hover:bg-gray-50' 
            : 'p-4 hover:bg-blue-50'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
        `}
      >
        {/* Título + Ícone */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={variant === 'compact' ? 'text-lg' : 'text-2xl'}>
            {icon}
          </span>
          <div className="text-left min-w-0">
            <h3
              className={`
                font-semibold text-gray-900 truncate
                ${variant === 'compact' ? 'text-sm' : 'text-base'}
              `}
            >
              {title}
            </h3>
          </div>
        </div>

        {/* Resumo + Chevron */}
        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          {summary && (
            <span
              className={`
                text-gray-500 whitespace-nowrap
                ${variant === 'compact' ? 'text-xs hidden sm:inline' : 'text-sm'}
              `}
            >
              {summary}
            </span>
          )}
          <ChevronDown
            size={20}
            className={`
              text-gray-600 transition-transform duration-200
              ${open ? 'rotate-180' : 'rotate-0'}
            `}
          />
        </div>
      </button>

      {/* Conteúdo colapsável */}
      <div
        className={`
          border-t border-gray-200 overflow-hidden
          transition-all duration-300 ease-in-out
          ${open ? 'max-h-[none]' : 'max-h-0'}
        `}
      >
        <div
          className={`
            ${variant === 'compact' ? 'p-3' : 'p-4'}
          `}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook para gerenciar estado de múltiplas seções colapsáveis
 * Útil quando quer sincronizar abertura de várias sections
 */
export function useCollapsibleSections(initialState = {}) {
  const [sections, setSections] = useState(initialState);

  const toggleSection = (sectionId) => {
    setSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const openAll = () => {
    setSections((prev) =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = true;
        return acc;
      }, {})
    );
  };

  const closeAll = () => {
    setSections((prev) =>
      Object.keys(prev).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {})
    );
  };

  return { sections, toggleSection, openAll, closeAll };
}
