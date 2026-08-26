import { useEffect, useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";
import { Badge } from "../components/ui";

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
      text: "Hi! I'm grounded on your profile, skill graph, and resource catalog. Ask me anything about your roadmap.",
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
    <div className="max-w-2xl mx-auto px-10 flex flex-col h-screen">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="py-10 shrink-0 animate-fade-up border-b border-white/5 mb-6">
        <h1 className="text-2xl font-display font-bold tracking-tight" style={{ color: "#FFFFFF" }}>AI Tutor</h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-muted)" }}>
          Grounded answers based entirely on your profile and catalog.
        </p>
      </div>

      {/* ── Messages ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6 pr-2 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-4 mt-0.5"
                style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
              >
                <Sparkles size={14} style={{ color: "#00E5FF" }} />
              </div>
            )}
            <div
              className="max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed"
              style={
                m.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
                      color: "white",
                      borderBottomRightRadius: 4,
                    }
                  : {
                      background: "var(--color-surface)",
                      color: "var(--color-text)",
                      borderBottomLeftRadius: 4,
                    }
              }
            >
              <p>{m.text}</p>
              {m.groundedOn && m.groundedOn.length > 0 && (
                <div
                  className="flex flex-wrap gap-1.5 mt-3 pt-3"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
                >
                  {m.groundedOn.map((g, gi) => (
                    <Badge key={gi} tone="gap">{g}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-4"
              style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)" }}
            >
              <Sparkles size={14} style={{ color: "#00E5FF" }} className="animate-pulse" />
            </div>
            <div
              className="px-5 py-4 rounded-2xl"
              style={{ background: "var(--color-surface)", borderBottomLeftRadius: 4 }}
            >
              <div className="flex items-center gap-1.5 opacity-50" style={{ color: "#00E5FF" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────── */}
      <div className="shrink-0 pb-10 pt-4 bg-gradient-to-t from-black via-black">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="pill-btn text-xs"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="relative"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message AI Tutor..."
            className="w-full text-sm px-5 py-4 pr-14 rounded-2xl outline-none transition-all"
            style={{
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "1px solid var(--color-border)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "rgba(0,229,255,0.4)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
            style={{
              background: "linear-gradient(135deg, #FF0055 0%, #FF3366 100%)",
            }}
          >
            <Send size={15} color="white" />
          </button>
        </form>
      </div>
    </div>
  );
}
