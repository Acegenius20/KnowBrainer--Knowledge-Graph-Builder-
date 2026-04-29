import { useEffect, useMemo, useRef, useState } from "react";
import WorkflowNode from "./WorkflowNode";
import WorkflowConnection from "./WorkflowConnection";
import { getConcepts, getRelations } from "../../services/api";

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
  const dragOriginRef = useRef({});
  const panState = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
  const viewportRef = useRef({ x: 0, y: 0, scale: 1 });
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewport, setViewport] = useState({ x: 0, y: 0, scale: 1 });
  const [nodeSizes, setNodeSizes] = useState({});

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        setIsLoading(true);
        const [concepts, relations] = await Promise.all([
          getConcepts(),
          getRelations(),
        ]);

        const conceptNodes = concepts.map((concept, index) => ({
          id: concept._id,
          title: concept.title,
          description: concept.description || "No description yet.",
          type: deriveNodeType(concept, index),
        }));

        const edges = relations.map((relation, index) => {
          const sourceId = relation.source?._id || relation.source;
          const targetId = relation.target?._id || relation.target;
          return { id: `${sourceId}-${targetId}-${index}`, from: sourceId, to: targetId };
        });

        const positionedConcepts = layoutGraphNodes(conceptNodes, edges);

        setNodes(positionedConcepts);
        setConnections(edges);
        setError("");
        setViewport({ x: 0, y: 0, scale: 1 });
      } catch (err) {
        console.error("Failed to load workflow graph", err);
        setError("Failed to load graph data.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGraph();
  }, [refreshKey]);

  useEffect(() => {
    const handleMove = (event) => {
      if (!panState.current.active) return;
      const dx = event.clientX - panState.current.startX;
      const dy = event.clientY - panState.current.startY;
      setViewport((prev) => ({
        ...prev,
        x: panState.current.originX + dx,
        y: panState.current.originY + dy,
      }));
    };

    const handleUp = () => {
      panState.current.active = false;
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId = null;
    let pending = null;

    const applyZoom = () => {
      if (!pending) return;
      const { pointerX, pointerY, delta } = pending;
      const { x, y, scale } = viewportRef.current;
      const zoomFactor = Math.exp(-delta * 0.0025);
      const nextScale = clamp(scale * zoomFactor, 0.45, 2.4);
      const contentX = (pointerX - x) / scale;
      const contentY = (pointerY - y) / scale;
      const nextX = pointerX - contentX * nextScale;
      const nextY = pointerY - contentY * nextScale;
      setViewport({ x: nextX, y: nextY, scale: nextScale });
      pending = null;
      rafId = null;
    };

    const onWheel = (event) => {
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      if (pending) {
        pending = {
          pointerX,
          pointerY,
          delta: pending.delta + event.deltaY,
        };
      } else {
        pending = {
          pointerX,
          pointerY,
          delta: event.deltaY,
        };
      }
      if (rafId === null) {
        rafId = requestAnimationFrame(applyZoom);
      }
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
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

  const handleDragStart = (nodeId) => {
    const current = nodes.find((node) => node.id === nodeId);
    if (!current) return;
    dragOriginRef.current[nodeId] = { ...current.position };
  };

  const handleDrag = (nodeId, info) => {
    const origin = dragOriginRef.current[nodeId];
    if (!origin) return;
    const next = {
      x: origin.x + info.offset.x / viewport.scale,
      y: origin.y + info.offset.y / viewport.scale,
    };

    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? { ...node, position: { x: next.x, y: next.y } }
          : node
      )
    );
  };

  const handleDragEnd = (nodeId) => {
    delete dragOriginRef.current[nodeId];
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
          <button className="workflow-button ghost" type="button" onClick={handleCenter}>
            Center
          </button>
          <button className="workflow-button primary" type="button" onClick={onAddNode}>
            + Add Node
          </button>
        </div>
      </div>

      <div className="workflow-details">
        <div>
          <p className="detail-label">Selected Node</p>
          <p className="detail-value">
            {selectedDetail ? selectedDetail.title : "Click a node to inspect details."}
          </p>
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
        {!isLoading && !error && nodes.length > 0 ? (
          <div
            className="workflow-layer"
            style={{
              transform: `translate3d(${viewport.x}px, ${viewport.y}px, 0) scale3d(${viewport.scale}, ${viewport.scale}, 1)`,
            }}
          >
            <svg className="workflow-links" aria-hidden="true" width="100%" height="100%">
              {connections.map((connection) => {
                const fromNode = nodes.find((node) => node.id === connection.from);
                const toNode = nodes.find((node) => node.id === connection.to);
                if (!fromNode || !toNode) return null;
                const fromSize = nodeSizes[fromNode.id] || NODE_SIZE;
                const toSize = nodeSizes[toNode.id] || NODE_SIZE;
                return (
                  <WorkflowConnection
                    key={connection.id}
                    from={fromNode}
                    to={toNode}
                    fromSize={fromSize}
                    toSize={toSize}
                    isActive={activeConnections.has(connection.id)}
                    isDimmed={
                      selectedNode && !activeConnections.has(connection.id)
                    }
                  />
                );
              })}
            </svg>

            {nodes.map((node) => (
              <WorkflowNode
                key={node.id}
                node={node}
                selected={selectedNode === node.id}
                dimmed={false}
                onSelect={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                onDragStart={() => handleDragStart(node.id)}
                onDrag={(info) => handleDrag(node.id, info)}
                onDragEnd={() => handleDragEnd(node.id)}
                dragConstraints={canvasRef}
                nodeSize={NODE_SIZE}
                onSizeChange={handleNodeSizeChange}
              />
            ))}
          </div>
        ) : null}
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
