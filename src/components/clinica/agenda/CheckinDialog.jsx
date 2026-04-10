import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DollarSign, CreditCard, CheckCheck, Landmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { labelForStatus, statusToCanonical } from "@/lib/statusLabels";

const fmtHour = (iso) => iso ? new Date(iso).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : "--:--";
const fmtCurrency = (value) => (value==null||Number.isNaN(+value)) ? null : Number(value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

const statusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "confirmed") return "bg-green-100 text-green-800 border-green-200";
  if (s === "present" || s === "presente") return "bg-teal-100 text-teal-800 border-teal-200";
  if (s === "in_office" || s === "em consultório") return "bg-cyan-100 text-cyan-800 border-cyan-200";
  if (s === "scheduled") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "attended") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "no_show") return "bg-yellow-100 text-yellow-800 border-yellow-200";
  if (s === "cancelled") return "bg-red-100 text-red-800 border-red-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

export default function CheckinDialog({
  open,
  onOpenChange,
  appointment,
  onStatusChange,
  onPayment,
}) {
  const { toast } = useToast();

  if (!appointment) return null;

  const handlePayment = (method) => {
    toast({
      title: "Pagamento Registrado",
      description: `Pagamento com ${method} registrado para ${appointment.patient_name}.`,
    });
    onPayment?.(method);
    onOpenChange(false);
  };
  
  const handleStatusChange = (newStatus) => {
      const realId = appointment.id || appointment.appointment_id;
      if (!realId || String(realId).startsWith('free-')) return;
      onStatusChange?.(realId, newStatus);
  }

  const currentStatusCanonical = statusToCanonical(appointment.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog-shell app-dialog-shell--compact">
        <DialogHeader>
            <DialogTitle>Check-in: {appointment.patient_name}</DialogTitle>
            <DialogDescription>Gerenciar o status e o pagamento do agendamento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p><span className="font-medium">Serviço:</span> {appointment.service_name || "—"}</p>
              <p><span className="font-medium">Convênio:</span> {appointment.payer_name || "—"}</p>
              <p><span className="font-medium">Valor:</span> {fmtCurrency(appointment.price) ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p><span className="font-medium">Status:</span> <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${statusBadge(appointment.status)}`}>
                {labelForStatus(appointment.status) || "—"}
              </span></p>
              <p><span className="font-medium">Horário:</span> {fmtHour(appointment.start_time)}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Alterar Status:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant={currentStatusCanonical === "present" ? "default" : "outline"} onClick={() => handleStatusChange("present")}>Presente</Button>
              <Button variant={currentStatusCanonical === "in_office" ? "default" : "outline"} onClick={() => handleStatusChange("in_office")}>Em Consultório</Button>
              <Button variant={currentStatusCanonical === "confirmed" ? "default" : "outline"} onClick={() => handleStatusChange("confirmed")}>Confirmado</Button>
              <Button variant={currentStatusCanonical === "cancelled" ? "destructive" : "outline"} onClick={() => handleStatusChange("cancelled")}>Cancelar</Button>
            </div>
          </div>

          <div className="border-t pt-4 mt-4 space-y-2">
            <p className="font-semibold">Registrar Pagamento:</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => handlePayment("Dinheiro")}><DollarSign className="w-4 h-4 mr-2"/>Dinheiro</Button>
              <Button variant="outline" onClick={() => handlePayment("Cartão")}><CreditCard className="w-4 h-4 mr-2"/>Cartão</Button>
              <Button variant="outline" onClick={() => handlePayment("Pix")}><CheckCheck className="w-4 h-4 mr-2"/>Pix</Button>
              <Button variant="outline" onClick={() => handlePayment("TED")}><Landmark className="w-4 h-4 mr-2"/>TED</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}