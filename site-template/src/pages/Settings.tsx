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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

interface CategoryRule {
  pattern: string;
  category: string;
}

interface Settings {
  title_mappings?: CategoryRule[];
  hacking_categories?: string[];
  day_boundary_hour?: number;
}

export default function Settings() {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Local state for editing
  const [mappings, setMappings] = useState<CategoryRule[]>([]);
  const [hackingCategories, setHackingCategories] = useState<string>("");

  useEffect(() => {
    fetch("/api/tracker/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setMappings(data.title_mappings || []);
        setHackingCategories(
          (data.hacking_categories || []).join(", ")
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleAddMapping = () => {
    setMappings([...mappings, { pattern: "", category: "" }]);
  };

  const handleRemoveMapping = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const handleMappingChange = (
    index: number,
    field: "pattern" | "category",
    value: string
  ) => {
    const updated = [...mappings];
    updated[index][field] = value;
    setMappings(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const hackingCats = hackingCategories
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await fetch("/api/tracker/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title_mappings: mappings.filter(
            (m) => m.pattern && m.category
          ),
          hacking_categories: hackingCats,
        }),
      });

      setMessage("Settings saved successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Failed to save settings");
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-stone-900 p-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-stone-400">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-stone-900">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="text-stone-400 hover:text-stone-900"
            >
              <Link to="/overview" aria-label="Back to overview">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-stone-900">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {message && (
          <div
            role="alert"
            className={`p-4 rounded-lg ${
              message.includes("success")
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message}
          </div>
        )}

        {/* Category Mappings */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Category Mappings</CardTitle>
            <CardDescription>
              Define regex patterns to categorize window titles. First match
              wins, so order matters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1 space-y-2">
                  <Label className="text-stone-500 text-xs">Pattern (regex)</Label>
                  <Input
                    value={mapping.pattern}
                    onChange={(e) =>
                      handleMappingChange(index, "pattern", e.target.value)
                    }
                    placeholder="Google Chrome|Safari"
                    className="border-stone-200 text-stone-900"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label className="text-stone-500 text-xs">Category</Label>
                  <Input
                    value={mapping.category}
                    onChange={(e) =>
                      handleMappingChange(index, "category", e.target.value)
                    }
                    placeholder="Browser"
                    className="border-stone-200 text-stone-900"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveMapping(index)}
                  aria-label="Remove mapping"
                  className="mt-7 text-stone-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddMapping}
              className="w-full border-dashed border-stone-300 text-stone-500 hover:text-stone-900 hover:border-stone-400"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </CardContent>
        </Card>

        {/* Hacking Categories */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Focus Categories</CardTitle>
            <CardDescription>
              Categories considered "focused work" for the activity heatmap.
              Comma-separated.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              value={hackingCategories}
              onChange={(e) => setHackingCategories(e.target.value)}
              placeholder="Coding, Terminal, Editor"
              className="border-stone-200 text-stone-900"
            />
          </CardContent>
        </Card>

        {/* Tracker Info */}
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle className="text-stone-900">Tracker Information</CardTitle>
            <CardDescription>
              Status and configuration of the Time Tracker daemon
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-stone-50 rounded-lg p-4 font-mono text-sm">
              <p className="text-stone-500">
                <span className="text-[#D4735E]">Database:</span>{" "}
                <span className="text-stone-700">data/ulogme.duckdb</span>
              </p>
              <p className="text-stone-500 mt-2">
                <span className="text-[#D4735E]">Day Boundary:</span>{" "}
                <span className="text-stone-700">7:00 AM</span>
              </p>
            </div>

            <div className="text-sm text-stone-500 space-y-1">
              <p>
                To start the tracker:{" "}
                <code className="text-[#D4735E]">uv run python -m tracker start</code>
              </p>
              <p>
                To install as service:{" "}
                <code className="text-[#D4735E]">uv run python -m tracker install</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#D4735E] hover:bg-[#c0654f] text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </main>
    </div>
  );
}
