/**
 * Empty State Component
 * Displays when no data is available
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState = React.memo<EmptyStateProps>(({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Icon Container */}
      <div className="mb-4">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Icon className="w-8 h-8 text-slate-400" />
        </div>
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">{title}</h3>

      {/* Description */}
      <p className="text-sm text-gray-600 text-center max-w-sm mb-6">{description}</p>

      {/* Actions */}
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="gap-2">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button variant="outline" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
});

export default EmptyState;
