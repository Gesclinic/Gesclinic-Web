import { useState, useRef } from "react";
import { supabase } from "@/lib/customSupabaseClient";

export default function useDragDrop({ slotSize = 15 }) {
  const [dragging, setDragging] = useState(null);
  const ghostRef = useRef(null);

  // Quantos minutos cada pixel representa
  const pxPerMin = 2; 
  
  const startDrag = (event, appointment) => {
    event.preventDefault();
    setDragging(appointment);

    // Criar ghost element
    const ghost = document.createElement("div");
    ghost.className =
      "fixed bg-blue-600/60 text-white px-3 py-1 rounded shadow z-[9999] pointer-events-none";
    ghost.innerText = appointment.patient_name;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;
  };

  const onDragMove = (event) => {
    if (!dragging || !ghostRef.current) return;
    ghostRef.current.style.left = event.clientX + 10 + "px";
    ghostRef.current.style.top = event.clientY + 10 + "px";
  };

  const endDrag = async (event, dropInfo) => {
    if (ghostRef.current) {
      ghostRef.current.remove();
      ghostRef.current = null;
    }

    if (!dropInfo || !dragging) {
      setDragging(null);
      return;
    }

    const newStart = dropInfo.newStart;
    const newEnd = new Date(newStart.getTime() + dragging.duration * 60000);

    // Enviar mudança para API → passa pelo trigger anti-conflito
    const { error } = await supabase
      .from("appointments")
      .update({
        date: dropInfo.date,
        clinic_id: dropInfo.clinic_id,
        professional_id: dropInfo.professional_id,
        start_time: newStart.toTimeString().slice(0, 8),
        end_time: newEnd.toTimeString().slice(0, 8),
      })
      .eq("id", dragging.id);

    if (error) {
      alert("❌ Conflito: " + error.message);
    }

    setDragging(null);
  };

  const getTimeFromPosition = (y, minStart = 7 * 60) => {
    const minutes = Math.round(y / pxPerMin);
    const snapped = Math.round(minutes / slotSize) * slotSize;
    return minStart + snapped;
  };

  return {
    dragging,
    startDrag,
    onDragMove,
    endDrag,
    getTimeFromPosition,
  };
}
