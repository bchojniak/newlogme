import { useMemo } from "react";
import { Pie, PieChart, Cell, Label } from "recharts";
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

export function CategoryPieChart({ events }: Props) {
  const { pieData, totalSeconds, chartConfig } = useMemo(() => {
    if (events.length === 0) {
      return { pieData: [], totalSeconds: 0, chartConfig: {} as ChartConfig };
    }

    const allApps = calculateAppDurations(events);
    const topApps = allApps.slice(0, 5);
    const otherDuration = allApps
      .slice(5)
      .reduce((sum, entry) => sum + entry.duration, 0);

    if (otherDuration > 0) {
      topApps.push({ app: "Other", duration: otherDuration });
    }

    const total = topApps.reduce((sum, entry) => sum + entry.duration, 0);

    // Build chart config
    const config: ChartConfig = {
      duration: { label: "Duration" },
    };

    const data = topApps.map((entry, index) => {
      const key = entry.app.toLowerCase().replace(/\s+/g, "_");
      config[key] = {
        label: entry.app,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };

      return {
        name: entry.app,
        value: entry.duration,
        key,
        fill: `var(--color-${key})`,
      };
    });

    return { pieData: data, totalSeconds: total, chartConfig: config };
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-stone-400">
        No activity data
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
      <PieChart>
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="name"
              formatter={(value, name) => {
                const secs = Number(value);
                return (
                  <span>
                    {name}: {formatDuration(secs)}
                  </span>
                );
              }}
            />
          }
        />
        <Pie
          data={pieData}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={90}
          strokeWidth={2}
          stroke="#ffffff"
        >
          {pieData.map((entry, index) => (
            <Cell key={entry.key} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-stone-900 text-2xl font-bold"
                    >
                      {formatDuration(totalSeconds)}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 20}
                      className="fill-stone-400 text-xs"
                    >
                      tracked
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}
