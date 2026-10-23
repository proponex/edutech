'use client';

import React, { useState } from 'react';

interface TrendItem {
  date: string;
  students?: number;
  teachers?: number;
  parents?: number;
  count?: number;
}

interface SimpleTrendChartProps {
  data: TrendItem[];
  title: string;
  subtitle?: string;
  mode?: 'multi' | 'single';
}

export function SimpleTrendChart({
  data,
  title,
  subtitle,
  mode = 'multi',
}: SimpleTrendChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400 border border-dashed rounded-xl">
        No trend records available for this date range.
      </div>
    );
  }

  // Calculate maximum value for chart scale
  const maxValue = Math.max(
    ...data.map((d) =>
      mode === 'multi'
        ? (d.students || 0) + (d.teachers || 0) + (d.parents || 0)
        : d.count || 0
    ),
    5 // Minimum baseline
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
        </div>

        {mode === 'multi' && (
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-primary-500" />
              <span className="text-neutral-600 dark:text-neutral-400">Students</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
              <span className="text-neutral-600 dark:text-neutral-400">Teachers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
              <span className="text-neutral-600 dark:text-neutral-400">Parents</span>
            </div>
          </div>
        )}
      </div>

      {/* SVG Bar / Area visualization */}
      <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 px-1">
        {data.map((item, idx) => {
          const totalInDay =
            mode === 'multi'
              ? (item.students || 0) + (item.teachers || 0) + (item.parents || 0)
              : item.count || 0;

          const heightPercent = Math.max((totalInDay / maxValue) * 100, 4);

          // For multi-stacked bars
          const studentH = totalInDay > 0 ? ((item.students || 0) / totalInDay) * 100 : 0;
          const teacherH = totalInDay > 0 ? ((item.teachers || 0) / totalInDay) * 100 : 0;
          const parentH = totalInDay > 0 ? ((item.parents || 0) / totalInDay) * 100 : 0;

          const isHovered = hoveredIdx === idx;
          const displayDate = item.date.length > 5 ? item.date.slice(5) : item.date;

          return (
            <div
              key={item.date || idx}
              className="flex-1 h-full flex flex-col justify-end items-center relative group cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div className="absolute bottom-full mb-2 z-20 pointer-events-none bg-neutral-900 text-white text-[11px] py-1.5 px-2.5 rounded-lg shadow-xl whitespace-nowrap border border-neutral-700">
                  <p className="font-semibold">{item.date}</p>
                  {mode === 'multi' ? (
                    <div className="space-y-0.5 mt-1 text-[10px]">
                      <p className="text-primary-400">Students: {item.students || 0}</p>
                      <p className="text-indigo-400">Teachers: {item.teachers || 0}</p>
                      <p className="text-amber-400">Parents: {item.parents || 0}</p>
                      <p className="font-bold border-t border-neutral-700 pt-0.5 mt-0.5">
                        Total: {totalInDay}
                      </p>
                    </div>
                  ) : (
                    <p className="text-primary-400 mt-0.5">Enrollments: {item.count || 0}</p>
                  )}
                </div>
              )}

              {/* Bar */}
              <div
                style={{ height: `${heightPercent}%` }}
                className={`w-full max-w-[28px] rounded-t-md overflow-hidden flex flex-col transition-all duration-150 ${
                  isHovered ? 'ring-2 ring-primary-400 scale-y-105' : 'opacity-90'
                }`}
              >
                {mode === 'multi' ? (
                  <>
                    {parentH > 0 && (
                      <div
                        style={{ height: `${parentH}%` }}
                        className="bg-amber-500 w-full"
                      />
                    )}
                    {teacherH > 0 && (
                      <div
                        style={{ height: `${teacherH}%` }}
                        className="bg-indigo-500 w-full"
                      />
                    )}
                    <div
                      style={{ height: totalInDay === 0 ? '100%' : `${studentH}%` }}
                      className={
                        totalInDay === 0
                          ? 'bg-neutral-200 dark:bg-neutral-800 w-full'
                          : 'bg-primary-500 w-full'
                      }
                    />
                  </>
                ) : (
                  <div
                    className={
                      totalInDay === 0
                        ? 'bg-neutral-200 dark:bg-neutral-800 w-full h-full'
                        : 'bg-gradient-to-t from-primary-600 to-primary-400 w-full h-full'
                    }
                  />
                )}
              </div>

              {/* Date label */}
              <span className="text-[10px] text-neutral-400 mt-2 truncate max-w-full text-center">
                {displayDate}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
