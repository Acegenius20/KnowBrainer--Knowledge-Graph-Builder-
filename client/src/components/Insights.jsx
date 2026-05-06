import { useEffect, useState, useMemo } from "react";
import { getConcepts, getRelations } from "../services/api";

function Insights({ refreshKey }) {
  const [concepts, setConcepts] = useState([]);
  const [relations, setRelations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [conceptsData, relationsData] = await Promise.all([
          getConcepts(),
          getRelations(),
        ]);
        setConcepts(conceptsData || []);
        setRelations(relationsData || []);
        setError("");
      } catch (err) {
        console.error("Failed to load insights data", err);
        setError("Failed to load insights.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [refreshKey]);

  const analytics = useMemo(() => {
    const connectionCount = new Map();
    
    concepts.forEach((c) => {
      connectionCount.set(c._id, 0);
    });

    relations.forEach((r) => {
      const sourceId = r.source?._id || r.source;
      const targetId = r.target?._id || r.target;

      if (connectionCount.has(sourceId)) {
        connectionCount.set(sourceId, connectionCount.get(sourceId) + 1);
      }
      if (connectionCount.has(targetId)) {
        connectionCount.set(targetId, connectionCount.get(targetId) + 1);
      }
    });

    const conceptsWithConnections = concepts.map((c) => ({
      ...c,
      connections: connectionCount.get(c._id) || 0,
    }));

    const mostConnected = conceptsWithConnections
      .sort((a, b) => b.connections - a.connections)
      .slice(0, 1);

    const leastConnected = conceptsWithConnections
      .sort((a, b) => a.connections - b.connections)
      .slice(0, 1);

    const recent = concepts
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 5);

    return {
      mostConnected: mostConnected[0] || null,
      leastConnected: leastConnected[0] || null,
      recent,
      totalConcepts: concepts.length,
      totalRelations: relations.length,
    };
  }, [concepts, relations]);

  return (
    <div className="insights-panel">
      {isLoading ? (
        <p className="status">Loading insights...</p>
      ) : error ? (
        <p className="status error">{error}</p>
      ) : (
        <>
          <section className="cards-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card">
              <p>Total Concepts</p>
              <h2>{analytics.totalConcepts}</h2>
              <span>Knowledge nodes</span>
            </div>
            <div className="stat-card">
              <p>Total Relations</p>
              <h2>{analytics.totalRelations}</h2>
              <span>Connections created</span>
            </div>
            <div className="stat-card">
              <p>Most Connected</p>
              <h2>{analytics.mostConnected?.connections || 0}</h2>
              <span>{analytics.mostConnected ? (analytics.mostConnected.displayTitle || analytics.mostConnected.title) : "No data"}</span>
            </div>
            <div className="stat-card">
              <p>Least Connected</p>
              <h2>{analytics.leastConnected?.connections ?? 0}</h2>
              <span>{analytics.leastConnected ? (analytics.leastConnected.displayTitle || analytics.leastConnected.title) : "No data"}</span>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h3>Recently Added</h3>
              <p>Latest concepts added to the knowledge base.</p>
            </div>
            {analytics.recent.length === 0 ? (
              <p className="status empty">No concepts yet.</p>
            ) : (
              <ul className="insights-list">
                {analytics.recent.map((concept) => (
                  <li key={concept._id} className="insights-item">
                    <div className="concept-info">
                      <p className="concept-name">{concept.displayTitle || concept.title}</p>
                      <p className="concept-connections">
                        {concept.createdAt ? new Date(concept.createdAt).toLocaleDateString() : "No date"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default Insights;
