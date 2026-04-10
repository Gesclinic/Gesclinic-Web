import React from 'react';
import { useLocation } from 'react-router-dom';

export default function PlaceholderPage({ title }) {
  const location = useLocation();
  
  return (
    <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="p-4 rounded-full bg-muted">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground"
        >
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" x2="12" y1="18" y2="18" />
          <line x1="12" x2="12.01" y1="13" y2="13" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold">{title || 'Página em Construção'}</h1>
      <p className="text-muted-foreground max-w-md">
        A rota <code>{location.pathname}</code> foi configurada, mas o conteúdo ainda está sendo desenvolvido.
      </p>
    </div>
  );
}
