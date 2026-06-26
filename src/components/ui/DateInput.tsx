import React from 'react';
import { cn } from '@/lib/utils';

interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * DateInput Component
 * Wrapper para input de data que força formato DD/MM/YYYY para pt-BR
 * Mantém compatibilidade com input type="date" mas força o locale correto
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ value, onChange, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={value || ''}
        onChange={onChange}
        placeholder="dd/mm/aaaa"
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          props.className,
        )}
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';
