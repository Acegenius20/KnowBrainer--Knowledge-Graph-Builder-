import { useEffect, useMemo, useRef, useState } from "react";
import WorkflowNode from "./WorkflowNode";
import WorkflowConnection from "./WorkflowConnection";
import { getConcepts, getRelations, createConcept } from "../../services/api";
import ConceptDetailPanel from "../ConceptDetailPanel";
import { getHighlightedNodes } from "../../utils/search";

const NODE_SIZE = { width: 220, height: 140 };
const nodeTypes = {
  trigger: "trigger",
  concept: "concept",
  insight: "insight",
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const distance = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const layoutGraphNodes = (nodes, edges) => {
  const center = { x: 560, y: 360 };
  const baseRadius = 260;
  const minDistance = 210;
  const angleStep = (Math.PI * 2) / Math.max(nodes.length, 1);
  const positions = new Map();

  nodes.forEach((node, index) => {
    const radius = baseRadius + Math.floor(index / 6) * 140;
    const angle = index * angleStep;
    positions.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  const iterations = 70;
  const repel = 90000;
  const attract = 0.02;
  const ideal = 240;
  const gravity = 0.0025;

  for (let iter = 0; iter < iterations; iter += 1) {
    const forces = new Map(
      nodes.map((node) => [node.id, { x: 0, y: 0 }])
    );

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const posA = positions.get(a.id);
        const posB = positions.get(b.id);
        const dx = posA.x - posB.x;
        const dy = posA.y - posB.y;
        const dist = Math.max(80, Math.sqrt(dx * dx + dy * dy));
        const force = repel / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(a.id).x += fx;
        forces.get(a.id).y += fy;
        forces.get(b.id).x -= fx;
        forces.get(b.id).y -= fy;
      }
    }

    edges.forEach((edge) => {
      const posA = positions.get(edge.from);
      const posB = positions.get(edge.to);
      if (!posA || !posB) return;
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      const dist = Math.max(40, Math.sqrt(dx * dx + dy * dy));
      const delta = (dist - ideal) * attract;
      const fx = (dx / dist) * delta;
      const fy = (dy / dist) * delta;
      forces.get(edge.from).x += fx;
      forces.get(edge.from).y += fy;
      forces.get(edge.to).x -= fx;
      forces.get(edge.to).y -= fy;
    });

    nodes.forEach((node) => {
      const pos = positions.get(node.id);
      const force = forces.get(node.id);
      const toCenterX = center.x - pos.x;
      const toCenterY = center.y - pos.y;
      const nextX = pos.x + force.x + toCenterX * gravity;
      const nextY = pos.y + force.y + toCenterY * gravity;
      positions.set(node.id, {
        x: nextX,
        y: nextY,
      });
    });

    const seen = [];
    nodes.forEach((node) => {
      const pos = positions.get(node.id);
      const existing = seen.find((p) => distance(p, pos) < minDistance);
      if (existing) {
        positions.set(node.id, {
          x: pos.x + (pos.x - existing.x) * 0.18,
          y: pos.y + (pos.y - existing.y) * 0.18,
        });
      }
      seen.push(positions.get(node.id));
    });
  }

  return nodes.map((node) => ({
    ...node,
    position: positions.get(node.id),
  }));
};

const deriveNodeType = (concept, index) => {
  const title = (concept.title || "").toLowerCase();
  if (title.includes("trigger")) return nodeTypes.trigger;
  if (title.includes("insight")) return nodeTypes.insight;
  if (index === 0) return nodeTypes.trigger;
  return nodeTypes.concept;
};

function WorkflowGraph({ onAddNode, refreshKey }) {
  const canvasRef = useRef(null);
  const nodeDragRef = useRef({
    active: false,
    nodeId: null,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const panState = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [conceptsData, setConceptsData] = useState([]);
  const [relationsData, setRelationsData] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [nodeSizes, setNodeSizes] = useState({});
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showRelations, setShowRelations] = useState(true);
  const [createError, setCreateError] = useState("");

  // Fetch graph data (concepts + relations). Extracted so it can be re-used after creating a concept.
  const fetchGraph = async () => {
    try {
      setIsLoading(true);
      const [concepts, relations] = await Promise.all([
        getConcepts(),
        getRelations(),
      ]);

      const conceptIds = new Set(concepts.map((concept) => concept._id));
      const dedupedRelations = [];
      const seenRelations = new Set();

      relations.forEach((relation) => {
        const sourceId = relation.source?._id || relation.source;
        const targetId = relation.target?._id || relation.target;
        const type = relation.type || "related_to";

        if (!conceptIds.has(sourceId) || !conceptIds.has(targetId)) return;

        const key = `${sourceId}-${targetId}-${type}`;
        if (seenRelations.has(key)) return;
        seenRelations.add(key);
        dedupedRelations.push({ ...relation, source: sourceId, target: targetId, type });
      });

      const conceptNodes = concepts.map((concept, index) => ({
        id: concept._id,
        title: concept.displayTitle || concept.title,
        description: concept.description || "No description yet.",
        type: deriveNodeType(concept, index),
      }));

      const edges = dedupedRelations.map((relation, index) => {
        return {
          id: `${relation.source}-${relation.target}-${relation.type}-${index}`,
          from: relation.source,
          to: relation.target,
          type: relation.type,
        };
      });

      const positionedConcepts = layoutGraphNodes(conceptNodes, edges);

      setNodes(positionedConcepts);
      setConnections(edges);
      setConceptsData(concepts);
      setRelationsData(dedupedRelations);
      setError("");
      setViewport({ x: 0, y: 0, scale: 1 });
    } catch (err) {
      console.error("Failed to load workflow graph", err);
      setError("Failed to load graph data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [refreshKey]);

  // Local state for inline add-node form (adds to library and refreshes graph)
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const handleMove = (event) => {
      const drag = nodeDragRef.current;
      if (drag.active) {
        if (drag.pointerId !== null && event.pointerId !== drag.pointerId) {
          return;
        }

        const scale = viewportRef.current.scale || 1;
        const dx = (event.clientX - drag.startX) / scale;
        const dy = (event.clientY - drag.startY) / scale;

        setNodes((prev) =>
          prev.map((node) =>
            node.id === drag.nodeId
              ? {
                  ...node,
                  position: {
                    x: drag.originX + dx,
                    y: drag.originY + dy,
                  },
                }
              : node
          )
        );
        return;
      }

      if (!panState.current.active) return;
      const dx = event.clientX - panState.current.startX;
      const dy = event.clientY - panState.current.startY;
      setViewport((prev) => ({
        ...prev,
        x: panState.current.originX + dx,
        y: panState.current.originY + dy,
      }));
    };

    const handleUp = (event) => {
      if (nodeDragRef.current.active) {
        if (nodeDragRef.current.pointerId === null || event.pointerId === nodeDragRef.current.pointerId) {
          nodeDragRef.current.active = false;
          nodeDragRef.current.nodeId = null;
          nodeDragRef.current.pointerId = null;
        }
      }
      panState.current.active = false;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (event) => {
      if (!event.target.closest(".workflow-canvas")) return;
      event.preventDefault();
      event.stopPropagation();

      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;

      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      const zoomSensitivity = 0.0095;
      const zoomFactor = Math.exp(-delta * zoomSensitivity);

      setViewport((prev) => {
        const nextScale = clamp(prev.scale * zoomFactor, 0.45, 2.4);
        const scaleDiff = nextScale / prev.scale;

        return {
          x: pointerX - (pointerX - prev.x) * scaleDiff,
          y: pointerY - (pointerY - prev.y) * scaleDiff,
          scale: nextScale,
        };
      });
    };

    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => {
      window.removeEventListener("wheel", handleWheel, true);
    };
  }, []);

  const handlePanStart = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest(".workflow-node")) return;
    panState.current = {
      active: true,
      startX: event.clientX,
      startY: event.clientY,
      originX: viewport.x,
      originY: viewport.y,
    };
  };

  const handleCenter = () => {
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  const handleResetLayout = () => {
    setNodes((prev) => layoutGraphNodes(prev, connections));
    setViewport({ x: 0, y: 0, scale: 1 });
  };

  const handleNodePointerDown = (nodeId, event) => {
    if (event.button !== 0) return;
    const current = nodes.find((node) => node.id === nodeId);
    if (!current) return;

    event.preventDefault();
    event.stopPropagation();

    nodeDragRef.current = {
      active: true,
      nodeId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: current.position.x,
      originY: current.position.y,
    };
  };

  const handleNodeSizeChange = (nodeId, size) => {
    setNodeSizes((prev) => {
      const current = prev[nodeId];
      if (current && current.width === size.width && current.height === size.height) {
        return prev;
      }
      return { ...prev, [nodeId]: size };
    });
  };

  const activeConnections = useMemo(() => {
    if (!selectedNode) return new Set();
    return new Set(
      connections
        .filter((connection) =>
          [connection.from, connection.to].includes(selectedNode)
        )
        .map((connection) => connection.id)
    );
  }, [connections, selectedNode]);

  const connectedNodes = useMemo(() => {
    if (!selectedNode) return new Set();
    const related = new Set([selectedNode]);
    connections.forEach((connection) => {
      if (connection.from === selectedNode) {
        related.add(connection.to);
      }
      if (connection.to === selectedNode) {
        related.add(connection.from);
      }
    });
    return related;
  }, [connections, selectedNode]);

  const stats = useMemo(
    () => ({ nodes: nodes.length, connections: connections.length }),
    [nodes.length, connections.length]
  );

  const highlights = useMemo(
    () => getHighlightedNodes(searchQuery, nodes, relationsData),
    [searchQuery, nodes, relationsData]
  );

  const isSearchActive = searchQuery.length > 0;
  const searchMatchCount = highlights.matched.size;
  const searchHasNoResults = isSearchActive && searchMatchCount === 0;

  const selectedDetail = selectedNode
    ? nodes.find((node) => node.id === selectedNode)
    : null;

  return (
    <div className="workflow-builder">
      <div className="workflow-header">
        <div className="workflow-title">
          <span className="workflow-badge">Interactive</span>
          <div>
            <p className="workflow-subtitle">Knowledge graph canvas</p>
          </div>
        </div>
        <div className="workflow-actions">
          <div className="workflow-search">
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="workflow-search-input"
            />
            {searchInput ? (
              <button
                className="workflow-button ghost"
                type="button"
                onClick={() => setSearchInput("")}
              >
                Clear
              </button>
            ) : null}
          </div>
          <button
            className="workflow-button ghost"
            type="button"
            onClick={() => setShowRelations((value) => !value)}
          >
            {showRelations ? "Hide Relations" : "Show Relations"}
          </button>
          <button className="workflow-button ghost" type="button" onClick={handleResetLayout}>
            Reset Layout
          </button>
          <button className="workflow-button ghost" type="button" onClick={handleCenter}>
            Center
          </button>
          <button
            className="workflow-button primary"
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
          >
            + Add Node
          </button>
        </div>
      </div>

      {showAddForm ? (
        <div className="inline-add-node">
          <input
            placeholder="Concept title (e.g. Neural Networks)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="inline-add-input"
          />
          <input
            placeholder="Short description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="inline-add-input"
          />
          {createError ? <p className="status error">{createError}</p> : null}
          <div className="inline-add-actions">
            <button
              className="workflow-button primary"
              disabled={isCreating || !newTitle.trim()}
              onClick={async () => {
                try {
                  setIsCreating(true);
                  setCreateError("");
                  await createConcept({ title: newTitle.trim(), description: newDescription.trim() });
                  setNewTitle("");
                  setNewDescription("");
                  setShowAddForm(false);
                  await fetchGraph();
                } catch (err) {
                  console.error("Failed to create concept from graph", err);
                  setCreateError("Failed to create concept.");
                } finally {
                  setIsCreating(false);
                }
              }}
            >
              {isCreating ? "Adding..." : "Add to Library"}
            </button>
            <button className="workflow-button ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="workflow-details">
        <div>
          <p className="detail-label">Selected Node</p>
          <p className="detail-value">
            {selectedDetail ? selectedDetail.title : "Click a node to inspect details."}
          </p>
          {isSearchActive ? (
            <p className="detail-hint">
              {searchHasNoResults
                ? "No matches. Try another keyword."
                : `Showing ${searchMatchCount} match${searchMatchCount === 1 ? "" : "es"}.`}
            </p>
          ) : null}
        </div>
        <div>
          <p className="detail-label">Description</p>
          <p className="detail-value">
            {selectedDetail
              ? selectedDetail.description
              : "Select a node to preview the details."}
          </p>
        </div>
      </div>

      <div className="workflow-body">
        <div
          className="workflow-canvas"
          ref={canvasRef}
          onMouseDown={handlePanStart}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNode(null);
            }
          }}
        >
          {isLoading ? <p className="status">Loading graph...</p> : null}
          {error ? <p className="status error">{error}</p> : null}
          {!isLoading && !error && nodes.length === 0 ? (
            <p className="status empty">No nodes yet. Add a concept to start mapping.</p>
          ) : null}
          {!isLoading && !error && nodes.length > 0 && searchHasNoResults ? (
            <p className="status empty">
              No results for "{searchQuery}". Try another keyword.
            </p>
          ) : null}
          {!isLoading && !error && nodes.length > 0 ? (
            <div
              className="workflow-layer"
              style={{
                transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale3d(${viewport.scale}, ${viewport.scale}, 1)`,
              }}
            >
              {showRelations ? (
                <svg
                  className="workflow-links"
                  aria-hidden="true"
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}
                >
                  {connections.map((connection) => {
                    const fromNode = nodes.find((node) => node.id === connection.from);
                    const toNode = nodes.find((node) => node.id === connection.to);
                    if (!fromNode || !toNode) return null;
                    const fromSize = nodeSizes[fromNode.id] || NODE_SIZE;
                    const toSize = nodeSizes[toNode.id] || NODE_SIZE;

                    const edgeActive = isSearchActive
                      ? highlights.matched.has(connection.from) || highlights.matched.has(connection.to)
                      : activeConnections.has(connection.id);

                    const edgeDimmed = isSearchActive
                      ? highlights.dimmed.has(connection.from) && highlights.dimmed.has(connection.to)
                      : selectedNode && !activeConnections.has(connection.id);

                    return (
                      <WorkflowConnection
                        key={connection.id}
                        from={fromNode}
                        to={toNode}
                        fromSize={fromSize}
                        toSize={toSize}
                        isActive={edgeActive}
                        isDimmed={edgeDimmed}
                      />
                    );
                  })}
                </svg>
              ) : null}

              {nodes.map((node) => {
                const isMatched = isSearchActive && highlights.matched.has(node.id);
                const isConnected = isSearchActive && highlights.connected.has(node.id);
                const isDimmed = isSearchActive
                  ? highlights.dimmed.has(node.id)
                  : selectedNode
                  ? !connectedNodes.has(node.id)
                  : false;

                return (
                  <WorkflowNode
                    key={node.id}
                    node={node}
                    selected={selectedNode === node.id}
                    matched={isMatched}
                    connected={isConnected}
                    dimmed={isDimmed}
                    onSelect={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                    onPointerDown={(event) => handleNodePointerDown(node.id, event)}
                    nodeSize={NODE_SIZE}
                    onSizeChange={handleNodeSizeChange}
                  />
                );
              })}
            </div>
          ) : null}
        </div>

        <ConceptDetailPanel
          node={selectedDetail}
          relations={relationsData}
          concepts={conceptsData}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      <div className="workflow-footer">
        <div className="workflow-stat">
          <span>Total Nodes</span>
          <strong>{stats.nodes}</strong>
        </div>
        <div className="workflow-divider" />
        <div className="workflow-stat">
          <span>Total Connections</span>
          <strong>{stats.connections}</strong>
        </div>
      </div>
    </div>
  );
}

export default WorkflowGraph;
