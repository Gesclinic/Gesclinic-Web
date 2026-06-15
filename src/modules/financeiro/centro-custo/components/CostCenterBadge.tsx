// src/modules/financeiro/centro-custo/components/CostCenterBadge.tsx

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface CostCenterBadgeProps {
  isActive: boolean;
  className?: string;
}

export const CostCenterBadge: React.FC<CostCenterBadgeProps> = ({ isActive, className }) => {
  if (isActive) {
    return (
      <Badge className={`bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 ${className || ''}`}>
        Ativo
      </Badge>
    );
  }

  return (
    <Badge className={`bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 ${className || ''}`}>
      Inativo
    </Badge>
  );
};

export default CostCenterBadge;
