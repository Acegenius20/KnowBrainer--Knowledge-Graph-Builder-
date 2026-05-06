import { useEffect, useState } from "react";
import { getRelations, getConcepts, deleteRelation, createRelation } from "../services/api";

function Relations({ refreshKey }) {
  const [relations, setRelations] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterConcept, setFilterConcept] = useState("");
  const [filterType, setFilterType] = useState("");
  const [error, setError] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState("related_to");
  const [isCreating, setIsCreating] = useState(false);
  const [createMessage, setCreateMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [relationsData, conceptsData] = await Promise.all([
          getRelations(),
          getConcepts(),
        ]);
        setRelations(relationsData || []);
        setConcepts(conceptsData || []);
        setError("");
      } catch (err) {
        console.error("Failed to load relations", err);
        setError("Failed to load relations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  const handleDeleteRelation = async (id) => {
    if (!window.confirm("Delete this relation?")) return;

    try {
      await deleteRelation(id);
      setRelations((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error("Failed to delete relation", err);
      setError("Failed to delete relation.");
    }
  };

  const handleCreateRelation = async (event) => {
    event.preventDefault();
    setCreateMessage("");

    if (!sourceId || !targetId) {
      setError("Choose both a source and target concept.");
      return;
    }

    if (sourceId === targetId) {
      setError("Source and target must be different.");
      return;
    }

    if (!relationType.trim()) {
      setError("Choose a relationship type.");
      return;
    }

    try {
      setIsCreating(true);
      setError("");
      const created = await createRelation({
        source: sourceId,
        target: targetId,
        type: relationType.trim(),
      });
      setRelations((prev) => [created, ...prev]);
      setCreateMessage("Relation created.");
      setSourceId("");
      setTargetId("");
      setRelationType("related_to");
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to create relation.";
      setError(message);
    } finally {
      setIsCreating(false);
    }
  };

  const conceptMap = new Map();
  concepts.forEach((c) => {
    conceptMap.set(c._id, c.displayTitle || c.title);
  });

  const getConceptName = (id) => conceptMap.get(id) || "Unknown";

  const uniqueRelations = (() => {
    const seen = new Set();
    const unique = [];

    relations.forEach((r) => {
      const sourceId = r.source?._id || r.source;
      const targetId = r.target?._id || r.target;
      const type = r.type || "related_to";
      const key = `${sourceId}-${targetId}-${type}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push({ ...r, source: sourceId, target: targetId, type });
    });

    return unique;
  })();

  const filteredRelations = uniqueRelations.filter((r) => {
    if (filterConcept) {
      const sourceId = r.source?._id || r.source;
      const targetId = r.target?._id || r.target;
      if (sourceId !== filterConcept && targetId !== filterConcept) return false;
    }
    if (filterType && r.type !== filterType) return false;
    return true;
  });

  const relationTypes = [...new Set(uniqueRelations.map((r) => r.type))];

  return (
    <div className="relations-panel">
      <section className="panel">
        <div className="panel-header">
          <h2>Relations</h2>
          <p>Manage relationships between concepts.</p>
        </div>

        {error && <p className="status error">{error}</p>}
        {createMessage ? <p className="status success">{createMessage}</p> : null}

        {isLoading ? (
          <p className="status">Loading relations...</p>
        ) : (
          <>
            <form className="relations-create" onSubmit={handleCreateRelation}>
              <div className="relations-create-grid">
                <label className="filter-label">
                  <span>From</span>
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Choose a concept</option>
                    {concepts.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.displayTitle || c.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="filter-label">
                  <span>Relationship</span>
                  <select
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value)}
                    className="filter-select"
                  >
                    <option value="related_to">Relates to</option>
                    <option value="used_in">Used in</option>
                    <option value="part_of">Part of</option>
                    <option value="enables">Enables</option>
                    <option value="requires">Requires</option>
                    <option value="improves">Improves</option>
                  </select>
                </label>

                <label className="filter-label">
                  <span>To</span>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="filter-select"
                  >
                    <option value="">Choose a concept</option>
                    {concepts.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.displayTitle || c.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="relations-create-actions">
                <button
                  className="workflow-button primary"
                  type="submit"
                  disabled={isCreating}
                >
                  {isCreating ? "Creating..." : "Create Connection"}
                </button>
                <p className="relations-hint">
                  Link two concepts to build your graph. NLP links stay available too.
                </p>
              </div>
            </form>

            <div className="relations-filters">
              <label className="filter-label">
                <span>Filter by Concept</span>
                <select
                  value={filterConcept}
                  onChange={(e) => setFilterConcept(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Concepts</option>
                  {concepts.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.displayTitle || c.title}
                    </option>
                  ))}
                </select>
              </label>

              <label className="filter-label">
                <span>Filter by Type</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  {relationTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              {(filterConcept || filterType) && (
                <button
                  className="workflow-button ghost"
                  onClick={() => {
                    setFilterConcept("");
                    setFilterType("");
                  }}
                  style={{ alignSelf: "flex-end" }}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="relations-list">
              {filteredRelations.length === 0 ? (
                <p className="status empty">
                  {relations.length === 0
                    ? "No relations yet. Extract text or add concepts to create links."
                    : "No relations match your filters. Try a different concept or type."}
                </p>
              ) : (
                <table className="relations-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Type</th>
                      <th>Target</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRelations.map((relation) => {
                      const sourceId = relation.source?._id || relation.source;
                      const targetId = relation.target?._id || relation.target;
                      return (
                        <tr key={relation._id}>
                          <td>{getConceptName(sourceId)}</td>
                          <td>
                            <span className="relation-type-badge">{relation.type}</span>
                          </td>
                          <td>{getConceptName(targetId)}</td>
                          <td className="relations-table-action">
                            <button
                              className="workflow-button ghost"
                              onClick={() => handleDeleteRelation(relation._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="relations-summary">
              <p>
                <strong>Total:</strong> {filteredRelations.length} / {relations.length} relations
              </p>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Relations;
