import { useState } from "react";
import { buildPreviewHtml } from "../utils/previewHtml";
import ConfirmModal from "./ConfirmModal";

function ModeratorView({
    experiments,
    pendingUsers = [],
    onUpdateStatus,
    onUpdateCategory,
    onUpdateApprovedQuestions,
    onUpdateUserStatus,
  }) {
  const [openPreview, setOpenPreview] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [approvedQuestionsByExperiment, setApprovedQuestionsByExperiment] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const pendingExperiments = experiments.filter(
    (experiment) => experiment.status === "pending"
  );

  const categories = [
    { value: "form", label: "Formularios" },
    { value: "login", label: "Pantallas de acceso" },
    { value: "text", label: "Contenido textual" },
    { value: "button", label: "Botones / CTA" },
    { value: "navigation", label: "Navegación" },
    { value: "other", label: "Otros" },
  ];

  const filteredPendingExperiments = selectedCategory
    ? pendingExperiments.filter(
        (experiment) => (experiment.category || "other") === selectedCategory
      )
    : [];

    function togglePreview(id) {
      setOpenPreview((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  
  function parseQuestions(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function toggleApprovedQuestion(experiment, question) {
    const currentApproved =
      approvedQuestionsByExperiment[experiment.id] ??
      parseQuestions(experiment.approved_custom_questions);

    const nextApproved = currentApproved.includes(question)
      ? currentApproved.filter((q) => q !== question)
      : [...currentApproved, question];
    
    console.log("Updating approved questions", experiment.id, nextApproved);

    setApprovedQuestionsByExperiment((prev) => ({
      ...prev,
      [experiment.id]: nextApproved,
    }));

    onUpdateApprovedQuestions(experiment.id, nextApproved);
  }

  function requestStatusChange(experiment, status) {
    setConfirmAction({
      experiment,
      status,
    });
  }

  async function confirmStatusChange() {
    if (!confirmAction) return;

    await onUpdateStatus(confirmAction.experiment.id, confirmAction.status);
    setConfirmAction(null);
  }

  return (
    <>
      <section className="card">
        <h2>Solicitudes de Developer</h2>
        <p className="category-intro">
          Revisa las cuentas de desarrollador que están pendientes de aprobación.
        </p>

        {pendingUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>No hay solicitudes pendientes</h3>
            <p>Actualmente no hay nuevas cuentas de desarrollador esperando revisión.</p>
          </div>
        ) : (
          <div className="experiment-list">
            {pendingUsers.map((user) => (
              <div key={user.id} className="experiment-item">
                <div className="experiment-card-header">
                  <div>
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                  </div>

                  <span className="status-badge status-pending">
                    {user.account_status}
                  </span>
                </div>

                <p>
                  <strong>Rol solicitado:</strong> {user.role}
                </p>

                <div className="actions">
                  <button
                    className="approve-btn"
                    onClick={() => onUpdateUserStatus(user.id, "approved")}
                  >
                    Aprobar developer
                  </button>

                  <button
                    className="reject-btn"
                    onClick={() => onUpdateUserStatus(user.id, "rejected")}
                  >
                    Rechazar developer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Moderación</h2>
        <p className="category-intro">
          Selecciona una categoría para revisar los experimentos pendientes.
        </p>

        <div className="category-card-grid">
          {categories.map((category) => (
            <button
              type="button"
              key={category.value}
              className={`category-card ${
                selectedCategory === category.value ? "active-category-card" : ""
              }`}
              onClick={() => setSelectedCategory(category.value)}
            >
              <h3>{category.label}</h3>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        {selectedCategory === "" ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡</div>
            <h3>Selecciona una categoría</h3>
            <p>
              Elige una categoría para revisar los experimentos pendientes de moderación.
            </p>
          </div>
        ) : filteredPendingExperiments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>No hay experimentos pendientes</h3>
            <p>
              Actualmente no existen experimentos pendientes de revisión en esta categoría.
            </p>
          </div>
        ) : (
          <div className="experiment-list">
            {filteredPendingExperiments.map((experiment) => {
              const customQuestions = parseQuestions(experiment.custom_questions);
              const approvedQuestions =
                approvedQuestionsByExperiment[experiment.id] ??
                parseQuestions(experiment.approved_custom_questions);

              return (
                <div
                  key={experiment.id}
                  className={`experiment-item ${
                    openPreview[experiment.id] ? "expanded" : ""
                  }`}
                >
                  <h3>{experiment.title}</h3>

                  <p className="experiment-short-description">
                    {experiment.short_description || "Sin descripción breve"}
                  </p>

                  <p className="experiment-long-description">
                    {experiment.description || "Sin descripción detallada"}
                  </p>

                  {experiment.instructions && (
                    <div className="experiment-instructions">
                      <h4>Instrucciones</h4>
                      <p>{experiment.instructions}</p>
                    </div>
                  )}

                  <p>
                    <strong>Tipo:</strong> {experiment.type}
                  </p>

                  <label className="moderator-category-select">
                    <strong>Categoría:</strong>
                    <select
                      value={experiment.category || "other"}
                      onChange={(e) =>
                        onUpdateCategory(experiment.id, e.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {customQuestions.length > 0 && (
                    <div className="moderator-questions-box">
                      <p>
                        <strong>Preguntas personalizadas propuestas:</strong>
                      </p>

                      {customQuestions.map((question, index) => {
                        const checked = approvedQuestions.includes(question);

                        return (
                          <label
                            key={index}
                            className="moderator-question-item"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleApprovedQuestion(experiment, question)
                              }
                            />
                            <span>{question}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <p>
                    <strong>Estado:</strong> {experiment.status}
                  </p>

                  <button onClick={() => togglePreview(experiment.id)}>
                    {openPreview[experiment.id]
                      ? "Ocultar vista previa"
                      : "Ver vista previa"}
                  </button>

                  {openPreview[experiment.id] && (
                    <div className="moderator-preview-box">
                      <p className="preview-label">
                        {experiment.type === "ab"
                          ? "Comparación de variantes"
                          : "Vista previa del componente"}
                      </p>

                      {experiment.type === "single" && (
                        <iframe
                          title={`preview-${experiment.id}`}
                          className="preview-frame"
                          sandbox="allow-scripts allow-forms"
                          srcDoc={buildPreviewHtml(
                            experiment.variant_a_html
                          )}
                        />
                      )}

                      {experiment.type === "ab" && (
                        <div className="ab-container">
                          <div className="ab-variant">
                            <h4>Variante A</h4>
                            <iframe
                              title={`preview-a-${experiment.id}`}
                              className="preview-frame"
                              sandbox="allow-scripts allow-forms"
                              srcDoc={buildPreviewHtml(
                                experiment.variant_a_html
                              )}
                            />
                          </div>

                          <div className="ab-variant">
                            <h4>Variante B</h4>
                            <iframe
                              title={`preview-b-${experiment.id}`}
                              className="preview-frame"
                              sandbox="allow-scripts allow-forms"
                              srcDoc={buildPreviewHtml(
                                experiment.variant_b_html
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="actions">
                    <button
                      className="approve-btn"
                      onClick={() => requestStatusChange(experiment, "approved")}
                    >
                      Aprobar
                    </button>

                   <button
                    className="reject-btn"
                    onClick={() => requestStatusChange(experiment, "rejected")}
                  >
                    Rechazar
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.status === "approved"
              ? "Confirmar aprobación"
              : "Confirmar rechazo"
          }
          message={
            confirmAction.status === "approved"
              ? `El experimento "${confirmAction.experiment.title}" será publicado y visible para los usuarios.`
              : `El experimento "${confirmAction.experiment.title}" será rechazado y no estará disponible para evaluación.`
          }
          confirmLabel={
            confirmAction.status === "approved"
              ? "Aprobar experimento"
              : "Rechazar experimento"
          }
          confirmClassName={
            confirmAction.status === "approved"
              ? "approve-btn"
              : "reject-btn"
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmStatusChange}
        />
      )}
    </>
  );
}
export default ModeratorView;