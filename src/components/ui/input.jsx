import * as React from 'react';

import { cn } from '@/lib/utils';

const formatIsoToDisplayDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const displayMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (displayMatch) {
    return text;
  }

  return text;
};

const parseDisplayToIsoDate = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return text;
  }

  const displayMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!displayMatch) {
    return '';
  }

  const [, dayText, monthText, yearText] = displayMatch;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);
  const date = new Date(year, month - 1, day);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }

  return `${yearText}-${monthText}-${dayText}`;
};

const maskDisplayDate = (value) => {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const DateInputControl = React.forwardRef(
  ({ className, type, value, onChange, onBlur, placeholder, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(formatIsoToDisplayDate(value));

    React.useEffect(() => {
      setDisplayValue(formatIsoToDisplayDate(value));
    }, [value]);

    const emitIsoChange = React.useCallback(
      (nextIsoValue, nativeEvent) => {
        if (!onChange) return;
        onChange({
          ...nativeEvent,
          target: {
            ...nativeEvent?.target,
            name: props.name,
            value: nextIsoValue,
          },
          currentTarget: {
            ...nativeEvent?.currentTarget,
            name: props.name,
            value: nextIsoValue,
          },
        });
      },
      [onChange, props.name],
    );

    const handleChange = React.useCallback(
      (event) => {
        const maskedValue = maskDisplayDate(event.target.value);
        setDisplayValue(maskedValue);

        if (!maskedValue) {
          emitIsoChange('', event);
          return;
        }

        const isoValue = parseDisplayToIsoDate(maskedValue);
        if (isoValue) {
          emitIsoChange(isoValue, event);
        }
      },
      [emitIsoChange],
    );

    const handleBlur = React.useCallback(
      (event) => {
        const isoValue = parseDisplayToIsoDate(displayValue);
        if (displayValue && !isoValue) {
          setDisplayValue(formatIsoToDisplayDate(value));
        } else if (isoValue) {
          setDisplayValue(formatIsoToDisplayDate(isoValue));
        }
        onBlur?.(event);
      },
      [displayValue, onBlur, value],
    );

    return (
      <input
        type="text"
        inputMode="numeric"
        placeholder={placeholder || 'dd/mm/aaaa'}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  },
);

DateInputControl.displayName = 'DateInputControl';

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  if (type === 'date') {
    return <DateInputControl ref={ref} className={className} type={type} {...props} />;
  }

  return (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export { Input };
