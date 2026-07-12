"use client";

import { useCallback, useEffect, useState } from "react";
import { ROADMAP_NODES, getNode } from "@/lib/roadmap-data";
import type { NodeState } from "@/lib/node-state";
import { GraphCanvas } from "@/app/components/GraphCanvas";
import { StudyPanel, StateBadge, type ChatMessage } from "@/app/components/StudyPanel";
import { QuizPanel, type QuizQuestion } from "@/app/components/QuizPanel";
import { RevisionSheet, type RevisionItem } from "@/app/components/RevisionSheet";
import { Logo } from "@/app/components/Logo";

const SUBJECT_LABELS: Record<string, string> = { gate_os: "GATE OS", dsa: "DSA" };
const LEGEND: NodeState[] = ["Unstarted", "Learning", "Shaky", "Mastered", "Fading"];

// After a write, the node's real state isn't in profile() yet (async indexing - see
const REFETCH_DELAY_MS = 4000;

type Panel = "study" | "quiz" | "revision" | null;

interface ConnectionInfo {
  sourceNodeId: string;
  targetNodeId: string;
  targetTitle: string;
  targetSubjectId: string;
  explanation: string;
}

async function fetchNodeState(nodeId: string): Promise<NodeState> {
  const res = await fetch(`/api/node/${nodeId}`);
  const data = await res.json();
  return data.state as NodeState;
}

function OnboardingCard() {
  const steps = [
    { title: "Pick a topic", body: "Click any node on the map above." },
    { title: "Study by chatting", body: "Explain, ask, get corrected - like a tutor who never forgets." },
    { title: "Watch the map remember", body: "Topics change color as you learn, master, and start to forget." },
  ];
  return (
    <section className="glass p-8">
      <p className="eyebrow mb-2">How it works</p>
      <h2 className="text-lg font-semibold tracking-tight mb-6">Click a topic on the map to begin</h2>
      <div className="grid gap-5 sm:grid-cols-3">
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="step-num">{i + 1}</span>
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [nodeStates, setNodeStates] = useState<Record<string, NodeState | "Loading">>({});
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);

  // study chat
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // connect
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);

  // quiz / revision
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [revision, setRevision] = useState<RevisionItem[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState<"quiz" | "revision" | null>(null);

  // Optimistically set a node's state, then reconcile with the real indexed state after a delay.
  const applyOutcome = useCallback((nodeId: string, hint: NodeState) => {
    setNodeStates((prev) => ({ ...prev, [nodeId]: hint }));
    setTimeout(async () => {
      const real = await fetchNodeState(nodeId).catch(() => null);
      if (real) setNodeStates((prev) => ({ ...prev, [nodeId]: real }));
    }, REFETCH_DELAY_MS);
  }, []);

  const loadAllStates = useCallback(async () => {
    const results = await Promise.all(
      ROADMAP_NODES.map(
        async (n) => [n.id, await fetchNodeState(n.id).catch(() => "Unstarted" as NodeState)] as const,
      ),
    );
    setNodeStates(Object.fromEntries(results));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        ROADMAP_NODES.map(
          async (n) => [n.id, await fetchNodeState(n.id).catch(() => "Unstarted" as NodeState)] as const,
        ),
      );
      if (!cancelled) setNodeStates(Object.fromEntries(results));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function selectNode(nodeId: string) {
    setSelectedNodeId(nodeId);
    setPanel("study");
    setMessages([]);
    setError(null);
    setConnection(null);
    setConnectMsg(null);
  }

  async function send() {
    const message = input.trim();
    if (!message || sending || !selectedNodeId) return;

    setMessages((prev) => [...prev, { role: "user", text: message }]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selectedNodeId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      applyOutcome(data.nodeId, data.stateHint);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  async function findConnection() {
    if (!selectedNodeId || connecting) return;
    setConnecting(true);
    setConnection(null);
    setConnectMsg(null);
    try {
      const res = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId: selectedNodeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      if (data.connection) {
        setConnection(data.connection);
      } else {
        setConnectMsg("No strong non-obvious link yet - study more topics and try again.");
      }
    } catch (e) {
      setConnectMsg(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setConnecting(false);
    }
  }

  async function startQuiz() {
    if (loadingGlobal) return;
    setLoadingGlobal("quiz");
    setConnection(null);
    try {
      const res = await fetch("/api/quiz", { method: "POST" });
      const data = await res.json();
      setQuiz(data.questions ?? []);
      setPanel("quiz");
      setSelectedNodeId(null);
    } catch {
      setQuiz([]);
      setPanel("quiz");
    } finally {
      setLoadingGlobal(null);
    }
  }

  async function openRevision() {
    if (loadingGlobal) return;
    setLoadingGlobal("revision");
    setConnection(null);
    try {
      const res = await fetch("/api/revision", { method: "POST" });
      const data = await res.json();
      setRevision(data.items ?? []);
      setPanel("revision");
      setSelectedNodeId(null);
    } catch {
      setRevision([]);
      setPanel("revision");
    } finally {
      setLoadingGlobal(null);
    }
  }

  function closePanel() {
    setPanel(selectedNodeId ? "study" : null);
    // Refresh states after a quiz so the map reflects new outcomes.
    loadAllStates();
  }

  const selectedNode = selectedNodeId ? getNode(selectedNodeId) : null;
  const canvasConnection = connection
    ? { source: connection.sourceNodeId, target: connection.targetNodeId }
    : null;

  return (
    <div className="min-h-screen">
      <header className="glass-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Logo />
            <div className="leading-tight">
              <p className="text-[15px] font-semibold tracking-tight">ReviseFlow</p>
              <p className="text-[11px]" style={{ color: "var(--muted)" }}>
                Never lose your learning flow
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="btn-glass" onClick={openRevision} disabled={loadingGlobal !== null}>
              {loadingGlobal === "revision" ? "Compiling…" : "Revision sheet"}
            </button>
            <button className="btn-primary" onClick={startQuiz} disabled={loadingGlobal !== null}>
              {loadingGlobal === "quiz" ? "Selecting…" : "Quiz what's fading"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 pb-20 pt-10">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Knowledge map · GATE OS · DSA</p>
            <h1 className="text-gradient text-3xl font-semibold tracking-tight">
              Your learning, mapped and remembered.
            </h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: "var(--muted)" }}>
              Study by chatting. ReviseFlow extracts what you learn, tracks each topic&apos;s state,
              connects ideas across subjects, and quizzes what&apos;s fading - all on your machine.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Node state legend">
            {LEGEND.map((s) => (
              <StateBadge key={s} state={s} />
            ))}
          </div>
        </section>

        <GraphCanvas
          roadmapNodes={ROADMAP_NODES}
          nodeStates={nodeStates}
          selectedNodeId={selectedNodeId}
          connection={canvasConnection}
          onNodeClick={selectNode}
        />

        {panel === "quiz" ? (
          <QuizPanel questions={quiz} onClose={closePanel} onOutcome={applyOutcome} />
        ) : panel === "revision" ? (
          <RevisionSheet items={revision} onClose={closePanel} />
        ) : selectedNode ? (
          <div className="flex flex-col gap-4">
            {connection && (
              <div
                className="glass connect-callout p-5 flex flex-col gap-2"
                style={{ borderColor: "color-mix(in srgb, var(--accent-2) 45%, transparent)" }}
              >
                <div className="flex items-center gap-2">
                  <span className="eyebrow" style={{ color: "var(--accent-2)" }}>
                    Connection found
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    → {connection.targetTitle} ({SUBJECT_LABELS[connection.targetSubjectId] ?? connection.targetSubjectId})
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--muted-strong)" }}>
                  {connection.explanation}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button className="btn-glass" onClick={findConnection} disabled={connecting}>
                {connecting ? "Looking…" : "Find a connection"}
              </button>
              {connectMsg && (
                <span className="text-sm" style={{ color: "var(--muted)" }}>
                  {connectMsg}
                </span>
              )}
            </div>

            <StudyPanel
              node={selectedNode}
              state={nodeStates[selectedNode.id] ?? "Loading"}
              messages={messages}
              input={input}
              sending={sending}
              error={error}
              onInputChange={setInput}
              onSend={send}
            />
          </div>
        ) : (
          <OnboardingCard />
        )}
      </main>
    </div>
  );
}
