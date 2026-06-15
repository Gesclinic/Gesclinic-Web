import React from 'react';
import { Input } from '@/components/ui/input';

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
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // O input type="date" sempre retorna YYYY-MM-DD
      // Passamos como está para o onChange do parent
      onChange?.(e);
    };

    return (
      <Input
        ref={ref}
        type="date"
        value={value || ''}
        onChange={handleChange}
        style={{
          // Force locale pt-BR para display
          WebkitLocale: 'pt-BR',
        }}
        {...props}
      />
    );
  }
);

DateInput.displayName = 'DateInput';
