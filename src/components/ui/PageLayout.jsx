import React from 'react';
import Breadcrumbs from './Breadcrumbs';

export default function PageLayout({ title, subtitle, breadcrumbs, actions, children }) {
  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-gray-600 mt-1 max-w-2xl">{subtitle}</p>}
        </div>

        {actions && <div className="mt-4 md:mt-0">{actions}</div>}
      </div>

      {/* Breadcrumb */}
      <Breadcrumbs items={breadcrumbs} />

      {/* Conteúdo */}
      <div>{children}</div>
    </div>
  );
}
