import { useEffect, useState } from "react";

const toastStack = [];
const listeners = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toastStack]));
}

export function showToast(message, type = "info", duration = 3000) {
  const id = Date.now();
  toastStack.push({ id, message, type });
  notifyListeners();

  if (duration > 0) {
    setTimeout(() => {
      const index = toastStack.findIndex((t) => t.id === id);
      if (index > -1) {
        toastStack.splice(index, 1);
        notifyListeners();
      }
    }, duration);
  }

  return id;
}

export function dismissToast(id) {
  const index = toastStack.findIndex((t) => t.id === id);
  if (index > -1) {
    toastStack.splice(index, 1);
    notifyListeners();
  }
}

function Toast({ id, message, type, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), 3000);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === "success" && "✓"}
          {type === "error" && "✕"}
          {type === "info" && "ℹ"}
        </span>
        <p className="toast-message">{message}</p>
      </div>
    </div>
  );
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      const index = listeners.indexOf(setToasts);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  const handleDismiss = (id) => {
    dismissToast(id);
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
}
