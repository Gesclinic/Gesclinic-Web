/**
 * Skeleton Loader Components
 * Professional loading placeholders for enterprise UI
 */

import React from 'react';

/**
 * Animated skeleton pulse effect
 */
const pulseAnimation = 'animate-pulse';

/**
 * Table Row Skeleton
 * Simulates a table row with multiple cells
 */
export const TableRowSkeleton: React.FC = () => (
  <tr className="hover:bg-blue-50/50">
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-24`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-32`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-20`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-24`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-24`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-6 bg-gray-200 rounded-full w-20`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-6 bg-gray-200 rounded-full w-16`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-8`}></div>
    </td>
    <td className="px-6 py-4 border-b border-gray-200">
      <div className="flex gap-2">
        <div className={`${pulseAnimation} h-8 w-8 bg-gray-200 rounded`}></div>
        <div className={`${pulseAnimation} h-8 w-8 bg-gray-200 rounded`}></div>
        <div className={`${pulseAnimation} h-8 w-8 bg-gray-200 rounded`}></div>
      </div>
    </td>
  </tr>
);

/**
 * Table Skeleton
 * Complete table loading state
 */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <table className="w-full">
    <thead className="bg-gray-50 border-b border-gray-200">
      <tr>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-16`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-20`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-16`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-20`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-20`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-20`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-16`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-12`}></div>
        </th>
        <th className="px-6 py-3 text-left">
          <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-16`}></div>
        </th>
      </tr>
    </thead>
    <tbody>
      {Array.from({ length: rows }).map((_, idx) => (
        <TableRowSkeleton key={idx} />
      ))}
    </tbody>
  </table>
);

/**
 * Card Skeleton
 * Single card loading placeholder
 */
export const CardSkeleton: React.FC = () => (
  <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
    <div className="flex items-start justify-between mb-3">
      <div className="flex-1">
        <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-24 mb-2`}></div>
        <div className={`${pulseAnimation} h-6 bg-gray-300 rounded w-32`}></div>
      </div>
      <div className={`${pulseAnimation} h-10 w-10 bg-gray-200 rounded-full`}></div>
    </div>
    <div className="space-y-2">
      <div className={`${pulseAnimation} h-3 bg-gray-200 rounded w-full`}></div>
      <div className={`${pulseAnimation} h-3 bg-gray-200 rounded w-4/5`}></div>
    </div>
  </div>
);

/**
 * Card Grid Skeleton
 * Grid of card loading placeholders
 */
export const CardGridSkeleton: React.FC<{ cards?: number }> = ({ cards = 3 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
    {Array.from({ length: cards }).map((_, idx) => (
      <CardSkeleton key={idx} />
    ))}
  </div>
);

/**
 * Balance Summary Skeleton
 * Loading state for balance summary section
 */
export const BalanceSummarySkeleton: React.FC = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, idx) => (
        <div key={idx} className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className={`${pulseAnimation} h-3 bg-gray-300 rounded w-20 mb-2`}></div>
          <div className={`${pulseAnimation} h-5 bg-gray-400 rounded w-32 mb-1`}></div>
          <div className={`${pulseAnimation} h-3 bg-gray-200 rounded w-24`}></div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-lg p-4 border border-gray-200">
      <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-32 mb-3`}></div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className={`${pulseAnimation} h-3 bg-gray-200 rounded w-24`}></div>
            <div className={`${pulseAnimation} h-3 bg-gray-300 rounded w-16`}></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/**
 * Filters Skeleton
 * Loading state for filter bar
 */
export const FiltersSkeleton: React.FC = () => (
  <div className="flex gap-3 flex-wrap items-center">
    <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-64`}></div>
    <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-40`}></div>
    <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-40`}></div>
    <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-40`}></div>
    <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-24`}></div>
  </div>
);

/**
 * Dashboard Metrics Skeleton
 * Loading state for dashboard metrics
 */
export const DashboardMetricsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, idx) => (
      <div key={idx} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-32 mb-2`}></div>
            <div className={`${pulseAnimation} h-8 bg-gray-300 rounded w-40 mb-2`}></div>
            <div className={`${pulseAnimation} h-3 bg-gray-200 rounded w-28`}></div>
          </div>
          <div className={`${pulseAnimation} h-12 w-12 bg-gray-200 rounded-lg`}></div>
        </div>
      </div>
    ))}
  </div>
);

/**
 * Page Skeleton
 * Complete page loading state
 */
export const PageSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className={`${pulseAnimation} h-8 bg-gray-300 rounded w-64 mb-2`}></div>
        <div className={`${pulseAnimation} h-4 bg-gray-200 rounded w-96`}></div>
      </div>
      <div className="flex gap-2">
        <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-24`}></div>
        <div className={`${pulseAnimation} h-10 bg-gray-200 rounded w-32`}></div>
      </div>
    </div>

    {/* Dashboard */}
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className={`${pulseAnimation} h-6 bg-gray-200 rounded w-32 mb-4`}></div>
      <DashboardMetricsSkeleton />
    </div>

    {/* Balance Summary */}
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className={`${pulseAnimation} h-6 bg-gray-200 rounded w-40 mb-4`}></div>
      <BalanceSummarySkeleton />
    </div>

    {/* Filters */}
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <FiltersSkeleton />
    </div>

    {/* Table */}
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <TableSkeleton />
    </div>

    {/* Recent Movements */}
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className={`${pulseAnimation} h-6 bg-gray-200 rounded w-40 mb-4`}></div>
      <TableSkeleton rows={3} />
    </div>
  </div>
);
