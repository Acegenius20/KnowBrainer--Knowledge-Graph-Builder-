import { useEffect, useState } from "react";
import ConceptForm from "./components/ConceptForm";
import ConceptList from "./components/ConceptList";
import WorkflowGraph from "./components/ui/WorkflowGraph";
import { ToastContainer } from "./components/Toast";
import { getConcepts, getRelations } from "./services/api";
import "./App.css";
import "./phase4-enhancements.css";
import { Phase4Summary } from "./components/Phase4Summary";

function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("kb-theme") || "dark"
  );
  const [activeView, setActiveView] = useState("library");
  const [summary, setSummary] = useState({ total: 0, latest: "", relations: 0 });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("kb-theme", theme);
  }, [theme]);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        setSummaryLoading(true);
        const [concepts, relations] = await Promise.all([
          getConcepts(),
          getRelations(),
        ]);

        const latest = concepts[0]?.createdAt
          ? new Intl.DateTimeFormat("en", {
              month: "short",
              day: "numeric",
            }).format(new Date(concepts[0].createdAt))
          : "No activity";

        setSummary({
          total: concepts.length,
          latest,
          relations: relations.length,
        });
      } catch (err) {
        setSummary({ total: 0, latest: "Unavailable", relations: 0 });
      } finally {
        setSummaryLoading(false);
      }
    };

    loadSummary();
  }, [refreshKey]);

  const handleCreated = () => {
    setRefreshKey((value) => value + 1);
  };

  const handleDeleted = () => {
    setRefreshKey((value) => value + 1);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const sidebarCopy = {
    library: {
      title: "Concept Library",
      description: "Capture concepts, edit details, and build the graph foundation.",
    },
    graph: {
      title: "Graph View",
      description: "Pan, zoom, and inspect relationships across your knowledge system.",
    },
  };

  const currentCopy = sidebarCopy[activeView] || sidebarCopy.library;

  return (
    <>
      <ToastContainer />
      <div className="app">
        <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <span className="brand-mark">KB</span>
            <div>
              <p className="app-kicker">KnowBrainer</p>
              <p className="brand-subtitle">Personal Knowledge Graph</p>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button
              type="button"
              className={`nav-item ${activeView === "library" ? "is-active" : ""}`}
              onClick={() => setActiveView("library")}
            >
              Library
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === "graph" ? "is-active" : ""}`}
              onClick={() => setActiveView("graph")}
            >
              Graph
            </button>
            <button type="button" className="nav-item" disabled>
              Relationships
            </button>
            <button type="button" className="nav-item" disabled>
              Insights
            </button>
            <button type="button" className="nav-item" disabled>
              Settings
            </button>
          </nav>
          <div className="sidebar-card">
            <h3>{currentCopy.title}</h3>
            <p>{currentCopy.description}</p>
          </div>
        </aside>

        <div className="main-area">
          <header className="topbar">
            <div>
              <h1>{activeView === "graph" ? "Knowledge Graph" : "Concept Library"}</h1>
              <p className="app-subtitle">
                {activeView === "graph"
                  ? "Drag nodes, zoom, and explore relationships."
                  : "Curate the building blocks of your knowledge graph."}
              </p>
            </div>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              type="button"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M21 15.5a8.25 8.25 0 0 1-10.98-10.98 9 9 0 1 0 10.98 10.98Z"
                    fill="currentColor"
                  />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M12 3.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V4a.75.75 0 0 1 .75-.75ZM5.61 5.61a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L5.61 6.67a.75.75 0 0 1 0-1.06Zm12.72 0a.75.75 0 0 1 0 1.06l-1.06 1.06a.75.75 0 0 1-1.06-1.06l1.06-1.06a.75.75 0 0 1 1.06 0ZM12 7.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Zm8.5 3.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V12a.75.75 0 0 1 .75-.75ZM3.25 12a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5H4a.75.75 0 0 1-.75-.75Zm14.86 5.33a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06Zm-12.72 0a.75.75 0 0 1 1.06 1.06L5.39 19.5a.75.75 0 1 1-1.06-1.06l1.06-1.11ZM12 18.75a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </header>

          {activeView === "library" ? (
            <>
              <section className="cards-grid">
                <div className="stat-card">
                  <p>Total Concepts</p>
                  <h2>{summaryLoading ? "Loading" : summary.total}</h2>
                  <span>Keep adding ideas</span>
                </div>
                <div className="stat-card">
                  <p>Latest Activity</p>
                  <h2>{summaryLoading ? "Loading" : summary.latest}</h2>
                  <span>Fresh concepts added</span>
                </div>
                <div className="stat-card">
                  <p>Relationships</p>
                  <h2>{summaryLoading ? "Loading" : summary.relations}</h2>
                  <span>Connected links</span>
                </div>
              </section>

              <main className="app-content">
                <section className="panel">
                  <ConceptForm onCreated={handleCreated} />
                </section>
                <section className="panel">
                  <div className="panel-header">
                    <h2>Recent Concepts</h2>
                    <p>Sorted by newest first.</p>
                  </div>
                  <ConceptList refreshKey={refreshKey} onDeleted={handleDeleted} />
                </section>
              </main>
            </>
          ) : (
            <section className="graph-page">
              <WorkflowGraph
                onAddNode={() => setActiveView("library")}
                refreshKey={refreshKey}
              />
              <Phase4Summary />
            </section>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

export default App;
