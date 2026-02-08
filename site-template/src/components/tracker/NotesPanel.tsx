import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Clock } from "lucide-react";
import { type Note } from "./shared";

interface Props {
  notes: Note[];
  logicalDate: string;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function NotesPanel({ notes, logicalDate }: Props) {
  const [newNote, setNewNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [localNotes, setLocalNotes] = useState<Note[]>(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !logicalDate) return;

    setAdding(true);
    const timestamp = new Date().toISOString();

    try {
      await fetch("/api/tracker/note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timestamp,
          content: newNote.trim(),
          logical_date: logicalDate,
        }),
      });

      setLocalNotes([...localNotes, { timestamp, content: newNote.trim() }]);
      setNewNote("");
    } catch (err) {
      console.error(err);
    }

    setAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <div className="flex gap-2">
        <Input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          aria-label="New note"
          placeholder="Add a note…"
          className="border-stone-200 text-stone-900 placeholder:text-stone-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
        />
        <Button
          onClick={handleAddNote}
          disabled={adding || !newNote.trim()}
          size="icon"
          aria-label="Add note"
          className="bg-[#D4735E] hover:bg-[#c0654f] text-white shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Notes list */}
      <div className="space-y-2 max-h-[250px] overflow-y-auto">
        {localNotes.length === 0 ? (
          <p className="text-stone-400 text-sm text-center py-4">
            No notes yet. Add one above!
          </p>
        ) : (
          localNotes
            .sort(
              (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
            )
            .map((note, index) => (
              <div
                key={`${note.timestamp}-${index}`}
                className="p-3 rounded-lg bg-stone-50 border border-stone-200"
              >
                <div className="flex items-center gap-2 text-stone-400 text-xs mb-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(note.timestamp)}
                </div>
                <p className="text-stone-700 text-sm">{note.content}</p>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
