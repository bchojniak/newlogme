import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { type DailySummary } from "./shared";

interface Props {
  days: DailySummary[];
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function OverviewChart({ days }: Props) {
  const chartData = useMemo(() => {
    // Reverse to show chronological order (oldest to newest)
    return [...days].reverse().map((day) => ({
      date: day.logical_date,
      dateLabel: formatDate(day.logical_date),
      keystrokes: day.total_keys,
      apps: day.unique_apps,
    }));
  }, [days]);

  const chartConfig = {
    keystrokes: {
      label: "Keystrokes",
      color: "var(--chart-1)",
    },
    apps: {
      label: "Unique Apps",
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig;

  if (days.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-stone-400">
        No data available
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart data={chartData} accessibilityLayer>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="#e7e5e4"
        />
        <XAxis
          dataKey="dateLabel"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#a8a29e", fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#a8a29e", fontSize: 12 }}
          width={50}
          tickFormatter={(value) => {
            if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
            return value.toString();
          }}
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg">
                <p className="text-stone-900 font-medium">{data.dateLabel}</p>
                <p className="text-[#D4735E]">
                  {data.keystrokes.toLocaleString()} keystrokes
                </p>
                <p className="text-[#2A9D8F]">{data.apps} apps</p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="keystrokes"
          fill="var(--color-keystrokes)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  );
}

