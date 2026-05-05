import React from 'react';

/**
 * Componente padrão para estado vazio
 *
 * @param {React.ReactNode} icon - Ícone React
 * @param {string} title - Título do estado vazio
 * @param {string} description - Descrição do estado vazio
 * @param {React.ReactNode} action - Botão/CTA para ação inicial
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="text-[hsl(var(--muted-foreground))] mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">{title}</h3>
      <p className="text-sm text-[hsl(var(--muted-foreground))] text-center max-w-sm mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
