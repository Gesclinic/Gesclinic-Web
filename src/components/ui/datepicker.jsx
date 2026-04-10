import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { ptBR } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
// import { Calendar } from "@/components/ui/calendar";
import { Calendar } from "react-calendar";

// IMPORTA O POPOVER CORRIGIDO
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

export function DatePicker({ date, onChange }) {
  const safeDate =
    date && !isNaN(new Date(date).getTime()) ? new Date(date) : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !safeDate && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {safeDate
            ? format(safeDate, "dd/MM/yyyy", { locale: ptBR })
            : "Selecione uma data"}
        </Button>
      </PopoverTrigger>

      {/* POPUP FINAL E FUNCIONAL */}
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={4}
        className="w-auto min-w-[300px] max-w-[340px] p-0 rounded-lg shadow-xl border bg-white"
      >
        <div className="p-3">
          <Calendar
            value={safeDate ?? undefined}
            onChange={(v) => onChange(v || null)}
            locale={ptBR}
            className="rounded-md react-calendar"
            style={{ width: 300 }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
