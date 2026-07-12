"use client";

import { useEffect, useRef } from "react";
import type { RoadmapNode } from "@/lib/roadmap-data";
import { Markdown } from "./Markdown";
import type { NodeState } from "@/lib/node-state";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const STATE_DOT_VAR: Record<NodeState | "Loading", string> = {
  Unstarted: "var(--state-unstarted)",
  Loading: "var(--state-loading)",
  Learning: "var(--state-learning)",
  Shaky: "var(--state-shaky)",
  Mastered: "var(--state-mastered)",
  Fading: "var(--state-fading)",
};

export function StateBadge({ state }: { state: NodeState | "Loading" }) {
  return (
    <span className="chip" style={{ "--dot": STATE_DOT_VAR[state] } as React.CSSProperties}>
      <span className="chip__dot" />
      {state}
    </span>
  );
}

export interface StudyPanelProps {
  node: RoadmapNode;
  state: NodeState | "Loading";
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  error: string | null;
  onInputChange: (value: string) => void;
  onSend: () => void;
}

export function StudyPanel({
  node,
  state,
  messages,
  input,
  sending,
  error,
  onInputChange,
  onSend,
}: StudyPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{node.title}</h2>
        <StateBadge state={state} />
        <p className="basis-full text-sm" style={{ color: "var(--muted)" }}>
          {node.description}
        </p>
      </header>

      <div
        ref={scrollRef}
        className="chat-scroll flex flex-col gap-3 overflow-y-auto pr-1"
        style={{ maxHeight: 340, minHeight: 140 }}
      >
        {messages.length === 0 && !sending && (
          <p className="text-sm my-auto text-center" style={{ color: "var(--muted)" }}>
            Tell ReviseFlow what you just learned about {node.title.toLowerCase()}, or ask it
            anything - every exchange becomes part of your memory map.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "bubble-user" : "bubble-ai"}>
            <Markdown>{m.text}</Markdown>
          </div>
        ))}
        {sending && (
          <div className="bubble-ai typing" aria-label="ReviseFlow is thinking">
            <span className="typing__dot" />
            <span className="typing__dot" />
            <span className="typing__dot" />
          </div>
        )}
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--state-fading)" }}>
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <input
          className="field"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Ask a question or explain what you studied…"
          disabled={sending}
          aria-label="Study message"
        />
        <button className="btn-primary" onClick={onSend} disabled={sending || !input.trim()}>
          {sending ? "Thinking…" : "Send"}
        </button>
      </div>
    </section>
  );
}
