import { useMemo, useState } from "react";
import { createConcept } from "../services/api";

function ConceptForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedDescription = description.trim();
    const trimmedTitle = title.trim();
    const fallbackTitle = trimmedDescription
      ? trimmedDescription.split(/\s+/).slice(0, 5).join(" ")
      : "Untitled Concept";
    const finalTitle = trimmedTitle || fallbackTitle;

    if (!trimmedDescription && !trimmedTitle) {
      setError("Write a thought or add a title to capture knowledge.");
      setSuccess("");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");
      await createConcept({
        title: finalTitle,
        description: trimmedDescription,
      });
      setTitle("");
      setDescription("");
      setSuccess("Knowledge captured.");
      onCreated();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to create concept.";
      setError(message);
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const keywordPreview = useMemo(() => {
    const text = `${title} ${description}`.toLowerCase();
    const tokens = text
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

    const stop = new Set([
      "the",
      "and",
      "that",
      "this",
      "from",
      "with",
      "are",
      "was",
      "been",
      "have",
      "has",
      "for",
      "to",
      "in",
      "on",
      "at",
      "by",
      "or",
      "is",
      "it",
      "be",
      "a",
      "an",
      "as",
      "but",
      "not",
      "if",
      "so",
      "we",
      "you",
      "he",
      "she",
      "they",
      "them",
      "our",
      "your",
      "their",
    ]);

    const counts = new Map();
    tokens.forEach((token) => {
      if (stop.has(token) || token.length < 3) return;
      counts.set(token, (counts.get(token) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([token]) => token.replace(/\b\w/g, (c) => c.toUpperCase()));
  }, [title, description]);

  return (
    <form className="library-capture-form" onSubmit={handleSubmit}>
      <div className="library-capture-header">
        <p className="library-kicker">Thinking Space</p>
        <h2>Capture Your Knowledge</h2>
        <p>Write freely. Your ideas will connect automatically.</p>
      </div>

      <label className="library-field">
        <span>Optional Title</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (success) {
              setSuccess("");
            }
          }}
          placeholder="Optional title (auto-generated if empty)"
        />
      </label>

      <label className="library-field">
        <span>Your Thought</span>
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (success) {
              setSuccess("");
            }
          }}
          placeholder="Write your thoughts... your ideas will turn into a knowledge graph"
          rows={8}
        />
      </label>

      {keywordPreview.length > 0 ? (
        <div className="keyword-preview">
          {keywordPreview.map((word) => (
            <span key={word} className="keyword-chip">
              {word}
            </span>
          ))}
        </div>
      ) : (
        <p className="keyword-empty">Start typing to see concept previews.</p>
      )}

      {error ? <p className="status error">{error}</p> : null}
      {success ? <p className="status success">{success}</p> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Capturing..." : "Capture Knowledge"}
      </button>
    </form>
  );
}

export default ConceptForm;
