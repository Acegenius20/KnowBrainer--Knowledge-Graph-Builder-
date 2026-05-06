import { useEffect, useState } from "react";
import ConceptForm from "./components/ConceptForm";
import ConceptList from "./components/ConceptList";
import Capture from "./components/Capture";
import Relations from "./components/Relations";
import Insights from "./components/Insights";
import Settings from "./components/Settings";
import WorkflowGraph from "./components/ui/WorkflowGraph";
import { ToastContainer } from "./components/Toast";
import { getConcepts, getRelations, deleteConcept, deleteRelation } from "./services/api";
import "./App.css";
import "./phase4-enhancements.css";

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

  const handleExtracted = async () => {
    setRefreshKey((value) => value + 1);
  };

  const handleResetGraph = async () => {
    try {
      const [concepts, relations] = await Promise.all([
        getConcepts(),
        getRelations(),
      ]);

      // Delete all relations first
      await Promise.all(relations.map((r) => deleteRelation(r._id)));
      // Then delete all concepts
      await Promise.all(concepts.map((c) => deleteConcept(c._id)));

      setRefreshKey((value) => value + 1);
    } catch (err) {
      console.error("Failed to reset graph", err);
    }
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
    capture: {
      title: "Capture Knowledge",
      description: "Extract concepts and relations from text using AI.",
    },
    relations: {
      title: "Relations",
      description: "Manage and explore relationships between concepts.",
    },
    insights: {
      title: "Insights",
      description: "Analytics and network statistics for your knowledge graph.",
    },
    settings: {
      title: "Settings",
      description: "Configure theme, display, and data management.",
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
            <button
              type="button"
              className={`nav-item ${activeView === "capture" ? "is-active" : ""}`}
              onClick={() => setActiveView("capture")}
            >
              Capture
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === "relations" ? "is-active" : ""}`}
              onClick={() => setActiveView("relations")}
            >
              Relations
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === "insights" ? "is-active" : ""}`}
              onClick={() => setActiveView("insights")}
            >
              Insights
            </button>
            <button
              type="button"
              className={`nav-item ${activeView === "settings" ? "is-active" : ""}`}
              onClick={() => setActiveView("settings")}
            >
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
              <h1>
                {activeView === "graph"
                  ? "Knowledge Graph"
                  : activeView === "library"
                  ? "Capture Your Knowledge"
                  : activeView === "capture"
                  ? "Capture Knowledge"
                  : activeView === "relations"
                  ? "Relations"
                  : activeView === "insights"
                  ? "Insights"
                  : "Settings"}
              </h1>
              <p className="app-subtitle">
                {activeView === "graph"
                  ? "Drag nodes, zoom, and explore relationships."
                  : activeView === "library"
                  ? "Write freely. Your ideas will connect automatically."
                  : activeView === "capture"
                  ? "Extract concepts and relationships from text."
                  : activeView === "relations"
                  ? "Manage connections between concepts."
                  : activeView === "insights"
                  ? "Explore network analytics and statistics."
                  : "Configure your environment and preferences."}
              </p>
            </div>
          </header>

          {activeView === "library" ? (
            <section className="library-page">
              <section className="library-capture">
                <ConceptForm onCreated={handleCreated} />
              </section>

              <section className="library-stats">
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

              <section className="library-grid">
                <div className="panel-header">
                  <h2>Knowledge Cards</h2>
                  <p>Recent concepts from your thinking space.</p>
                </div>
                <ConceptList refreshKey={refreshKey} onDeleted={handleDeleted} />
              </section>
            </section>
          ) : activeView === "graph" ? (
            <WorkflowGraph
              onAddNode={() => setActiveView("library")}
              refreshKey={refreshKey}
            />
          ) : activeView === "capture" ? (
            <Capture onExtracted={handleExtracted} />
          ) : activeView === "relations" ? (
            <Relations refreshKey={refreshKey} />
          ) : activeView === "insights" ? (
            <Insights refreshKey={refreshKey} />
          ) : activeView === "settings" ? (
            <Settings
              theme={theme}
              onThemeToggle={toggleTheme}
              onResetGraph={handleResetGraph}
            />
          ) : null}
        </div>
      </div>
    </div>
    </>
  );
}

export default App;
