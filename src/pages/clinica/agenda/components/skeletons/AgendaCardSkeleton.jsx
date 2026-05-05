import React from 'react';

export default function AgendaCardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 animate-pulse">
      {[1, 2, 3, 4].map((col) => (
        <div key={col} className="bg-white rounded-xl border p-4 shadow-sm">
          {/* Cabeçalho */}
          <div className="h-6 bg-gray-200 rounded mb-4" />

          {/* Cards */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-gray-100 rounded border" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
