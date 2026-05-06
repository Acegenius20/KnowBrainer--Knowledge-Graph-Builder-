import { useEffect, useState } from "react";
import { getRelations, getConcepts, deleteRelation } from "../services/api";

function Relations({ refreshKey }) {
  const [relations, setRelations] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterConcept, setFilterConcept] = useState("");
  const [filterType, setFilterType] = useState("");
  const [error, setError] = useState("");

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

        {isLoading ? (
          <p className="status">Loading relations...</p>
        ) : (
          <>
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
                    ? "No relations yet. Extract concepts to create relationships."
                    : "No relations match your filters."}
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
