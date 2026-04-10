import { useState } from "react";

export function useDragAppointment() {
  const [dragging, setDragging] = useState(null);

  const startDrag = (appointment) => {
    setDragging(appointment);
  };

  const endDrag = () => {
    setDragging(null);
  };

  return { dragging, startDrag, endDrag };
}
