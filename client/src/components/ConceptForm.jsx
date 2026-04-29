import { useState } from "react";
import { createConcept } from "../services/api";

function ConceptForm({ onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!title.trim()) {
      setError("Title is required.");
      setSuccess("");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setSuccess("");
      await createConcept({
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setSuccess("Concept saved.");
      onCreated();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to create concept.";
      setError(message);
      setSuccess("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="concept-form" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Add Concept</h2>
        <p>Capture a new idea and keep your knowledge graph growing.</p>
      </div>

      <label className="field">
        <span>Title</span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (success) {
              setSuccess("");
            }
          }}
          placeholder="e.g. Vector Databases"
          required
        />
      </label>

      <label className="field">
        <span>Description</span>
        <textarea
          value={description}
          onChange={(event) => {
            setDescription(event.target.value);
            if (success) {
              setSuccess("");
            }
          }}
          placeholder="Why it matters, how it connects, or what you learned."
          rows={4}
        />
      </label>

      {error ? <p className="status error">{error}</p> : null}
      {success ? <p className="status success">{success}</p> : null}

      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Concept"}
      </button>
    </form>
  );
}

export default ConceptForm;
