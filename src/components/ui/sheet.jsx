import * as React from 'react';
import { cn } from '@/lib/utils';

export function Sheet({ children, open, onOpenChange }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-all',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
      onClick={() => onOpenChange(false)}
    >
      {children}
    </div>
  );
}

export function SheetContent({ side = 'right', open, onOpenChange, children }) {
  return (
    <div
      className={cn(
        'fixed z-50 bg-white shadow-xl transition-transform duration-300 p-6',
        side === 'right' && 'top-0 right-0 h-full w-[380px]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function SheetHeader({ children }) {
  return <div className="mb-4">{children}</div>;
}

export function SheetTitle({ children }) {
  return <h2 className="text-xl font-semibold">{children}</h2>;
}

export function SheetDescription({ children }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}

export function SheetFooter({ children, className }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 pt-4', className)}>{children}</div>
  );
}
