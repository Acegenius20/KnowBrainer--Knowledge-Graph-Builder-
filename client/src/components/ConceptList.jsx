import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { deleteConcept, getConcepts } from "../services/api";
import { ConfirmModal } from "./ConfirmModal";
import { showToast } from "./Toast";

function ConceptList({ refreshKey, onDeleted }) {
  const listRef = useRef(null);
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [conceptToDelete, setConceptToDelete] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchConcepts = async () => {
      try {
        setIsLoading(true);
        const data = await getConcepts();
        if (isMounted) {
          setConcepts(data);
          setError("");
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load concepts.");
          showToast("Failed to load concepts", "error");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchConcepts();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  const handleDeleteClick = (conceptId, event) => {
    event.stopPropagation();
    const concept = concepts.find((c) => c._id === conceptId);
    setConceptToDelete(concept);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!conceptToDelete) return;

    try {
      setIsDeleting(true);
      await deleteConcept(conceptToDelete._id);
      setActiveId(null);
      setConfirmOpen(false);
      showToast(`"${conceptToDelete.title}" deleted successfully`, "success");
      onDeleted();
    } catch (err) {
      setError("Failed to delete concept.");
      showToast("Failed to delete concept", "error");
    } finally {
      setIsDeleting(false);
      setConceptToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setConceptToDelete(null);
  };

  if (isLoading) {
    return <p className="status">Loading concepts...</p>;
  }

  if (error && !concepts.length) {
    return <p className="status error">{error}</p>;
  }

  if (!concepts.length) {
    return <p className="status empty">No concepts yet.</p>;
  }

  return (
    <div>
      {error ? <p className="status error">{error}</p> : null}
      <ul className="concept-grid" ref={listRef}>
        {concepts.map((concept) => (
          <motion.li
            key={concept._id}
            className={`concept-card ${activeId === concept._id ? "is-active" : ""}`}
            onClick={() => setActiveId(activeId === concept._id ? null : concept._id)}
            whileHover={{ y: -4, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
          >
            <div className="concept-card-header">
              <div className="concept-icon">
                <BookOpen size={16} />
              </div>
              {activeId === concept._id ? (
                <button
                  className="concept-delete"
                  type="button"
                  onClick={(event) => handleDeleteClick(concept._id, event)}
                  disabled={isDeleting}
                  title="Delete this concept permanently"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
            <h3>{concept.displayTitle || concept.title}</h3>
            {concept.description ? (
              <p>{concept.description}</p>
            ) : (
              <p className="concept-placeholder">No description yet.</p>
            )}
          </motion.li>
        ))}
      </ul>

      <ConfirmModal
        title="Delete Concept?"
        message={
          conceptToDelete
            ? `Are you sure you want to delete "${conceptToDelete.title}"? This action cannot be undone.`
            : ""
        }
        isOpen={confirmOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </div>
  );
}

export default ConceptList;
