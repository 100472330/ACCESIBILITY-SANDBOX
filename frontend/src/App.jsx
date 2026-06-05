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
  getMyEvaluations,
  updateExperiment,
  archiveExperiment,
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
  const [myEvaluations, setMyEvaluations] = useState([]);
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
        loadMyEvaluations();
      }
      loadExperiments();
      loadPublishedExperiments();

      if (parsedUser.role === "moderator") {
        loadPendingUsers();
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


  async function handleUpdateStatus(id, status, moderationComment = "") {
    try {
      await updateExperimentStatus(id, status, moderationComment);
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
      setError("");

      await createEvaluation(payload);

      setSuccessMessage("Evaluación enviada correctamente");

      if (currentUser?.role === "user") {
        await loadEvaluatedExperimentIds(currentUser.id);
        await loadMyEvaluations();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error creando evaluación");
    }
  }

  async function loadMyEvaluations() {
    try {
      const data = await getMyEvaluations();
      setMyEvaluations(data);
    } catch (err) {
      console.error(err);
      setError("Error loading evaluations");
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
        await loadMyEvaluations();
      }
      setAuthFlow("");
      await loadExperiments();
      await loadPublishedExperiments();
      

      if (data.user.role === "moderator") {
        await loadPendingUsers();
      }
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

  async function handleUpdateExperiment(id, payload) {
    try {
      setError("");

      await updateExperiment(id, payload);

      setSuccessMessage("Experimento corregido y reenviado a moderación");

      await loadExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error actualizando experimento");
    }
  }

  async function handleArchiveExperiment(id) {
    try {
      setError("");

      await archiveExperiment(id);

      setSuccessMessage("Experimento archivado correctamente");

      await loadExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || "Error archivando experimento");
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
  const publicPageDetails = {
    help: {
      title: "Ayuda",
      intro:
        "Encuentra el punto de entrada adecuado según tu rol y el tipo de tarea que quieres realizar en Accessibility Sandbox.",
      sections: [
        {
          heading: "Usuarios evaluadores",
          body: "Accede como usuario final para completar evaluaciones publicadas, comparar variantes A/B y enviar observaciones sobre claridad, comprensión y esfuerzo cognitivo.",
        },
        {
          heading: "Moderadores",
          body: "Revisa experimentos pendientes, valida que la evaluación sea comprensible y decide si cada propuesta está lista para publicarse.",
        },
        {
          heading: "Desarrolladores",
          body: "Crea experimentos, prepara variantes accesibles y consulta resultados para iterar sobre componentes web con evidencia estructurada.",
        },
      ],
    },
    contact: {
      title: "Contacto",
      intro:
        "Si necesitas soporte, tienes una incidencia o quieres proponer una colaboración, escribe al equipo responsable del proyecto.",
      sections: [
        {
          heading: "Soporte general",
          body: "accessibility-sandbox@uc3m.example",
        },
        {
          heading: "Atención académica",
          body: "Para consultas sobre investigaciones, sesiones de evaluación o participación de estudiantes, indica tu nombre, rol y contexto de uso.",
        },
        {
          heading: "Dirección de referencia",
          body: "Campus de Leganés, Av. Universidad 30, 28911 Leganés, Madrid.",
        },
        {
          heading: "Tiempo de respuesta",
          body: "Las solicitudes se revisan en días laborables. Las incidencias que bloquean evaluaciones activas tienen prioridad.",
        },
      ],
    },
    privacy: {
      title: "Privacidad",
      intro:
        "La plataforma limita la recogida de información a lo necesario para autenticar participantes, moderar experimentos y analizar evaluaciones.",
      sections: [
        {
          heading: "Datos almacenados",
          body: "Se guardan perfiles de acceso, experimentos creados, decisiones de moderación, respuestas de evaluación y comentarios asociados.",
        },
        {
          heading: "Uso de la información",
          body: "Los datos se utilizan para investigación, mejora de componentes y seguimiento del proceso de evaluación. No se venden ni se comparten con fines comerciales.",
        },
        {
          heading: "Control y revisión",
          body: "Puedes solicitar revisión, rectificación o eliminación de datos vinculados a tu cuenta contactando con el equipo del proyecto.",
        },
      ],
    },
    about: {
      title: "About us",
      intro:
        "Accessibility Sandbox es un prototipo académico para estudiar cómo pequeñas decisiones de interfaz afectan a la accesibilidad cognitiva.",
      sections: [
        {
          heading: "Propósito",
          body: "Ayudar a equipos docentes, investigadores y desarrolladores a comparar componentes web de forma controlada y comprensible.",
        },
        {
          heading: "Método",
          body: "La plataforma combina roles diferenciados, moderación previa, comparaciones A/B y evaluaciones estructuradas para generar evidencia accionable.",
        },
        {
          heading: "Compromiso",
          body: "El proyecto prioriza claridad, trazabilidad y respeto por las personas que participan en las evaluaciones.",
        },
      ],
    },
  };

  function renderPublicInfoPage(pageKey) {
    const page = publicPageDetails[pageKey];

    return (
      <section className="card login-card public-info-card">
        <p className="login-tag">Información pública</p>
        <h1>{page.title}</h1>
        <p className="public-info-intro">{page.intro}</p>

        <div className="public-info-grid">
          {page.sections.map((section) => (
            <article className="public-info-item" key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </div>

        <button type="button" onClick={() => setPublicPage("home")}>
          Volver
        </button>
      </section>
    );
  }

  function renderPublicPage() {
    if (publicPage === "help") {
      return renderPublicInfoPage("help");
    }

    if (publicPage === "contact") {
      return renderPublicInfoPage("contact");
    }

    if (publicPage === "privacy") {
      return renderPublicInfoPage("privacy");
    }

    if (publicPage === "about") {
      return renderPublicInfoPage("about");
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
            {successMessage && (
              <p className="success" role="status" aria-live="polite">
                {successMessage}
              </p>
            )}
            {error && (
              <p className="error" role="alert" aria-live="assertive">
                {error}
              </p>
            )}

            {authFlow ? renderAuthFlow() : renderPublicPage()}
          </div>
        </main>

        <footer className="public-footer">
          <div className="public-footer-inner">
            <div className="public-footer-summary">
              <strong>Accessibility Sandbox</strong>
              <p>
                Entorno académico para evaluar accesibilidad cognitiva en
                componentes web mediante experimentos moderados.
              </p>
            </div>

            <nav className="public-footer-links" aria-label="Información pública">
              <button type="button" onClick={() => setPublicPage("contact")}>
                <span>Contacto</span>
                <small>Soporte, colaboraciones y dirección de referencia</small>
              </button>
              <button type="button" onClick={() => setPublicPage("help")}>
                <span>Ayuda</span>
                <small>Rutas para usuarios, moderadores y desarrolladores</small>
              </button>
              <button type="button" onClick={() => setPublicPage("privacy")}>
                <span>Privacidad</span>
                <small>Datos tratados, finalidad y solicitudes</small>
              </button>
              <button type="button" onClick={() => setPublicPage("about")}>
                <span>About us</span>
                <small>Proyecto, método y compromiso académico</small>
              </button>
            </nav>
          </div>
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

      {successMessage && (
        <p className="success" role="status" aria-live="polite">
          {successMessage}
        </p>
      )}
      {error && (
        <p className="error" role="alert" aria-live="assertive">
          {error}
        </p>
      )}

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
          onUpdateExperiment={handleUpdateExperiment}
          onArchiveExperiment={handleArchiveExperiment}
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
          myEvaluations={myEvaluations}
          onEvaluate={handleCreateEvaluation}
        />
      )}
    </div>
  );

}


export default App;
