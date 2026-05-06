import { useState } from "react";
import { extractKnowledge } from "../services/api";

function Capture({ onExtracted }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter some text to generate a knowledge graph.");
      setMessage("");
      setPreview(null);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setMessage("");

      const result = await extractKnowledge(trimmed);
      setPreview(result);
      setMessage(result?.message || "Knowledge extracted successfully.");
      
      if (onExtracted) {
        await onExtracted(result);
      }
    } catch (err) {
      const responseMessage = err?.response?.data?.message;
      setError(responseMessage || "Failed to extract knowledge.");
      setMessage("");
      setPreview(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClear = () => {
    setText("");
    setPreview(null);
    setMessage("");
    setError("");
  };

  return (
    <div className="capture-panel">
      <form className="note-input panel concept-form" onSubmit={handleSubmit}>
        <div className="panel-header">
          <h2>Capture Knowledge</h2>
          <p>Paste text and extract concepts to grow your knowledge graph.</p>
        </div>

        <label className="field">
          <span>Text Input</span>
          <textarea
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError("");
              if (message) setMessage("");
            }}
            placeholder="Paste notes, articles, or any knowledge text..."
            rows={7}
          />
        </label>

        {error ? <p className="status error">{error}</p> : null}
        {message ? <p className="status success">{message}</p> : null}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Extracting..." : "Extract Concepts"}
          </button>
          {text && (
            <button
              type="button"
              className="workflow-button ghost"
              onClick={handleClear}
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {preview && (
        <div className="panel capture-preview">
          <div className="panel-header">
            <h3>Preview</h3>
            <p>Extracted concepts to be added to the graph.</p>
          </div>

          <div className="preview-section">
            <h4>Concepts ({preview.concepts?.length || 0})</h4>
            {preview.concepts && preview.concepts.length > 0 ? (
              <ul className="concept-preview-list">
                {preview.concepts.map((concept, idx) => (
                  <li key={idx} className="concept-preview-item">
                    <strong>{concept}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted">No concepts extracted.</p>
            )}
          </div>

          <div className="preview-section">
            <h4>Stats</h4>
            <div className="preview-stats">
              <div>
                <p className="stat-label">Sentences Processed</p>
                <p className="stat-value">{preview.sentencesProcessed || 0}</p>
              </div>
              <div>
                <p className="stat-label">Relations Created</p>
                <p className="stat-value">{preview.relationsCreated || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Capture;
