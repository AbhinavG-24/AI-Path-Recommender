import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { PageHeader, Badge } from "../components/ui";

const SUGGESTIONS = [
  "What should I learn next?",
  "Why do I need statistics?",
  "Can I skip linear algebra?",
  "What project should I build?",
  "How much time will this roadmap take?",
  "What are my biggest skill gaps?",
];

interface Message {
  role: "user" | "assistant";
  text: string;
  groundedOn?: string[];
}

export default function Tutor() {
  const { userId } = useApp();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi! I'm grounded on your profile, skill graph, and resource catalog — ask me anything about your roadmap.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(userId, text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: res.answer, groundedOn: res.grounded_on },
      ]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `Sorry, something went wrong: ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-8 py-10 flex flex-col h-screen">
      <PageHeader title="AI Tutor" subtitle="Grounded answers — never invents course info." />

      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "user"
                  ? "bg-(--color-path) text-white rounded-br-sm"
                  : "bg-(--color-surface) border border-(--color-border) rounded-bl-sm"
              }`}
            >
              <p className="leading-relaxed">{m.text}</p>
              {m.groundedOn && m.groundedOn.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-(--color-border)/50">
                  {m.groundedOn.map((g, gi) => (
                    <Badge key={gi}>{g}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-(--color-muted) text-sm">
            <Sparkles size={14} className="animate-pulse" /> thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs px-2.5 py-1.5 rounded-full border border-(--color-border) text-(--color-muted) hover:text-(--color-text) hover:border-(--color-path) transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your roadmap..."
          className="flex-1 bg-(--color-surface) border border-(--color-border) rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-(--color-path)"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-(--color-path) text-white rounded-lg px-4 flex items-center justify-center disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
