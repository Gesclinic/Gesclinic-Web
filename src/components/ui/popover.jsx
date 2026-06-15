import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@/lib/utils';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

/**
 * PopoverContent with option to disable closing on click outside
 * Use closeOnClickOutside={false} to keep the popover open when clicking outside
 */
const PopoverContent = React.forwardRef(
  (
    {
      className,
      side = 'bottom',
      align = 'center',
      sideOffset = 4,
      closeOnClickOutside = true,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        side={side}
        align={align}
        sideOffset={sideOffset}
        onInteractOutside={closeOnClickOutside ? undefined : (e) => e.preventDefault()}
        className={cn(
          'z-[10003] rounded-md border bg-popover text-popover-foreground shadow-md outline-none',
          'animate-in fade-in-0 zoom-in-95',
          className,
        )}
        style={{ display: 'block' }} // ← ESSENCIAL
        {...props}
      />
    </PopoverPrimitive.Portal>
  ),
);

PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent };
