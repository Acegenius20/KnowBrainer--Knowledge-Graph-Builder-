import { useState } from "react";

function Settings({ theme, onThemeToggle, onResetGraph }) {
  const [resetConfirmation, setResetConfirmation] = useState(false);

  const handleResetClick = () => {
    setResetConfirmation(true);
  };

  const handleConfirmReset = async () => {
    setResetConfirmation(false);
    await onResetGraph();
  };

  const handleCancelReset = () => {
    setResetConfirmation(false);
  };

  return (
    <div className="settings-panel">
      <section className="panel">
        <div className="panel-header">
          <h2>Settings</h2>
          <p>Configure your knowledge graph environment.</p>
        </div>

        <div className="settings-section" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Display</h3>
          <label className="settings-item" style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={theme === "dark"}
              onChange={onThemeToggle}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <div>
              <p style={{ fontSize: 14, fontWeight: 500 }}>Dark Mode</p>
              <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                {theme === "dark" ? "Dark mode is enabled" : "Light mode is enabled"}
              </p>
            </div>
          </label>
        </div>

        <div className="settings-section">
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>Data Management</h3>
          {!resetConfirmation ? (
            <button
              className="workflow-button"
              style={{
                backgroundColor: "var(--color-danger, #ef4444)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
              }}
              onClick={handleResetClick}
            >
              Reset All Data
            </button>
          ) : (
            <div
              style={{
                padding: 12,
                backgroundColor: "var(--color-bg-secondary)",
                borderRadius: 4,
                borderLeft: "3px solid var(--color-danger, #ef4444)",
              }}
            >
              <p style={{ marginBottom: 8, fontSize: 13 }}>
                <strong>Are you sure?</strong> This will delete all concepts and relations permanently. This action cannot be undone.
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="workflow-button"
                  style={{
                    backgroundColor: "var(--color-danger, #ef4444)",
                    color: "white",
                    border: "none",
                    padding: "6px 12px",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                  onClick={handleConfirmReset}
                >
                  Yes, Delete Everything
                </button>
                <button
                  className="workflow-button ghost"
                  onClick={handleCancelReset}
                  style={{ fontSize: 12, padding: "6px 12px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: "var(--color-bg-secondary)",
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            <p style={{ opacity: 0.7 }}>
              Resetting will remove all concepts, relations, and extracted knowledge from the system.
            </p>
          </div>
        </div>

        <div className="settings-section" style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--color-border)" }}>
          <h3 style={{ fontSize: 14, marginBottom: 12 }}>About</h3>
          <p style={{ fontSize: 13, opacity: 0.7 }}>
            KnowBrainer v1.0 — Your personal knowledge graph system
          </p>
          <p style={{ fontSize: 12, opacity: 0.5, marginTop: 8 }}>
            Built with React, Node.js, and MongoDB
          </p>
        </div>
      </section>
    </div>
  );
}

export default Settings;
