import React from 'react';
import { ChevronRight } from 'lucide-react';

/**
 * Header padrão para todas as páginas de "Base do Sistema"
 *
 * @param {string} category - Categoria (ex: "4.1 Cadastros Estruturais")
 * @param {string} title - Título da página (ex: "Serviços")
 * @param {string} subtitle - Descrição breve do objetivo
 */
export default function BaseSystemHeader({ category, title, subtitle }) {
  return (
    <div className="mb-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-4">
        <span>Base do Sistema</span>
        <ChevronRight size={16} />
        <span>{category}</span>
        <ChevronRight size={16} />
        <span className="text-[hsl(var(--foreground))] font-medium">{title}</span>
      </div>

      {/* Título e Subtítulo */}
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--foreground))] mb-2">{title}</h1>
        {subtitle && <p className="text-[hsl(var(--muted-foreground))]">{subtitle}</p>}
      </div>
    </div>
  );
}
