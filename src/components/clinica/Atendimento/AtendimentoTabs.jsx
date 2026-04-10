import React from "react";

export default function AtendimentoTabs({ children, activeTab, setActiveTab }) {
  const tabs = [
    { key: "dados", label: "Dados" },
    { key: "guia", label: "Guia Convênio" },
    { key: "evolucao", label: "Evolução" },
    { key: "financeiro", label: "Financeiro" },
    { key: "documentos", label: "Documentos" },
  ];

  return (
    <div>
      <div className="flex border-b mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`px-4 py-2 -mb-px border-b-2 font-medium transition-colors duration-200 focus:outline-none ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-primary"
            }`}
            onClick={() => setActiveTab(tab.key)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
