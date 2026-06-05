import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { i18n, t } = useTranslation();
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

  function changeLanguage(language) {
    i18n.changeLanguage(language);
    localStorage.setItem("language", language);
    document.documentElement.lang = language;
  }

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  async function loadExperiments() {
    try {
      const data = await getExperiments();
      setExperiments(data);
    } catch (err) {
      setError(t("messages.loadingExperiments"));
      console.error(err);
    }
  }

  async function loadPublishedExperiments() {
    try {
      const data = await getPublishedExperiments();
      setPublishedExperiments(data);
    } catch (err) {
      setError(t("messages.loadingPublishedExperiments"));
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
      setError(t("messages.loadingPendingUsers"));
    }
  }

  async function loadEvaluatedExperimentIds(userId) {
    if (!userId) return;

    try {
      const data = await getEvaluatedExperimentIds(userId);
      setEvaluatedExperimentIds(data);
    } catch (err) {
      console.error(err);
      setError(t("messages.loadingEvaluatedExperiments"));
    }
  }

  async function handleCreateExperiment(payload) {
    try {
      setError("");

      await createExperiment(payload);

      setSuccessMessage(t("messages.experimentCreated"));
      setError("");

      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.experimentCreateError"));
    }
  }


  async function handleUpdateStatus(id, status, moderationComment = "") {
    try {
      await updateExperimentStatus(id, status, moderationComment);
      setSuccessMessage(
        status === "approved"
          ? t("messages.experimentApproved")
          : t("messages.experimentRejected")
      );
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError(t("messages.statusUpdateError"));
    }
  }

  async function handleUpdateCategory(id, category) {
    try {
      await updateExperimentCategory(id, category);
      setSuccessMessage(t("messages.categoryUpdated"));
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError(t("messages.categoryUpdateError"));
    }
  }

  async function handleUpdateApprovedQuestions(id, approvedQuestions) {
    try {
      await updateApprovedQuestions(id, approvedQuestions);
      setSuccessMessage(t("messages.approvedQuestionsUpdated"));
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      console.error(err);
      setError(t("messages.approvedQuestionsUpdateError"));
    }
  }

  async function handleCreateEvaluation(payload) {
    try {
      setError("");

      await createEvaluation(payload);

      setSuccessMessage(t("messages.evaluationSubmitted"));

      if (currentUser?.role === "user") {
        await loadEvaluatedExperimentIds(currentUser.id);
        await loadMyEvaluations();
      }
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.evaluationCreateError"));
    }
  }

  async function loadMyEvaluations() {
    try {
      const data = await getMyEvaluations();
      setMyEvaluations(data);
    } catch (err) {
      console.error(err);
      setError(t("messages.loadingEvaluations"));
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
      setSuccessMessage(t("messages.loginSuccess"));
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.loginError"));
    }
  }

  async function handleSignup(payload) {
    try {
      setError("");

      const data = await registerUser(payload);

      if (data.role === "developer" && data.account_status === "pending") {
        setSuccessMessage(
          t("messages.signupPending")
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
      setSuccessMessage(t("messages.signupSuccess"));
    } catch (err) {
      console.error("SIGNUP ERROR:", err);
      setError(err.message || t("messages.signupError"));
    }
  }

  async function handleUpdateUserStatus(id, accountStatus) {
    try {
      setError("");

      await updateUserStatus(id, accountStatus);

      setSuccessMessage(
        accountStatus === "approved"
          ? t("messages.developerApproved")
          : t("messages.developerRejected")
      );

      await loadPendingUsers();
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.userUpdateError"));
    }
  }

  async function handleUpdateExperiment(id, payload) {
    try {
      setError("");

      await updateExperiment(id, payload);

      setSuccessMessage(t("messages.experimentResubmitted"));

      await loadExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.experimentUpdateError"));
    }
  }

  async function handleArchiveExperiment(id) {
    try {
      setError("");

      await archiveExperiment(id);

      setSuccessMessage(t("messages.experimentArchived"));

      await loadExperiments();
    } catch (err) {
      console.error(err);
      setError(err.message || t("messages.experimentArchiveError"));
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
  
  function renderPublicInfoPage(pageKey) {
    const page = t(`public.pages.${pageKey}`, { returnObjects: true });

    return (
      <section className="card login-card public-info-card">
        <p className="login-tag">{t("public.infoLabel")}</p>
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
          {t("common.back")}
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
          {t("public.home.tag")}
        </p>
        <p className="login-subtitle">
          {t("public.home.subtitle")}
        </p>

        <div className="role-cards">
          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("developer")}
          >
            <h2>{t("public.home.roles.developer.title")}</h2>
            <p>{t("public.home.roles.developer.description")}</p>
          </button>

          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("moderator")}
          >
            <h2>{t("public.home.roles.moderator.title")}</h2>
            <p>{t("public.home.roles.moderator.description")}</p>
          </button>

          <button
            type="button"
            className="role-card"
            onClick={() => setAuthFlow("user")}
          >
            <h2>{t("public.home.roles.user.title")}</h2>
            <p>{t("public.home.roles.user.description")}</p>
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
            <button onClick={() => setPublicPage("home")}>
              {t("public.nav.home")}
            </button>
          </nav>

          <div className="language-switcher" aria-label={t("common.language")}>
            <button
              type="button"
              className={i18n.language === "es" ? "active-language" : ""}
              onClick={() => changeLanguage("es")}
            >
              ES
            </button>
            <button
              type="button"
              className={i18n.language === "en" ? "active-language" : ""}
              onClick={() => changeLanguage("en")}
            >
              EN
            </button>
          </div>
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
                {t("public.footer.summary")}
              </p>
            </div>

            <nav className="public-footer-links" aria-label={t("public.infoLabel")}>
              <button type="button" onClick={() => setPublicPage("contact")}>
                <span>{t("public.footer.links.contact.title")}</span>
                <small>{t("public.footer.links.contact.description")}</small>
              </button>
              <button type="button" onClick={() => setPublicPage("help")}>
                <span>{t("public.footer.links.help.title")}</span>
                <small>{t("public.footer.links.help.description")}</small>
              </button>
              <button type="button" onClick={() => setPublicPage("privacy")}>
                <span>{t("public.footer.links.privacy.title")}</span>
                <small>{t("public.footer.links.privacy.description")}</small>
              </button>
              <button type="button" onClick={() => setPublicPage("about")}>
                <span>{t("public.footer.links.about.title")}</span>
                <small>{t("public.footer.links.about.description")}</small>
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
            {currentUser?.name || t("app.userFallback")} ·{" "}
            <strong>{currentUser?.role || role}</strong>
          </span>
          <button
            onClick={() => {
              localStorage.removeItem("authToken");
              localStorage.removeItem("authUser");

              setCurrentUser(null);
              setRole("");
              setAuthFlow("");
              setSuccessMessage(t("messages.logoutSuccess"));
            }}
          >
            {t("app.logout")}
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
          <h2>{t("app.banners.developer.title")}</h2>
          <p>{t("app.banners.developer.body")}</p>
        </section>
      )}

      {role === "moderator" && (
        <section className="card role-banner moderator-banner">
          <h2>{t("app.banners.moderator.title")}</h2>
          <p>{t("app.banners.moderator.body")}</p>
        </section>
      )}

      {role === "user" && (
        <section className="card role-banner user-banner">
          <h2>{t("app.banners.user.title")}</h2>
          <p>{t("app.banners.user.body")}</p>
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
