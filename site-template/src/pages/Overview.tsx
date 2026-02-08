import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, TrendingUp, Calendar, Keyboard } from "lucide-react";
import { OverviewChart } from "@/components/tracker/OverviewChart";
import { HackingStreak } from "@/components/tracker/HackingStreak";
import type { DateInfo, DailySummary } from "@/components/tracker/shared";

export default function Overview() {
  const [dates, setDates] = useState<DateInfo[]>([]);
  const [overview, setOverview] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/tracker/dates").then((r) => r.json()),
      fetch("/api/tracker/overview?limit=30").then((r) => r.json()),
    ])
      .then(([datesData, overviewData]) => {
        setDates(datesData.dates || []);
        setOverview(overviewData.days || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  // Calculate totals
  const totalKeystrokes = overview.reduce((sum, d) => sum + d.total_keys, 0);
  const avgKeystrokes = overview.length > 0 ? Math.round(totalKeystrokes / overview.length) : 0;
  const activeDays = overview.filter((d) => d.total_keys > 0).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/favicon.png" alt="Time Tracker" width={28} height={28} className="size-7 rounded" />
              <h1 className="text-2xl font-bold text-[#D4735E]">
                Time Tracker
              </h1>
            </div>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-stone-400 hover:text-stone-900"
            >
              <Link to="/settings" aria-label="Settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#D4735E]/10">
                  <Keyboard className="h-6 w-6 text-[#D4735E]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-stone-900">
                    {totalKeystrokes.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500">Total Keystrokes (30 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#2A9D8F]/10">
                  <TrendingUp className="h-6 w-6 text-[#2A9D8F]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-stone-900">
                    {avgKeystrokes.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500">Avg. Daily Keystrokes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-[#264653]/10">
                  <Calendar className="h-6 w-6 text-[#264653]" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-stone-900">{activeDays}</p>
                  <p className="text-sm text-stone-500">Active Days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hacking streak */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Activity Heatmap</CardTitle>
            <CardDescription>
              Daily keystroke intensity over the past 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HackingStreak days={overview} />
          </CardContent>
        </Card>

        {/* Overview chart */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Daily Activity</CardTitle>
            <CardDescription>
              Keystrokes and app usage per day
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OverviewChart days={overview} />
          </CardContent>
        </Card>

        {/* Day list */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Recent Days</CardTitle>
            <CardDescription>
              Click a day to view detailed activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {dates.slice(0, 30).map((dateInfo) => {
                const summary = overview.find(
                  (d) => d.logical_date === dateInfo.logical_date
                );
                return (
                  <Link
                    key={dateInfo.logical_date}
                    to={`/day/${dateInfo.logical_date}`}
                    className="group"
                  >
                    <div className="p-4 rounded-lg bg-stone-50 border border-stone-200 hover:border-[#D4735E]/50 hover:bg-[#D4735E]/5 transition-all">
                      <p className="text-sm font-medium text-stone-700 group-hover:text-[#D4735E] truncate">
                        {dateInfo.label.split(",")[0]}
                      </p>
                      <p className="text-xs text-stone-400 mt-1">
                        {summary?.total_keys?.toLocaleString() || 0} keys
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
