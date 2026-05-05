import { useMemo } from 'react';
import { eachMinuteOfInterval, format, isBefore, isAfter } from 'date-fns';

/**
 * Gera slots de agenda para qualquer profissional.
 * Aceita slots de 5 a 60 minutos.
 *
 * @param {{
 *   start: string, // "08:00"
 *   end: string,   // "18:00"
 *   interval: number, // tamanho do slot em minutos
 *   blocks: Array<{ start: string, end: string }>
 * }} config
 */
export function useScheduleMatrix(config) {
  const { start, end, interval, blocks = [] } = config;

  return useMemo(() => {
    if (!start || !end || !interval) {
      return [];
    }

    const baseDate = new Date();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);

    const from = new Date(baseDate.setHours(sh, sm, 0, 0));
    const to = new Date(baseDate.setHours(eh, em, 0, 0));

    let slots = eachMinuteOfInterval({ start: from, end: to }, { step: interval }).map((d) => ({
      time: format(d, 'HH:mm'),
      date: d,
      available: true,
    }));

    // aplicar bloqueios
    blocks.forEach((block) => {
      const [bh, bm] = block.start.split(':').map(Number);
      const [eh2, em2] = block.end.split(':').map(Number);

      const bStart = new Date(baseDate.setHours(bh, bm, 0, 0));
      const bEnd = new Date(baseDate.setHours(eh2, em2, 0, 0));

      slots = slots.map((s) => {
        if (!isBefore(s.date, bStart) && !isAfter(s.date, bEnd)) {
          return { ...s, available: false, blocked: true };
        }
        return s;
      });
    });

    return slots;
  }, [start, end, interval, blocks]);
}
