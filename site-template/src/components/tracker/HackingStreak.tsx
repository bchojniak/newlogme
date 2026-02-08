import { useMemo } from "react";
import { Link } from "react-router-dom";
import { type DailySummary } from "./shared";

interface Props {
  days: DailySummary[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getIntensityColor(intensity: number): string {
  if (intensity === 0) return "bg-stone-100";
  if (intensity < 0.2) return "bg-[#D4735E]/15";
  if (intensity < 0.4) return "bg-[#D4735E]/30";
  if (intensity < 0.6) return "bg-[#D4735E]/50";
  if (intensity < 0.8) return "bg-[#D4735E]/70";
  return "bg-[#D4735E]";
}

export function HackingStreak({ days }: Props) {
  const { cells, maxKeys } = useMemo(() => {
    // Reverse to show chronological order
    const sorted = [...days].reverse();
    const max = Math.max(...sorted.map((d) => d.total_keys), 1);

    return {
      cells: sorted.map((day) => ({
        date: day.logical_date,
        keys: day.total_keys,
        intensity: day.total_keys / max,
      })),
      maxKeys: max,
    };
  }, [days]);

  if (days.length === 0) {
    return (
      <div className="h-[60px] flex items-center justify-center text-stone-400">
        No data available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Grid of cells */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {cells.map((cell) => (
          <Link
            key={cell.date}
            to={`/day/${cell.date}`}
            className="group relative"
          >
            <div
              className={`w-8 h-8 rounded-md ${getIntensityColor(
                cell.intensity
              )} hover:ring-2 hover:ring-[#D4735E]/50 transition-shadow cursor-pointer`}
            />
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              <div className="bg-white border border-stone-200 rounded-lg p-2 shadow-lg whitespace-nowrap">
                <p className="text-stone-900 text-xs font-medium">
                  {formatDate(cell.date)}
                </p>
                <p className="text-[#D4735E] text-xs">
                  {cell.keys.toLocaleString()} keys
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-2 text-xs text-stone-400">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="w-3 h-3 rounded-sm bg-stone-100" />
          <div className="w-3 h-3 rounded-sm bg-[#D4735E]/15" />
          <div className="w-3 h-3 rounded-sm bg-[#D4735E]/30" />
          <div className="w-3 h-3 rounded-sm bg-[#D4735E]/50" />
          <div className="w-3 h-3 rounded-sm bg-[#D4735E]/70" />
          <div className="w-3 h-3 rounded-sm bg-[#D4735E]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}
