import React from 'react';

export default function GesclinicSeal({ variant = 'azul', size = 120, className = '' }) {
  const file = variant === 'dourado' ? '/selo_gesclinic_dourado.svg' : '/selo_gesclinic_azul.svg';

  const shadow =
    variant === 'dourado'
      ? 'drop-shadow(0 0 6px rgba(242, 201, 76, 0.7))'
      : 'drop-shadow(0 0 4px rgba(0, 123, 255, 0.5))';

  return (
    <img
      src={file}
      alt={`Selo Digital Gesclinic (${variant})`}
      style={{
        width: size,
        height: size,
        filter: shadow,
      }}
      className={className}
    />
  );
}
