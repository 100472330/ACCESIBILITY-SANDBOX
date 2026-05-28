import { useEffect, useState } from "react";
import {
  getExperiments,
  getPublishedExperiments,
  createExperiment,
  updateExperimentStatus,
  createEvaluation,
  updateExperimentCategory,
  updateApprovedQuestions,
  registerUser,
  loginUser,
  getPendingUsers,
  updateUserStatus,
  getEvaluatedExperimentIds,
} from "./api";
import "./index.css";

import DeveloperView from "./components/DeveloperView";
import ModeratorView from "./components/ModeratorView";
import UserView from "./components/UserView";
import AuthView from "./components/auth/AuthView";

function App() {
  const [role, setRole] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [authFlow, setAuthFlow] = useState("");
  const [publicPage, setPublicPage] = useState("home");
  const [experiments, setExperiments] = useState([]);
  const [publishedExperiments, setPublishedExperiments] = useState([]);
  const [evaluatedExperimentIds, setEvaluatedExperimentIds] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
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
    loadPendingUsers();
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage("");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError("");
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");

    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);

      setCurrentUser(parsedUser);
      setRole(parsedUser.role);
      if (parsedUser.role === "user") {
        loadEvaluatedExperimentIds(parsedUser.id);
      }
    }
  }, []);

  async function loadPendingUsers() {
    try {
      const data = await getPendingUsers();
      setPendingUsers(data);
    } catch (err) {
      console.error(err);
      setError("Error loading pending users");
    }
  }

  async function loadEvaluatedExperimentIds(userId) {
    if (!userId) return;

    try {
      const data = await getEvaluatedExperimentIds(userId);
      setEvaluatedExperimentIds(data);
    } catch (err) {
      console.error(err);
      setError("Error loading evaluated experiments");
    }
  }

  async function handleCreateExperiment(payload) {
    try {
      setError("");

      await createExperiment(payload);

      setSuccessMessage("Experimento creado correctamente");
      setError("");

      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error creando experimento");
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

  async function handleUpdateCategory(id, category) {
    try {
      await updateExperimentCategory(id, category);
      setSuccessMessage("Categoría actualizada correctamente");
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError("Error actualizando la categoría");
    }
  }

  async function handleUpdateApprovedQuestions(id, approvedQuestions) {
    try {
      await updateApprovedQuestions(id, approvedQuestions);
      setSuccessMessage("Preguntas aprobadas actualizadas correctamente");
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError("Error actualizando las preguntas aprobadas");
    }
  }

  async function handleCreateEvaluation(payload) {
    try {
      await createEvaluation(payload);
      if (currentUser?.role === "user") {
        await loadEvaluatedExperimentIds(currentUser.id);
      }
      setSuccessMessage("Evaluación enviada correctamente");
    } catch (err) {
      console.error(err);
      setError("Error creando evaluación");
    }
  }

  async function handleLogin(payload) {
    try {
      setError("");

      const data = await loginUser(payload);

      localStorage.setItem("authToken", data.token);
      localStorage.setItem(
        "authUser",
        JSON.stringify(data.user)
      );

      setCurrentUser(data.user);
      setRole(data.user.role);
      if (data.user.role === "user") {
        await loadEvaluatedExperimentIds(data.user.id);
      }
      setAuthFlow("");
      setSuccessMessage("Sesión iniciada correctamente");
    } catch (err) {
      console.error(err);
      setError(err.message || "Error iniciando sesión");
    }
  }

  async function handleSignup(payload) {
    try {
      setError("");

      const data = await registerUser(payload);

      if (data.role === "developer" && data.account_status === "pending") {
        setSuccessMessage(
          "Cuenta creada correctamente. Queda pendiente de aprobación por un moderador."
        );
        setAuthFlow("");
        return;
      }

      localStorage.setItem(
        "authUser",
        JSON.stringify(data)
      );

      setCurrentUser(data);
      setRole(data.role);
      setAuthFlow("");
      setSuccessMessage("Cuenta creada correctamente");
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      setError(err.message || "Error creando cuenta");
    }
  }

  async function handleUpdateUserStatus(id, accountStatus) {
    try {
      setError("");

      await updateUserStatus(id, accountStatus);

      setSuccessMessage(
        accountStatus === "approved"
          ? "Developer aprobado correctamente"
          : "Developer rechazado correctamente"
      );

      await loadPendingUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error actualizando usuario");
    }
  }

  function renderAuthFlow() {
    if (authFlow === "developer") {
      return (
        <AuthView
          role="developer"
          allowSignup
          onBack={() => setAuthFlow("")}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      );
    }

    if (authFlow === "moderator") {
      return (
        <AuthView
          role="moderator"
          allowSignup={false}
          onBack={() => setAuthFlow("")}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      );
    }

    if (authFlow === "user") {
      return (
        <AuthView
          role="user"
          allowSignup
          onBack={() => setAuthFlow("")}
          onLogin={handleLogin}
          onSignup={handleSignup}
        />
      );
    }

    return null;
  }
  
  // public pages
  function renderPublicPage() {
    if (publicPage === "help") {
      return (
        <section className="card login-card">
          <h1>Ayuda</h1>
          <p>Selecciona un rol para empezar a usar la plataforma.</p>
          <button onClick={() => setPublicPage("home")}>Volver</button>
        </section>
      );
    }

    if (publicPage === "contact") {
      return (
        <section className="card login-card">
          <h1>Contacto</h1>
          <p>Para soporte o dudas, contacta con el equipo.</p>
          <button onClick={() => setPublicPage("home")}>Volver</button>
        </section>
      );
    }

    if (publicPage === "privacy") {
      return (
        <section className="card login-card">
          <h1>Privacidad</h1>
          <p>Solo se almacenan datos de evaluación para análisis.</p>
          <button onClick={() => setPublicPage("home")}>Volver</button>
        </section>
      );
    }

    if (publicPage === "about") {
      return (
        <section className="card login-card">
          <h1>About us</h1>
          <p>Proyecto académico sobre accesibilidad cognitiva.</p>
          <button onClick={() => setPublicPage("home")}>Volver</button>
        </section>
      );
    }

    // HOME
    return (
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
          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("developer")}
          >
            <h2>Developer</h2>
            <p>Crea experimentos y analiza resultados.</p>
          </button>

          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("moderator")}
          >
            <h2>Moderator</h2>
            <p>Revisa experimentos y decide si se publican.</p>
          </button>

          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("user")}
          >
            <h2>User</h2>
            <p>Evalúa componentes y aporta feedback.</p>
          </button>
        </div>
      </section>
    );
  }

  
  if (!role) {
    return (
      <div className="app public-app">
        <header className="public-header">
          <div
            className="public-header-brand"
            onClick={() => {
              setPublicPage("home");
              setAuthFlow("");
            }}
          >
            Accessibility Sandbox
          </div>

          <nav className="public-nav">
            <button onClick={() => setPublicPage("home")}>Inicio</button>
          </nav>
        </header>

        <main className="public-main">
          <div className="public-content">
            {successMessage && <p className="success">{successMessage}</p>}
            {error && <p className="error">{error}</p>}

            {authFlow ? renderAuthFlow() : renderPublicPage()}
          </div>
        </main>

        <footer className="public-footer">
          <button onClick={() => setPublicPage("help")}>Ayuda</button>
          <button onClick={() => setPublicPage("contact")}>
            Contacto
          </button>
          <button onClick={() => setPublicPage("privacy")}>
            Privacidad
          </button>
          <button onClick={() => setPublicPage("about")}>
            About us
          </button>
        </footer>
      </div>
    );
  }

  // 🔹 app principal
  return (
    <div className="app">
      <header className="header">
        <h1>Accessibility Sandbox</h1>
        <div className="role-switcher">
          <span>
            {currentUser?.name || "Usuario"} ·{" "}
            <strong>{currentUser?.role || role}</strong>
          </span>
          <button
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("authUser");

              setCurrentUser(null);
              setRole("");
              setAuthFlow("");
              setSuccessMessage("Sesión cerrada correctamente");
            }}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {successMessage && <p className="success">{successMessage}</p>}
      {error && <p className="error">{error}</p>}

      {role === "developer" && (
        <section className="card role-banner developer-banner">
          <h2>Panel de desarrollador</h2>
          <p>Crea experimentos y analiza resultados.</p>
        </section>
      )}

      {role === "moderator" && (
        <section className="card role-banner moderator-banner">
          <h2>Panel de moderación</h2>
          <p>Revisa experimentos pendientes.</p>
        </section>
      )}

      {role === "user" && (
        <section className="card role-banner user-banner">
          <h2>Área de evaluación</h2>
          <p>Evalúa componentes publicados.</p>
        </section>
      )}

      {role === "developer" && (
        <DeveloperView
          experiments={experiments.filter(
            (experiment) => experiment.created_by_id === currentUser?.id
          )}
          currentUser={currentUser}
          onCreate={handleCreateExperiment}
        />
      )}

      {role === "moderator" && (
        <ModeratorView
          experiments={experiments}
          pendingUsers={pendingUsers}
          onUpdateStatus={handleUpdateStatus}
          onUpdateCategory={handleUpdateCategory}
          onUpdateApprovedQuestions={handleUpdateApprovedQuestions}
          onUpdateUserStatus={handleUpdateUserStatus}
        />
      )}

      {role === "user" && (
        <UserView
          experiments={publishedExperiments}
          currentUser={currentUser}
          evaluatedExperimentIds={evaluatedExperimentIds}
          onEvaluate={handleCreateEvaluation}
        />
      )}
    </div>
  );

}


export default App;