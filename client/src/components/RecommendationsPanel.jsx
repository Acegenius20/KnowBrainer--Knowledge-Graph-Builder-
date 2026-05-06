import { useEffect, useState } from "react";
import { createConcept, getRecommendations } from "../services/api";

function RecommendationsPanel({ refreshKey, onAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        setIsLoading(true);
        const data = await getRecommendations();
        setRecommendations(data || []);
        setError("");
      } catch (err) {
        console.error("Failed to load recommendations", err);
        setError("Failed to load recommendations.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendations();
  }, [refreshKey]);

  const handleAdd = async (concept) => {
    try {
      setAdding(concept);
      await createConcept({ title: concept, description: "Suggested by recommendations" });
      if (onAdded) {
        onAdded();
      }
      setRecommendations((prev) => prev.filter((r) => r.concept !== concept));
    } catch (err) {
      console.error("Failed to add recommended concept", err);
      setError("Failed to add recommended concept.");
    } finally {
      setAdding(null);
    }
  };

  return (
    <section className="panel recommendations-panel">
      <div className="panel-header">
        <h3>Recommended Next Concepts</h3>
        <p>Explore missing ideas based on your current graph.</p>
      </div>

      {error ? <p className="status error">{error}</p> : null}

      {isLoading ? (
        <p className="status">Loading recommendations...</p>
      ) : recommendations.length === 0 ? (
        <p className="status empty">
          You are all caught up. Add more concepts or extract text to unlock new ideas.
        </p>
      ) : (
        <div className="recommendation-grid">
          {recommendations.map((rec) => (
            <div key={rec.concept} className="recommendation-card">
              <div>
                <div className="recommendation-title">
                  <h4>{rec.concept}</h4>
                  {rec.confidence ? (
                    <span className="confidence-chip">{rec.confidence}%</span>
                  ) : null}
                </div>
                <p>{rec.reason}</p>
              </div>
              <button
                className="workflow-button primary"
                onClick={() => handleAdd(rec.concept)}
                disabled={adding === rec.concept}
              >
                {adding === rec.concept ? "Adding..." : "Add to Graph"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecommendationsPanel;
