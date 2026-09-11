// ━━━─ Knowledge Graph Service ━━━─
// Maintains relationships between courses, lessons, concepts, skills, prerequisites,
// questions, mistakes, and learning objectives. Powers prerequisite detection,
// weak-topic discovery, personalized paths, related-topic recommendations,
// AI Tutor context, and adaptive quizzes.

import type {
  EntityId,
  KnowledgeGraph,
  GraphNode,
  GraphEdge,
  MasteryRecord,
} from '../domain';
import { store } from './store.ts';

// ─── initialization ───────────────────────────────────────────────────────────

function ensureGraph(): KnowledgeGraph {
  const existing = store.graph.get();
  if (existing.nodes.length || existing.edges.length) return existing;
  return { nodes: [], edges: [] };
}

// ─── node helpers ─────────────────────────────────────────────────────────────

function findNode(graph: KnowledgeGraph, id: EntityId): GraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function addNode(graph: KnowledgeGraph, node: GraphNode): KnowledgeGraph {
  if (graph.nodes.find((n) => n.id === node.id)) return graph;
  return { ...graph, nodes: [...graph.nodes, node] };
}

// ─── edge helpers ─────────────────────────────────────────────────────────────

function addEdge(graph: KnowledgeGraph, edge: GraphEdge): KnowledgeGraph {
  if (graph.edges.find((e) => e.id === edge.id)) return graph;
  return { ...graph, edges: [...graph.edges, edge] };
}

function edgesOfType(
  graph: KnowledgeGraph,
  source?: EntityId,
  kind?: GraphEdge['kind']
): GraphEdge[] {
  return graph.edges.filter((e) => {
    if (source && e.source !== source) return false;
    if (kind && e.kind !== kind) return false;
    return true;
  });
}

// ─── path queries ─────────────────────────────────────────────────────────────

/** Get all ancestors (prerequisites) of a node, recursively. */
function _getAncestors(
  graph: KnowledgeGraph,
  nodeId: EntityId,
  visited = new Set<EntityId>()
): EntityId[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const results: EntityId[] = [];
  for (const edge of edgesOfType(graph, nodeId, 'prerequisite')) {
    const prereq = edge.target;
    if (!visited.has(prereq)) {
      results.push(prereq);
      results.push(..._getAncestors(graph, prereq, visited));
    }
  }
  return results;
}

// ─── graph building ───────────────────────────────────────────────────────────

/** Add a course node. */
export function _addCourseNode(courseId: EntityId, label: string, labelAr?: string): void {
  const graph = ensureGraph();
  const node: GraphNode = { id: courseId, type: 'course', label, labelAr };
  store.graph.save(addNode(graph, node));
}

/** Add a lesson node linked to a course. */
export function _addLessonNode(
  lessonId: EntityId,
  courseId: EntityId,
  label: string,
  labelAr?: string,
  difficulty?: number
): void {
  const graph = ensureGraph();
  const node: GraphNode = { id: lessonId, type: 'lesson', label, labelAr, courseId, difficulty };
  let updated = addNode(graph, node);
  const edge: GraphEdge = {
    id: `edge-course-${courseId}-${lessonId}`,
    source: lessonId,
    target: courseId,
    kind: 'part-of',
  };
  updated = addEdge(updated, edge);
  store.graph.save(updated);
}

/** Add a concept node. */
export function _addConceptNode(
  conceptId: EntityId,
  label: string,
  labelAr?: string,
  courseId?: EntityId,
  difficulty?: number
): void {
  const graph = ensureGraph();
  const node: GraphNode = { id: conceptId, type: 'concept', label, labelAr, courseId, difficulty };
  store.graph.save(addNode(graph, node));
}

/** Add a skill node. */
export function _addSkillNode(
  skillId: EntityId,
  label: string,
  labelAr?: string,
  _category?: string
): void {
  const graph = ensureGraph();
  const node: GraphNode = { id: skillId, type: 'skill', label, labelAr, difficulty: 1 };
  store.graph.save(addNode(graph, node));
}

/** Link lesson → teaches → concept. */
export function _linkTeaches(lessonId: EntityId, conceptId: EntityId): void {
  const graph = ensureGraph();
  const edge: GraphEdge = {
    id: `edge-teaches-${lessonId}-${conceptId}`,
    source: lessonId,
    target: conceptId,
    kind: 'teaches',
  };
  store.graph.save(addEdge(graph, edge));
}

/** Get all descendants (dependents) of a node. */
function getDescendants(
  graph: KnowledgeGraph,
  nodeId: EntityId,
  visited = new Set<EntityId>()
): EntityId[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);
  const results: EntityId[] = [];
  for (const edge of graph.edges) {
    if (edge.kind === 'prerequisite' && edge.target === nodeId) {
      const dependent = edge.source;
      if (!visited.has(dependent)) {
        results.push(dependent);
        results.push(...getDescendants(graph, dependent, visited));
      }
    }
  }
  return results;
}

/** Get direct prerequisites of a node. */
function getPrerequisites(graph: KnowledgeGraph, nodeId: EntityId): EntityId[] {
  return edgesOfType(graph, nodeId, 'prerequisite').map((e) => e.target);
}

/** Get direct dependents of a node (things that require this). */
function getDependents(graph: KnowledgeGraph, nodeId: EntityId): EntityId[] {
  return graph.edges
    .filter((e) => e.kind === 'prerequisite' && e.target === nodeId)
    .map((e) => e.source);
}

/** Get related nodes. */
function getRelated(graph: KnowledgeGraph, nodeId: EntityId): EntityId[] {
  return edgesOfType(graph, nodeId, 'related').flatMap((e) =>
    e.source === nodeId ? [e.target] : e.target === nodeId ? [e.source] : []
  );
}

// ─── query API ────────────────────────────────────────────────────────────────

export const knowledgeGraph = {
  /** Get the full graph. */
  get: (): KnowledgeGraph => ensureGraph(),

  /** Get a node by id. */
  getNode: (id: EntityId): GraphNode | undefined => findNode(ensureGraph(), id),

  /** Get all ancestors (prerequisites) of a node. */
  getAncestors: (nodeId: EntityId): EntityId[] => _getAncestors(ensureGraph(), nodeId),

  /** Get all descendants (dependents) of a node. */
  getDescendants: (nodeId: EntityId): EntityId[] => getDescendants(ensureGraph(), nodeId),

  /** Get direct prerequisites. */
  getPrerequisites: (nodeId: EntityId): EntityId[] => getPrerequisites(ensureGraph(), nodeId),

  /** Get direct dependents. */
  getDependents: (nodeId: EntityId): EntityId[] => getDependents(ensureGraph(), nodeId),

  /** Get related nodes. */
  getRelated: (nodeId: EntityId): EntityId[] => getRelated(ensureGraph(), nodeId),

  /** Check if a node has unmet prerequisites based on mastery. */
  hasUnmetPrerequisites: (
    nodeId: EntityId,
    masteryCheck: (nodeId: EntityId) => number | undefined
  ): EntityId[] => {
    const prereqs = getPrerequisites(ensureGraph(), nodeId);
    return prereqs.filter((p) => {
      const mastery = masteryCheck(p);
      const node = findNode(ensureGraph(), p);
      const baseline = node?.masteryBaseline ?? 50;
      return mastery === undefined || mastery < baseline;
    });
  },

  /** Find weak topics for a student based on mastery + graph. */
  findWeakTopics: (
    _studentId: EntityId,
    masteryCheck: (nodeId: EntityId) => MasteryRecord | undefined
  ): GraphNode[] => {
    const graph = ensureGraph();
    return graph.nodes
      .filter((n) => n.type === 'concept' || n.type === 'topic')
      .filter((n) => {
        const record = masteryCheck(n.id);
        if (!record) return false;
        return record.mastery < 60 || record.weak === true;
      })
      .sort((a, b) => {
        const ma = masteryCheck(a.id);
        const mb = masteryCheck(b.id);
        return (ma?.mastery ?? 0) - (mb?.mastery ?? 0);
      })
      .slice(0, 10);
  },

  /** Get related concepts for AI Tutor context. */
  getContextForLesson: (lessonId: EntityId): {
    concepts: GraphNode[];
    prerequisites: GraphNode[];
    related: GraphNode[];
  } => {
    const graph = ensureGraph();
    const lesson = findNode(graph, lessonId);
    if (!lesson) return { concepts: [], prerequisites: [], related: [] };

    const conceptIds = new Set<EntityId>();
    for (const edge of edgesOfType(graph, lessonId, 'teaches')) {
      conceptIds.add(edge.target);
    }

    const conceptNodes = Array.from(conceptIds)
      .map((id) => findNode(graph, id))
      .filter(Boolean) as GraphNode[];

    const prereqIds = new Set<EntityId>();
    for (const c of conceptNodes) {
      for (const p of getPrerequisites(graph, c.id)) {
        prereqIds.add(p);
      }
    }
    const prereqNodes = Array.from(prereqIds)
      .map((id) => findNode(graph, id))
      .filter(Boolean) as GraphNode[];

    const relatedNodes = conceptNodes.flatMap((c) =>
      getRelated(graph, c.id).map((id) => findNode(graph, id)).filter(Boolean)
    ) as GraphNode[];

    return { concepts: conceptNodes, prerequisites: prereqNodes, related: relatedNodes };
  },

  /** Reset graph to empty. */
  reset: () => store.graph.save({ nodes: [], edges: [] }),

  seedDemo: (): void => {
    const g = ensureGraph();
    if (g.nodes.length >= 6) return;
    const nodes = [
      { id: 'course-calculus-1', type: 'course', label: 'Calculus I' },
      { id: 'l1', type: 'lesson', label: 'What is a Limit?', courseId: 'course-calculus-1' },
      { id: 'l2', type: 'lesson', label: 'Evaluating Limits Graphically', courseId: 'course-calculus-1' },
      { id: 'l3', type: 'lesson', label: 'Algebraic Limit Laws', courseId: 'course-calculus-1' },
      { id: 'c-limits', type: 'concept', label: 'Limits', courseId: 'course-calculus-1' },
      { id: 'c-deriv', type: 'concept', label: 'Derivatives', courseId: 'course-calculus-1' },
      { id: 'c-cont', type: 'concept', label: 'Continuity', courseId: 'course-calculus-1' },
    ];
    const edges = [
      { id: 'e1', source: 'l3', target: 'c-limits', kind: 'teaches' },
      { id: 'e2', source: 'l1', target: 'c-limits', kind: 'teaches' },
      { id: 'e3', source: 'c-deriv', target: 'c-limits', kind: 'prerequisite' },
      { id: 'e4', source: 'c-limits', target: 'c-cont', kind: 'related' },
    ];
    store.graph.save({ nodes: nodes as never, edges: edges as never });
  },
};

/** Link question → assesses → concept. */
export function _linkAssesses(questionId: EntityId, conceptId: EntityId): void {
  const graph = ensureGraph();
  const edge: GraphEdge = {
    id: `edge-assesses-${questionId}-${conceptId}`,
    source: questionId,
    target: conceptId,
    kind: 'assesses',
  };
  store.graph.save(addEdge(graph, edge));
}

/** Add prerequisite: targetId requires sourceId. */
export function _addPrerequisite(
  targetId: EntityId,
  sourceId: EntityId,
  weight = 1
): void {
  const graph = ensureGraph();
  const edge: GraphEdge = {
    id: `edge-prereq-${sourceId}-${targetId}`,
    source: targetId,
    target: sourceId,
    kind: 'prerequisite',
    weight,
  };
  store.graph.save(addEdge(graph, edge));
}

/** Add related-to link. */
export function _addRelated(sourceId: EntityId, targetId: EntityId): void {
  const graph = ensureGraph();
  const edge: GraphEdge = {
    id: `edge-related-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    kind: 'related',
  };
  store.graph.save(addEdge(graph, edge));
}

/** Link mistake → weakness-linked → concept. */
export function _linkWeakness(mistakeId: EntityId, conceptId: EntityId): void {
  const graph = ensureGraph();
  const edge: GraphEdge = {
    id: `edge-weakness-${mistakeId}-${conceptId}`,
    source: mistakeId,
    target: conceptId,
    kind: 'weakness-linked',
  };
  store.graph.save(addEdge(graph, edge));
}
