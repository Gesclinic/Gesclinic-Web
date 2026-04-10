
import React from "react";
import { Helmet } from 'react-helmet-async';

export default function Prontuario() {
  return (
    <div>
      <Helmet>
        <title>Prontuário - Gesclinic</title>
        <meta name="description" content="Acesse o histórico de atendimentos e registros clínicos." />
      </Helmet>
      <h1 className="text-2xl font-semibold text-primary">Prontuário</h1>
      <p className="text-gray-600 mt-2">Acesse o histórico de atendimentos e registros clínicos.</p>
    </div>
  );
}
  

