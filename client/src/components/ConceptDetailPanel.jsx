import { useEffect, useMemo, useState } from "react";
import { findSimilarConcepts } from "../utils/search";

function ConceptDetailPanel({ node, relations, concepts, onClose }) {
  const [connectedConcepts, setConnectedConcepts] = useState([]);
  const [relationCount, setRelationCount] = useState(0);

  useEffect(() => {
    if (!node) return;

    const connected = [];
    const conceptMap = new Map(concepts.map((c) => [c._id, c]));

    relations.forEach((rel) => {
      const sourceId = rel.source?._id || rel.source;
      const targetId = rel.target?._id || rel.target;

      if (sourceId === node.id && targetId) {
        const target = conceptMap.get(targetId);
        if (target) {
          connected.push({
            concept: target.displayTitle || target.title,
            type: rel.type || "related_to",
            direction: "outgoing",
            id: target._id,
          });
        }
      } else if (targetId === node.id && sourceId) {
        const source = conceptMap.get(sourceId);
        if (source) {
          connected.push({
            concept: source.displayTitle || source.title,
            type: rel.type || "related_to",
            direction: "incoming",
            id: source._id,
          });
        }
      }
    });

    setConnectedConcepts(connected);
    setRelationCount(connected.length);
  }, [node, relations, concepts]);

  const suggestions = useMemo(() => {
    if (!node) return [];
    const connectedIds = new Set(connectedConcepts.map((c) => c.id));
    const similar = findSimilarConcepts(node.title, concepts, 70)
      .filter((c) => c._id !== node.id)
      .filter((c) => !connectedIds.has(c._id))
      .slice(0, 5);
    return similar;
  }, [node, concepts, connectedConcepts]);

  if (!node) return null;

  return (
    <div className="concept-detail-panel">
      <div className="detail-header">
        <h2>{node.title}</h2>
        <button className="detail-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="detail-section">
        <h3>Description</h3>
        <p className="detail-description">{node.description || "No description yet."}</p>
      </div>

      <div className="detail-section">
        <h3>Connected Concepts ({connectedConcepts.length})</h3>
        {connectedConcepts.length === 0 ? (
          <p className="detail-empty">No connections yet.</p>
        ) : (
          <ul className="detail-connections">
            {connectedConcepts.map((conn, idx) => (
              <li key={idx} className="connection-item">
                <span className="connection-type">{conn.type}</span>
                <span className="connection-concept">{conn.concept}</span>
                <span className="connection-direction">
                  {conn.direction === "outgoing" ? "→" : "←"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-section">
        <h3>Suggested Concepts</h3>
        {suggestions.length === 0 ? (
          <p className="detail-empty">No suggestions yet.</p>
        ) : (
          <ul className="detail-suggestions">
            {suggestions.map((concept) => (
              <li key={concept._id}>
                {concept.displayTitle || concept.title}
                <span className="suggestion-score">{concept.similarity}%</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="detail-meta">
        <p>
          <strong>Relation Count:</strong> {relationCount}
        </p>
      </div>
    </div>
  );
}

export default ConceptDetailPanel;
