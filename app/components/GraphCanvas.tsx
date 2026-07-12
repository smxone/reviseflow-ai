"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RoadmapNode } from "@/lib/roadmap-data";
import type { NodeState } from "@/lib/node-state";

// Layered layout by prerequisite depth, computed per subject; each subject's cluster is stacked
// below the previous one so BOTH subjects live on one canvas - required for the Connect beat to
function computeLayout(nodes: RoadmapNode[]): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  const COLUMN_WIDTH = 280;
  const ROW_HEIGHT = 100;
  const CLUSTER_GAP = 170;

  const subjectIds = [...new Set(nodes.map((n) => n.subjectId))];
  let yOffset = 0;

  for (const subjectId of subjectIds) {
    const group = nodes.filter((n) => n.subjectId === subjectId);
    const byId = new Map(group.map((n) => [n.id, n]));
    const depthCache = new Map<string, number>();

    function depthOf(id: string): number {
      if (depthCache.has(id)) return depthCache.get(id)!;
      const node = byId.get(id);
      const prereqs = node?.prerequisiteIds ?? [];
      const depth = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(depthOf));
      depthCache.set(id, depth);
      return depth;
    }

    const columns = new Map<number, string[]>();
    for (const n of group) {
      const d = depthOf(n.id);
      columns.set(d, [...(columns.get(d) ?? []), n.id]);
    }

    let clusterMaxY = 0;
    for (const [depth, ids] of columns) {
      ids.forEach((id, i) => {
        const y = yOffset + i * ROW_HEIGHT + (depth % 2) * 28;
        positions[id] = { x: depth * COLUMN_WIDTH, y };
        clusterMaxY = Math.max(clusterMaxY, y);
      });
    }
    yOffset = clusterMaxY + CLUSTER_GAP;
  }
  return positions;
}

type TopicNodeData = {
  label: string;
  state: NodeState | "Loading";
  isSelected: boolean;
};
type TopicNodeType = Node<TopicNodeData, "topic">;

function TopicNode({ data }: NodeProps<TopicNodeType>) {
  return (
    <div
      className={`topic-node ${data.isSelected ? "topic-node--selected" : ""}`}
      data-state={data.state}
    >
      <Handle type="target" position={Position.Left} />
      <span className="topic-node__dot" />
      <span className="topic-node__label">{data.label}</span>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { topic: TopicNode };

export interface GraphCanvasProps {
  roadmapNodes: RoadmapNode[];
  nodeStates: Record<string, NodeState | "Loading">;
  selectedNodeId: string | null;
  connection: { source: string; target: string } | null;
  onNodeClick: (nodeId: string) => void;
}

export function GraphCanvas({
  roadmapNodes,
  nodeStates,
  selectedNodeId,
  connection,
  onNodeClick,
}: GraphCanvasProps) {
  const layout = useMemo(() => computeLayout(roadmapNodes), [roadmapNodes]);

  const nodes: Node[] = useMemo(
    () =>
      roadmapNodes.map((n) => ({
        id: n.id,
        type: "topic",
        position: layout[n.id] ?? { x: 0, y: 0 },
        data: {
          label: n.title,
          state: nodeStates[n.id] ?? "Loading",
          isSelected: n.id === selectedNodeId,
        },
      })),
    [roadmapNodes, nodeStates, layout, selectedNodeId],
  );

  const edges: Edge[] = useMemo(() => {
    const prereqEdges: Edge[] = roadmapNodes.flatMap((n) =>
      n.prerequisiteIds.map((prereqId) => ({
        id: `${prereqId}->${n.id}`,
        source: prereqId,
        target: n.id,
        style: { stroke: "rgba(255, 255, 255, 0.16)", strokeWidth: 1.5 },
      })),
    );
    if (connection) {
      // The Connect beat: an animated accent edge forming across the map.
      prereqEdges.push({
        id: "connect-edge",
        source: connection.source,
        target: connection.target,
        animated: true,
        className: "connect-edge",
        zIndex: 100,
      });
    }
    return prereqEdges;
  }, [roadmapNodes, connection]);

  return (
    <div style={{ height: 560, width: "100%" }} className="glass overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.35}
        maxZoom={1.4}
        style={{ background: "transparent" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(255,255,255,0.07)" />
      </ReactFlow>
    </div>
  );
}
