import React from "react";

export default function DocumentosAtendimentoTab({ documentos }) {
  return (
    <div>
      <ul className="list-disc pl-5">
        {documentos && documentos.length > 0 ? (
          documentos.map((doc, idx) => (
            <li key={idx}>{doc.nome || doc.tipo || 'Documento'} - <a href={doc.url} target="_blank" rel="noopener noreferrer">Visualizar</a></li>
          ))
        ) : (
          <li>Nenhum documento anexado.</li>
        )}
      </ul>
    </div>
  );
}
