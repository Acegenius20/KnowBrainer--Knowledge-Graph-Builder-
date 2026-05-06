import { useState } from "react";
import { extractKnowledge } from "../services/api";

function NoteInput({ onExtracted }) {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmed = text.trim();
    if (!trimmed) {
      setError("Please enter some text to generate a knowledge graph.");
      setMessage("");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setMessage("");

      const result = await extractKnowledge(trimmed);
      setMessage(result?.message || "Knowledge graph generated successfully.");
      setText("");

      if (onExtracted) {
        await onExtracted(result);
      }
    } catch (err) {
      const responseMessage = err?.response?.data?.message;
      setError(responseMessage || "Failed to generate knowledge graph.");
      setMessage("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="note-input panel concept-form" onSubmit={handleSubmit}>
      <div className="panel-header">
        <h2>Generate Knowledge Graph</h2>
        <p>Paste text and extract concepts directly into the graph.</p>
      </div>

      <label className="field">
        <span>Text</span>
        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            if (error) setError("");
            if (message) setMessage("");
          }}
          placeholder="Paste notes, an article excerpt, or any knowledge text..."
          rows={7}
        />
      </label>

      {error ? <p className="status error">{error}</p> : null}
      {message ? <p className="status success">{message}</p> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Generating..." : "Generate Knowledge Graph"}
      </button>
    </form>
  );
}

export default NoteInput;