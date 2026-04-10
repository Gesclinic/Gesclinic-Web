
import React from "react";
import { Helmet } from 'react-helmet-async';

export default function Laudos() {
  return (
    <div>
      <Helmet>
        <title>Laudos - Gesclinic</title>
        <meta name="description" content="Crie, revise e gerencie laudos médicos emitidos." />
      </Helmet>
      <h1 className="text-2xl font-semibold text-primary">Laudos</h1>
      <p className="text-gray-600 mt-2">Crie, revise e gerencie laudos médicos emitidos.</p>
    </div>
  );
}
  

