import React, { useState, useEffect } from 'react';

export default function GuiaConvenioTab({ guide, onSave }) {
  const [fields, setFields] = useState({
    guide_number: '',
    authorization_code: '',
    type: '',
    valid_until: '',
    status: '',
    observations: '',
  });

  useEffect(() => {
    setFields({
      guide_number: guide.guide_number || '',
      authorization_code: guide.authorization_code || '',
      type: guide.type || '',
      valid_until: guide.valid_until || '',
      status: guide.status || '',
      observations: guide.observations || '',
    });
  }, [guide]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    onSave && onSave(fields);
  };

  return (
    <form className="space-y-3 max-w-md" onSubmit={handleSave}>
      <div>
        <label className="block font-medium">Nº da Guia</label>
        <input
          className="input"
          name="guide_number"
          type="text"
          value={fields.guide_number}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block font-medium">Senha/Autorização</label>
        <input
          className="input"
          name="authorization_code"
          type="text"
          value={fields.authorization_code}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block font-medium">Tipo de Guia</label>
        <input
          className="input"
          name="type"
          type="text"
          value={fields.type}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block font-medium">Validade Senha</label>
        <input
          className="input"
          name="valid_until"
          type="date"
          value={fields.valid_until}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block font-medium">Status Autorização</label>
        <input
          className="input"
          name="status"
          type="text"
          value={fields.status}
          onChange={handleChange}
        />
      </div>
      <div>
        <label className="block font-medium">Observações</label>
        <textarea
          className="input"
          name="observations"
          value={fields.observations}
          onChange={handleChange}
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Salvar Guia
      </button>
    </form>
  );
}
