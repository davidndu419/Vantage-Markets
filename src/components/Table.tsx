/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Loader } from './Loader';

export interface Column<T> {
  header: string;
  key: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  className?: string;
}

export const Table = <T extends { id?: string | number }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  onSort,
  className = '',
}: TableProps<T>) => {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (!onSort) return;
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortKey === key) {
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    }
    setSortKey(key);
    setSortDirection(newDirection);
    onSort(key, newDirection);
  };

  return (
    <div className={`w-full overflow-x-auto rounded-[12px] border border-borderCustom bg-surface ${className}`}>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-borderCustom bg-bgMain/50">
            {columns.map((column, idx) => (
              <th
                key={column.key + idx}
                onClick={() => column.sortable && handleSort(column.key)}
                className={`py-4 px-6 text-xs font-semibold text-textSecondary uppercase tracking-wider ${
                  column.sortable ? 'cursor-pointer hover:text-goldAccent select-none' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{column.header}</span>
                  {column.sortable && sortKey === column.key && (
                    <span className="text-goldAccent">
                      {sortDirection === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-borderCustom/40">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center">
                <Loader variant="inline" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12">
                {emptyState || (
                  <div className="text-center text-textSecondary text-sm font-medium">
                    No data available.
                  </div>
                )}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className="hover:bg-bgMain/20 transition-colors duration-200"
              >
                {columns.map((column, colIdx) => (
                  <td key={colIdx} className="py-4.5 px-6 text-sm font-medium text-textPrimary">
                    {column.render ? column.render(row) : (row as any)[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
