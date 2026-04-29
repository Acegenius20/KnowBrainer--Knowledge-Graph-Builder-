import { useEffect, useRef, useState } from "react";
import { deleteConcept, getConcepts } from "../services/api";

function ConceptList({ refreshKey, onDeleted }) {
  const listRef = useRef(null);
  const [concepts, setConcepts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!listRef.current) return;
      if (!listRef.current.contains(event.target)) {
        setActiveId(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  if (isLoading) {
    return <p className="status">Loading concepts...</p>;
  }

  if (error && !concepts.length) {
    return <p className="status error">{error}</p>;
  }

  if (!concepts.length) {
    return <p className="status empty">No concepts yet.</p>;
  }

  const handleDelete = async (conceptId) => {
    const confirmed = window.confirm("Delete this concept?");
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteConcept(conceptId);
      setActiveId(null);
      onDeleted();
    } catch (err) {
      setError("Failed to delete concept.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      {error ? <p className="status error">{error}</p> : null}
      <ul className="concept-list" ref={listRef}>
        {concepts.map((concept) => (
          <li
            key={concept._id}
            className={`concept-card ${activeId === concept._id ? "is-active" : ""}`}
            onClick={() => setActiveId(activeId === concept._id ? null : concept._id)}
          >
            <div className="concept-card-header">
              <h3>{concept.title}</h3>
              {activeId === concept._id ? (
                <button
                  className="concept-delete"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(concept._id);
                  }}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
            {concept.description ? <p>{concept.description}</p> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ConceptList;
