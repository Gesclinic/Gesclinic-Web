import React from 'react';

export default function AgendaTableSkeleton() {
  return (
    <div className="p-4 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40 mb-4" />

      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-gray-100 rounded border" />
        ))}
      </div>
    </div>
  );
}
