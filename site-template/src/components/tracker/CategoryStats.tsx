import { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type WindowEvent,
  formatDuration,
  calculateAppDurations,
  CHART_COLORS,
} from "./shared";

interface Props {
  events: WindowEvent[];
}

export function CategoryStats({ events }: Props) {
  const { data, chartConfig } = useMemo(() => {
    if (events.length === 0) {
      return { data: [], chartConfig: {} as ChartConfig };
    }

    const topApps = calculateAppDurations(events).slice(0, 8);

    const config: ChartConfig = {
      duration: { label: "Duration" },
    };

    const chartData = topApps.map((entry, index) => {
      const key = entry.app.toLowerCase().replace(/\s+/g, "_");
      config[key] = {
        label: entry.app,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };

      return {
        name: entry.app,
        duration: entry.duration,
        key,
        durationLabel: formatDuration(entry.duration),
        fill: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    return { data: chartData, chartConfig: config };
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-stone-400">
        No activity data
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <BarChart
        data={data}
        layout="vertical"
        accessibilityLayer
        margin={{ left: 10, right: 60 }}
      >
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#78716c", fontSize: 12 }}
          width={120}
          tickFormatter={(value) =>
            value.length > 15 ? value.slice(0, 15) + "…" : value
          }
        />
        <ChartTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const data = payload[0].payload;
            return (
              <div className="bg-white border border-stone-200 rounded-lg p-3 shadow-lg">
                <p className="text-stone-900 font-medium">{data.name}</p>
                <p className="text-[#D4735E]">{data.durationLabel}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="duration" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell key={entry.key} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
