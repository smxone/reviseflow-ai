"use client";

import type { NodeState } from "@/lib/node-state";
import { daysAgo } from "@/lib/node-state";
import { StateBadge } from "./StudyPanel";
import { Markdown } from "./Markdown";

export interface RevisionItem {
  nodeId: string;
  title: string;
  subjectId: string;
  state: NodeState;
  lastStudiedAt: string | null;
  notes: string[];
  corrections: string[];
}

const SUBJECT_LABELS: Record<string, string> = {
  gate_os: "GATE OS",
  dsa: "DSA",
};

export function RevisionSheet({ items, onClose }: { items: RevisionItem[]; onClose: () => void }) {
  if (items.length === 0) {
    return (
      <section className="glass p-8 text-center">
        <p className="eyebrow mb-2">Revision sheet</p>
        <h2 className="text-lg font-semibold tracking-tight">Nothing to revise yet</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Study a few topics first - your revision sheet builds itself from what you actually learn.
        </p>
        <button className="btn-glass mt-5" onClick={onClose}>
          Back to the map
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1">Revision sheet · fading first</p>
          <h2 className="text-lg font-semibold tracking-tight">
            Your own understanding, prioritized by what&apos;s slipping
          </h2>
        </div>
        <button className="btn-glass" onClick={onClose}>
          Back to the map
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <article
            key={item.nodeId}
            className="glass p-5 flex flex-col gap-3"
            style={{
              borderLeft: `3px solid var(--state-${item.state.toLowerCase()})`,
            }}
          >
            <header className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-semibold tracking-tight">{item.title}</h3>
              <StateBadge state={item.state} />
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {SUBJECT_LABELS[item.subjectId] ?? item.subjectId}
                {item.lastStudiedAt && ` · last studied ${daysAgo(new Date(item.lastStudiedAt))}d ago`}
              </span>
            </header>

            {item.notes.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {item.notes.map((note, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: "var(--muted-strong)" }}>
                    <span aria-hidden style={{ color: "var(--accent)" }}>
                      •
                    </span>
                    <Markdown inline>{note}</Markdown>
                  </li>
                ))}
              </ul>
            )}

            {item.corrections.map((correction, i) => (
              <div
                key={i}
                className="glass-subtle p-3 text-sm"
                style={{
                  borderColor: "color-mix(in srgb, var(--state-shaky) 45%, transparent)",
                  color: "var(--muted-strong)",
                }}
              >
                <p
                  className="mb-1 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--state-shaky)" }}
                >
                  Corrected along the way
                </p>
                <Markdown>{correction}</Markdown>
              </div>
            ))}
          </article>
        ))}
      </div>
    </section>
  );
}
