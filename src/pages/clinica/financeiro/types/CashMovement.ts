export type CashMovementStatus = 'confirmado' | 'pendente' | 'estornado';
export type CashMovementType = 'entrada' | 'saida';
export type PayerType = 'particular' | 'convenio';

export type CashMovement = {
  id: string;
  clinic_id: string;
  drawer_id: string;
  type: CashMovementType;
  amount: number;
  patient_id?: string;
  patient?: { name: string };
  professional_id?: string;
  professional?: { name: string };
  service_id?: string;
  service?: { name: string; price?: number };
  payer_type?: PayerType;
  payer_id?: string;
  payer?: { name: string };
  status: CashMovementStatus;
  payment_method: string;
  description?: string;
  origin: 'manual' | 'agenda';
  created_at: string;
  created_by?: string;
};

export type CashMovementInput = {
  type: CashMovementType;
  amount: number;
  patient_id?: string;
  professional_id?: string;
  service_id?: string;
  payer_type?: PayerType;
  payer_id?: string;
  status: CashMovementStatus;
  payment_method: string;
  description?: string;
  origin: 'manual' | 'agenda';
  discount?: number;
};
