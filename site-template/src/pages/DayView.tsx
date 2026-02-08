import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Keyboard,
  Clock,
  FileText,
  Settings,
} from "lucide-react";
import { ActivityTimeline } from "@/components/tracker/ActivityTimeline";
import { KeystrokeChart } from "@/components/tracker/KeystrokeChart";
import { CategoryPieChart } from "@/components/tracker/CategoryPieChart";
import { CategoryStats } from "@/components/tracker/CategoryStats";
import { NotesPanel } from "@/components/tracker/NotesPanel";
import type { DayData, DateInfo } from "@/components/tracker/shared";

export default function DayView() {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();

  const [dayData, setDayData] = useState<DayData | null>(null);
  const [availableDates, setAvailableDates] = useState<DateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [blogContent, setBlogContent] = useState("");
  const [savingBlog, setSavingBlog] = useState(false);

  // Fetch available dates
  useEffect(() => {
    fetch("/api/tracker/dates")
      .then((res) => res.json())
      .then((data) => {
        setAvailableDates(data.dates || []);
      })
      .catch(console.error);
  }, []);

  // Fetch day data
  useEffect(() => {
    if (!date) return;

    setLoading(true);
    fetch(`/api/tracker/day/${date}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!data.window_events) throw new Error("Invalid response");
        setDayData(data);
        setBlogContent(data.blog || "");
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [date]);

  // Navigation helpers
  const currentIndex = availableDates.findIndex((d) => d.logical_date === date);
  const prevDate = currentIndex < availableDates.length - 1 ? availableDates[currentIndex + 1] : null;
  const nextDate = currentIndex > 0 ? availableDates[currentIndex - 1] : null;

  const currentDateInfo = availableDates.find((d) => d.logical_date === date);

  // Calculate stats
  const totalKeystrokes = dayData?.key_events.reduce((sum, e) => sum + e.key_count, 0) || 0;
  const uniqueApps = new Set(dayData?.window_events.map((e) => e.app_name)).size;

  // Save blog
  const handleSaveBlog = async () => {
    if (!date) return;
    setSavingBlog(true);
    try {
      await fetch(`/api/tracker/blog/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: blogContent }),
      });
    } catch (err) {
      console.error(err);
    }
    setSavingBlog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-96 lg:col-span-2" />
            <Skeleton className="h-96" />
          </div>
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
              <Link to="/overview" className="flex items-center gap-2">
                <img src="/favicon.png" alt="Time Tracker" width={28} height={28} className="size-7 rounded" />
                <span className="text-2xl font-bold text-[#D4735E]">
                  Time Tracker
                </span>
              </Link>
              <span className="text-stone-300">/</span>
              <span className="text-stone-600">{currentDateInfo?.label || date}</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => prevDate && navigate(`/day/${prevDate.logical_date}`)}
                disabled={!prevDate}
                aria-label="Previous day"
                className="text-stone-400 hover:text-stone-900"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => nextDate && navigate(`/day/${nextDate.logical_date}`)}
                disabled={!nextDate}
                aria-label="Next day"
                className="text-stone-400 hover:text-stone-900"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
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
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#D4735E]/10">
                  <Keyboard className="h-5 w-5 text-[#D4735E]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {totalKeystrokes.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500">Keystrokes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#2A9D8F]/10">
                  <Clock className="h-5 w-5 text-[#2A9D8F]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {dayData?.window_events.length || 0}
                  </p>
                  <p className="text-sm text-stone-500">Window Events</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#264653]/10">
                  <Calendar className="h-5 w-5 text-[#264653]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">{uniqueApps}</p>
                  <p className="text-sm text-stone-500">Unique Apps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-stone-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#E9C46A]/10">
                  <FileText className="h-5 w-5 text-[#E9C46A]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-900">
                    {dayData?.notes.length || 0}
                  </p>
                  <p className="text-sm text-stone-500">Notes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Timeline - full width on mobile, 2 cols on large */}
          <Card className="lg:col-span-2 border-stone-200">
            <CardHeader>
              <CardTitle className="text-stone-900">Activity Timeline</CardTitle>
              <CardDescription>
                Window activity throughout the day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityTimeline events={dayData?.window_events || []} />
            </CardContent>
          </Card>

          {/* Category pie chart */}
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="text-stone-900">Time Distribution</CardTitle>
              <CardDescription>
                Time spent per application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryPieChart events={dayData?.window_events || []} />
            </CardContent>
          </Card>
        </div>

        {/* Keystroke chart */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Keystroke Activity</CardTitle>
            <CardDescription>
              Typing intensity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KeystrokeChart events={dayData?.key_events || []} />
          </CardContent>
        </Card>

        {/* Bottom grid - stats and notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category stats */}
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="text-stone-900">App Usage</CardTitle>
              <CardDescription>
                Time spent in each application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryStats events={dayData?.window_events || []} />
            </CardContent>
          </Card>

          {/* Notes panel */}
          <Card className="border-stone-200">
            <CardHeader>
              <CardTitle className="text-stone-900">Notes</CardTitle>
              <CardDescription>
                Annotations and reminders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotesPanel
                notes={dayData?.notes || []}
                logicalDate={date || ""}
              />
            </CardContent>
          </Card>
        </div>

        {/* Daily blog */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Daily Log</CardTitle>
            <CardDescription>
              Personal notes and reflections for the day
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={blogContent}
              onChange={(e) => setBlogContent(e.target.value)}
              aria-label="Daily log"
              placeholder="What did you accomplish today? What are you thinking about?"
              className="min-h-[150px] border-stone-200 text-stone-900 placeholder:text-stone-400 resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSaveBlog}
                disabled={savingBlog}
                className="bg-[#D4735E] hover:bg-[#c0654f] text-white"
              >
                {savingBlog ? "Saving..." : "Save Log"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
