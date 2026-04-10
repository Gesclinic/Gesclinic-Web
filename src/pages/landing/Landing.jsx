import React from "react";

export default function Landing() {
  return (
    <div style={{background: "#1766b8", minHeight: "100vh", color: "#fff"}}>
      <div style={{maxWidth: 1200, margin: "0 auto", padding: "60px 20px"}}>
        <h1 style={{fontSize: "2.8em", fontWeight: 700, marginBottom: 20}}>
          Transforme a gestão da sua clínica com o <span style={{color: "#ffe600"}}>Gesclinic Web</span>
        </h1>
        <p style={{fontSize: "1.3em", marginBottom: 40}}>
          Sistema completo de gestão em saúde — com agenda inteligente, faturamento TISS, prontuário eletrônico e controle financeiro.
        </p>
        <button style={{padding: "16px 36px", fontSize: "1.2em", background: "#ffe600", color: "#1766b8", border: "none", borderRadius: 8, fontWeight: 600, cursor: "pointer", marginRight: 16}} onClick={() => window.location.href = "/login"}>
          Comece Agora →
        </button>
        <input style={{padding: "16px 16px", fontSize: "1.2em", borderRadius: 8, border: "none", marginLeft: 8}} placeholder="" />
      </div>
      <div style={{maxWidth: 1200, margin: "0 auto", padding: "40px 20px", background: "#fff", color: "#1766b8", borderRadius: 16}}>
        <h2 style={{fontSize: "2em", fontWeight: 700, marginBottom: 24}}>Tudo o que sua clínica precisa</h2>
        <p style={{fontSize: "1.1em", marginBottom: 32}}>Recursos integrados para uma gestão completa, eficiente e segura.</p>
        <div style={{display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center"}}>
          <div style={{background: "#eaf4fb", borderRadius: 12, padding: 32, minWidth: 220, textAlign: "center"}}>
            <span style={{fontSize: "2em"}}>📅</span>
            <h3 style={{marginTop: 12, fontWeight: 600}}>Agenda Inteligente</h3>
          </div>
          <div style={{background: "#eaf4fb", borderRadius: 12, padding: 32, minWidth: 220, textAlign: "center"}}>
            <span style={{fontSize: "2em"}}>🩺</span>
            <h3 style={{marginTop: 12, fontWeight: 600}}>Prontuário Eletrônico</h3>
          </div>
          <div style={{background: "#eaf4fb", borderRadius: 12, padding: 32, minWidth: 220, textAlign: "center"}}>
            <span style={{fontSize: "2em"}}>💲</span>
            <h3 style={{marginTop: 12, fontWeight: 600}}>Financeiro Integrado</h3>
          </div>
        </div>
      </div>
    </div>
  );
}
