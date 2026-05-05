import { useMemo } from 'react';

export function useBreadcrumbs(custom) {
  return useMemo(() => {
    if (!custom || !Array.isArray(custom)) {
      return null;
    }

    return custom.map((c) => ({
      label: c.label,
      path: c.path ?? null,
    }));
  }, [custom]);
}
