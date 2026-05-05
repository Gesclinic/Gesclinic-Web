import * as React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-4 text-muted-foreground">Página não encontrada.</p>
      <Link to="/" className="mt-6">
        <button className="px-4 py-2 rounded bg-primary text-white">Voltar para a Home</button>
      </Link>
    </div>
  );
}
