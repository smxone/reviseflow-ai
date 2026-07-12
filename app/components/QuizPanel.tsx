"use client";

import { useState } from "react";
import type { NodeState } from "@/lib/node-state";
import { StateBadge } from "./StudyPanel";
import { Markdown } from "./Markdown";

export interface QuizQuestion {
  nodeId: string;
  title: string;
  state: NodeState;
  rationale: string;
  question: string;
}

interface Graded {
  correct: boolean;
  feedback: string;
}

export interface QuizPanelProps {
  questions: QuizQuestion[];
  onClose: () => void;
  // Lets the page apply the optimistic stateHint + schedule the real refetch for this node.
  onOutcome: (nodeId: string, stateHint: NodeState) => void;
}

export function QuizPanel({ questions, onClose, onOutcome }: QuizPanelProps) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const current = questions[index];

  async function submit() {
    if (!answer.trim() || grading || graded) return;
    setGrading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: current.nodeId, question: current.question, answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Grading failed");
      setGraded({ correct: data.correct, feedback: data.feedback });
      if (data.correct) setScore((s) => s + 1);
      onOutcome(current.nodeId, data.stateHint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGrading(false);
    }
  }

  function next() {
    if (index + 1 >= questions.length) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setAnswer("");
      setGraded(null);
    }
  }

  if (questions.length === 0) {
    return (
      <section className="glass p-8 text-center">
        <p className="eyebrow mb-2">Quiz</p>
        <h2 className="text-lg font-semibold tracking-tight">Nothing is fading yet</h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Study a few topics first - once something starts slipping, ReviseFlow will know exactly
          what to quiz you on.
        </p>
        <button className="btn-glass mt-5" onClick={onClose}>
          Back to the map
        </button>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="glass p-8 text-center">
        <p className="eyebrow mb-2">Quiz complete</p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {score} / {questions.length} correct
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Your answers are now part of your memory - watch the map: topics you got right move
          toward Mastered, misses turn Shaky so revision finds them.
        </p>
        <button className="btn-primary mt-5" onClick={onClose}>
          Back to the map
        </button>
      </section>
    );
  }

  return (
    <section className="glass p-6 flex flex-col gap-4">
      <header className="flex flex-wrap items-center gap-3">
        <p className="eyebrow">
          Quiz · {index + 1} of {questions.length}
        </p>
        <span className="chip" style={{ "--dot": "var(--state-fading)" } as React.CSSProperties}>
          <span className="chip__dot" />
          {current.rationale}
        </span>
      </header>

      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight">{current.title}</h2>
          <StateBadge state={current.state} />
        </div>
        <div className="mt-3 text-[15px] leading-relaxed">
          <Markdown>{current.question}</Markdown>
        </div>
      </div>

      {graded ? (
        <div
          className="glass-subtle p-4"
          style={{
            borderColor: graded.correct
              ? "color-mix(in srgb, var(--state-mastered) 45%, transparent)"
              : "color-mix(in srgb, var(--state-fading) 45%, transparent)",
          }}
        >
          <p
            className="text-sm font-semibold"
            style={{ color: graded.correct ? "var(--state-mastered)" : "var(--state-fading)" }}
          >
            {graded.correct ? "Correct" : "Not quite"}
          </p>
          <div className="mt-1 text-sm" style={{ color: "var(--muted-strong)" }}>
            <Markdown>{graded.feedback}</Markdown>
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          <input
            className="field"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Your answer…"
            disabled={grading}
            aria-label="Quiz answer"
          />
          <button className="btn-primary" onClick={submit} disabled={grading || !answer.trim()}>
            {grading ? "Grading…" : "Submit"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-sm" style={{ color: "var(--state-fading)" }}>
          {error}
        </p>
      )}

      <footer className="flex justify-between">
        <button className="btn-glass" onClick={onClose}>
          Exit quiz
        </button>
        {graded && (
          <button className="btn-primary" onClick={next}>
            {index + 1 >= questions.length ? "See results" : "Next question"}
          </button>
        )}
      </footer>
    </section>
  );
}
