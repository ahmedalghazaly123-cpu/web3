// ━━━─ LearnPilot Learning Intelligence — Phase 3: Knowledge Graph ━━━─
// Validation + intelligence queries over the knowledge graph.
//
// Validation detects:
//  - prerequisite cycles (DFS on the prerequisite subgraph)
//  - missing edge endpoints (dangling refs)
//  - orphan concepts (no prerequisite/part-of/teaches/related edges)
//  - duplicate relationships (same source+target+kind)
//  - self-loops
// Queries add:
//  - weakestPrerequisite(studentId, nodeId)
//  - nextLearnable(studentId) — concepts whose prerequisites are all met
//  - learningReadiness(studentId, nodeId)

import type { EntityId, GraphNode, KnowledgeGraph } from '../domain';
import { store } from '../services/store.ts';
import { knowledgeGraph } from '../services/knowledge-graph.ts';
import { masteryEngine } from '../services/mastery.ts';

export interface GraphIssue {
  kind: 'cycle' | 'dangling-edge' | 'orphan-node' | 'duplicate-edge' | 'self-loop';
  /** Human-explainable description (English; UI localizes the label). */
  detail: string;
  nodeIds: EntityId[];
}

export interface GraphValidationReport {
  ok: boolean;
  issues: GraphIssue[];
  stats: { nodes: number; edges: number; prerequisites: number };
}

/** Validates graph consistency. Deterministic and side-effect free. */
export function validateGraph(graph: KnowledgeGraph = knowledgeGraph.get()): GraphValidationReport {
  const issues: GraphIssue[] = [];
  const nodeIds = new Set(graph.nodes.map((n) => n.id));

  // dangling edges / self-loops / duplicates
  const seenPairs = new Set<string>();
  for (const e of graph.edges) {
    const missing = [e.source, e.target].filter((id) => !nodeIds.has(id));
    if (missing.length > 0) {
      issues.push({
        kind: 'dangling-edge',
        detail: `Edge ${e.id} (${e.kind}) references missing node(s): ${missing.join(', ')}.`,
        nodeIds: [e.id, ...missing],
      });
    }
    if (e.source === e.target) {
      issues.push({
        kind: 'self-loop',
        detail: `Edge ${e.id} connects node ${e.source} to itself.`,
        nodeIds: [e.source],
      });
    }
    const pairKey = `${e.source}|${e.target}|${e.kind}`;
    if (seenPairs.has(pairKey)) {
      issues.push({
        kind: 'duplicate-edge',
        detail: `Duplicate ${e.kind} relationship ${e.source} → ${e.target} (edge ${e.id}).`,
        nodeIds: [e.id],
      });
    }
    seenPairs.add(pairKey);
  }

  // prerequisite cycles (DFS, iterative, deterministic order)
  const prereqAdj = new Map<EntityId, EntityId[]>();
  for (const e of graph.edges) {
    if (e.kind === 'prerequisite') {
      const list = prereqAdj.get(e.source) ?? [];
      list.push(e.target);
      prereqAdj.set(e.source, list);
    }
  }
  const state = new Map<EntityId, 'visiting' | 'done'>();
  const reportCycle = (startId: EntityId, path: EntityId[]) => {
    const at = path.indexOf(startId);
    const loop = path.slice(at >= 0 ? at : 0).concat(startId);
    issues.push({
      kind: 'cycle',
      detail: `Prerequisite cycle detected: ${loop.join(' → ')}. Learning path would be impossible.`,
      nodeIds: [...new Set(loop)],
    });
  };
  const dfs = (startId: EntityId) => {
    if (state.get(startId) === 'done') return;
    const stack: Array<{ id: EntityId; path: EntityId[] }> = [{ id: startId, path: [] }];
    while (stack.length > 0) {
      const { id, path } = stack.pop()!;
      if (state.get(id) === 'done') continue;
      if (path.includes(id)) {
        reportCycle(id, path);
        continue;
      }
      state.set(id, 'visiting');
      const next = (prereqAdj.get(id) ?? []).filter((n) => nodeIds.has(n));
      if (next.length === 0) {
        state.set(id, 'done');
      } else {
        for (const n of next) stack.push({ id: n, path: [...path, id] });
      }
    }
  };
  for (const n of graph.nodes) dfs(n.id);

  // orphan concepts: concepts/topics with no edges at all
  const connected = new Set<EntityId>();
  for (const e of graph.edges) {
    connected.add(e.source);
    connected.add(e.target);
  }
  for (const n of graph.nodes) {
    if ((n.type === 'concept' || n.type === 'topic' || n.type === 'lesson') && !connected.has(n.id)) {
      issues.push({
        kind: 'orphan-node',
        detail: `${n.type} "${n.id}" (${n.label}) has no relationships — unreachable by traversal.`,
        nodeIds: [n.id],
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    stats: {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      prerequisites: graph.edges.filter((e) => e.kind === 'prerequisite').length,
    },
  };
}


/** Mastery lookup for a student node (0 when unpracticed → treated as unknown). */
function masteryOf(studentId: EntityId, nodeId: EntityId): number {
  return store.mastery.get(studentId, nodeId)?.mastery ?? 0;
}

/**
 * The weakest prerequisite of a node for a student — the best remediation
 * target. Returns undefined when prerequisites are missing or all healthy.
 */
export function weakestPrerequisite(
  studentId: EntityId,
  nodeId: EntityId
): { nodeId: EntityId; node?: GraphNode; mastery: number; baseline: number } | undefined {
  let worst: { nodeId: EntityId; node?: GraphNode; mastery: number; baseline: number } | undefined;
  for (const prereqId of knowledgeGraph.getPrerequisites(nodeId)) {
    const node = knowledgeGraph.getNode(prereqId);
    const baseline = node?.masteryBaseline ?? masteryEngine.thresholds.WEAK_BELOW;
    const mastery = masteryOf(studentId, prereqId);
    const deficit = baseline - mastery;
    if (deficit > 0 && (worst === undefined || deficit > worst.baseline - worst.mastery)) {
      worst = { nodeId: prereqId, node, mastery, baseline };
    }
  }
  return worst;
}

/**
 * Next learnable concepts: prerequisite-satisfied concepts ordered by
 * (lowest mastery first, then difficulty ascending, then id). Deterministic.
 */
export function nextLearnable(studentId: EntityId, limit = 5): GraphNode[] {
  const graph = knowledgeGraph.get();
  const candidates = graph.nodes.filter((n) => n.type === 'concept');
  const learnable: Array<{ node: GraphNode; mastery: number }> = [];
  for (const c of candidates) {
    const prereqs = knowledgeGraph.getPrerequisites(c.id);
    const unmet = prereqs.filter(
      (p) => masteryOf(studentId, p) < (knowledgeGraph.getNode(p)?.masteryBaseline ?? masteryEngine.thresholds.WEAK_BELOW)
    ).length;
    if (unmet === 0) learnable.push({ node: c, mastery: masteryOf(studentId, c.id) });
  }
  return learnable
    .sort(
      (a, b) =>
        a.mastery - b.mastery ||
        (a.node.difficulty ?? 3) - (b.node.difficulty ?? 3) ||
        a.node.id.localeCompare(b.node.id)
    )
    .slice(0, limit)
    .map((x) => x.node);
}

export const graphIntelligence = {
  validate: validateGraph,
  weakestPrerequisite,
  nextLearnable,
  /** True when the student can start learning a node (prereqs met). */
  canLearn(studentId: EntityId, nodeId: EntityId): boolean {
    return knowledgeGraph.hasUnmetPrerequisites(nodeId, (p) => masteryOf(studentId, p)).length === 0;
  },
};
