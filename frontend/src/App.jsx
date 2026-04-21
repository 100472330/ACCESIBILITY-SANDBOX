import { useEffect, useState } from "react";
import {
  getExperiments,
  getPublishedExperiments,
  createExperiment,
  updateExperimentStatus,
  createEvaluation,
} from "./api";
import "./index.css";

import DeveloperView from "./components/DeveloperView";
import ModeratorView from "./components/ModeratorView";
import UserView from "./components/UserView";

function App() {
  const [role, setRole] = useState("");
  const [experiments, setExperiments] = useState([]);
  const [publishedExperiments, setPublishedExperiments] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadExperiments() {
    try {
      const data = await getExperiments();
      setExperiments(data);
    } catch (err) {
      setError("Error loading experiments");
      console.error(err);
    }
  }

  async function loadPublishedExperiments() {
    try {
      const data = await getPublishedExperiments();
      setPublishedExperiments(data);
    } catch (err) {
      setError("Error loading published experiments");
      console.error(err);
    }
  }

  useEffect(() => {
    loadExperiments();
    loadPublishedExperiments();
  }, []);

  useEffect(() => {
  if (successMessage) {
    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [successMessage]);

  async function handleCreateExperiment(payload) {
    try {
      setError("");
      await createExperiment(payload);
      setSuccessMessage("Experimento creado correctamente");
      await loadExperiments();
    } catch (err) {
      console.error(err);
      setError("Error creando experimento");
    }
  }

  async function handleUpdateStatus(id, status) {
    try {
      await updateExperimentStatus(id, status);
      setSuccessMessage(
        status === "approved"
          ? "Experimento aprobado"
          : "Experimento rechazado"
      );
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError("Error actualizando el estado");
    }
  }

  async function handleCreateEvaluation(payload) {
    try {
      await createEvaluation(payload);
      setSuccessMessage("Evaluación enviada correctamente");
    } catch (err) {
      console.error(err);
      setError("Error creando evaluación");
    }
  }

  if (!role) {
  return (
    <div className="app">
      <section className="card login-card">
        <h1>Accessibility Sandbox</h1>
        <p className="login-tag">
          Entorno de evaluación para desarrollador, moderador y usuario final
        </p>
        <p className="login-subtitle">
          Prototipo para evaluar accesibilidad cognitiva en componentes web
          mediante comparación A/B y evaluación estructurada.
        </p>

        <div className="role-cards">
          <div className="role-card" onClick={() => setRole("developer")}>
            <h2>Developer</h2>
            <p>Crea experimentos, define variantes y analiza resultados.</p>
          </div>

          <div className="role-card" onClick={() => setRole("moderator")}>
            <h2>Moderator</h2>
            <p>Revisa experimentos pendientes y decide si se publican.</p>
          </div>

          <div className="role-card" onClick={() => setRole("user")}>
            <h2>User</h2>
            <p>Evalúa componentes publicados y aporta feedback cuantitativo y cualitativo.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

  return (
    <div className="app">
      <header className="header">
        <h1>Accessibility Sandbox</h1>
        <div className="role-switcher">
          <span>Rol actual: <strong>{role}</strong></span>
          <button onClick={() => setRole("")}>Cambiar rol</button>
        </div>
      </header>

      {successMessage && (
        <p className="success">{successMessage}</p>
      )}

      {error && <p className="error">{error}</p>}


      {role === "developer" && (
        <section className="card role-banner developer-banner">
          <h2>Panel de desarrollador</h2>
          <p>Crea experimentos, consulta su estado y analiza resultados.</p>
        </section>
      )}

      {role === "moderator" && (
        <section className="card role-banner moderator-banner">
          <h2>Panel de moderación</h2>
          <p>Revisa experimentos pendientes y decide si se publican.</p>
        </section>
      )}

      {role === "user" && (
        <section className="card role-banner user-banner">
          <h2>Área de evaluación</h2>
          <p>Explora experimentos publicados y envía tu evaluación.</p>
        </section>
      )}
      
      {role === "developer" && (
        <DeveloperView
          experiments={experiments}
          onCreate={handleCreateExperiment}
        />
      )}

      {role === "moderator" && (
        <ModeratorView
          experiments={experiments}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {role === "user" && (
        <UserView
          experiments={publishedExperiments}
          onEvaluate={handleCreateEvaluation}
        />
      )}
    </div>
  );
}

export default App;