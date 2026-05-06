import { motion } from "framer-motion";
import { Database, Link2, Sparkles, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const iconMap = {
  trigger: Zap,
  concept: Database,
  relation: Link2,
  insight: Sparkles,
};

function WorkflowNode({
  node,
  selected,
  matched,
  connected,
  dimmed,
  onSelect,
  onPointerDown,
  nodeSize,
  onSizeChange,
}) {
  const Icon = iconMap[node.type] || Database;
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (!cardRef.current || !onSizeChange) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      onSizeChange(node.id, { width, height });
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [node.id, onSizeChange]);

  return (
    <motion.div
      className={`workflow-node node-${node.type} ${selected ? "is-selected" : ""} ${
        isDragging ? "is-dragging" : ""
      } ${dimmed ? "is-dimmed" : ""} ${matched ? "is-matched" : ""} ${
        connected ? "is-connected" : ""
      }`}
      onPointerDown={(event) => {
        setIsDragging(true);
        onPointerDown?.(event);
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerCancel={() => setIsDragging(false)}
      onClick={onSelect}
      style={{
        width: nodeSize.width,
        left: node.position.x,
        top: node.position.y,
      }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="node-card" ref={cardRef}>
        <div className="node-header">
          <span className="node-icon">
            <Icon size={16} />
          </span>
          <span className="node-badge">{node.type}</span>
        </div>
        <div className="node-body">
          <h3>{node.title}</h3>
          <p>{node.description}</p>
        </div>
        <div className="node-footer">Connected</div>
      </div>
    </motion.div>
  );
}

export default WorkflowNode;
