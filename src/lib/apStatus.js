import React from "react";

export const toUiStatus = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'paid': return 'pago';
    case 'canceled': return 'cancelado';
    case 'partial': return 'parcial';
    case 'open':
    default: return 'em aberto';
  }
};

export const uiClassForStatus = (s) => {
  switch ((s || '').toLowerCase()) {
    case 'paid': return 'bg-green-100 text-green-800';
    case 'canceled': return 'bg-zinc-100 text-zinc-800';
    case 'partial': return 'bg-blue-100 text-blue-800';
    case 'open':
    default: return 'bg-amber-100 text-amber-800';
  }
};