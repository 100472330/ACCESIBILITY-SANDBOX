import { useState } from "react";
import { buildPreviewHtml } from "../utils/previewHtml";

function ModeratorView({ experiments, onUpdateStatus }) {
  const [openPreview, setOpenPreview] = useState({});

  const pendingExperiments = experiments.filter(
    (experiment) => experiment.status === "pending"
  );

  function togglePreview(id) {
    setOpenPreview((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  return (
    <section className="card">
      <h2>Moderación</h2>
      {pendingExperiments.length === 0 ? (
        <p>No hay experimentos pendientes.</p>
      ) : (
        <div className="experiment-list">
          {pendingExperiments.map((experiment) => (
            <div
              key={experiment.id}
              className={`experiment-item ${
                openPreview[experiment.id] ? "expanded" : ""
              }`}
            >
              <h3>{experiment.title}</h3>
              <p>{experiment.description || "Sin descripción"}</p>
              <p><strong>Tipo:</strong> {experiment.type}</p>
              <p><strong>Estado:</strong> {experiment.status}</p>

              <button onClick={() => togglePreview(experiment.id)}>
                {openPreview[experiment.id] ? "Ocultar vista previa" : "Ver vista previa"}
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
                      sandbox="allow-forms allow-same-origin"
                      srcDoc={buildPreviewHtml(experiment.variant_a_html)}
                    />
                  )}

                  {experiment.type === "ab" && (
                    <div className="ab-container">
                      <div className="ab-variant">
                        <h4>Variante A</h4>
                        <iframe
                          title={`preview-a-${experiment.id}`}
                          className="preview-frame"
                          sandbox="allow-forms allow-same-origin"
                          srcDoc={buildPreviewHtml(experiment.variant_a_html)}
                        />
                      </div>

                      <div className="ab-variant">
                        <h4>Variante B</h4>
                        <iframe
                          title={`preview-b-${experiment.id}`}
                          className="preview-frame"
                          sandbox="allow-forms allow-same-origin"
                          srcDoc={buildPreviewHtml(experiment.variant_b_html)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="actions">
                <button
                  className="approve-btn"
                  onClick={() => onUpdateStatus(experiment.id, "approved")}
                >
                  Aprobar
                </button>
                <button
                  className="reject-btn"
                  onClick={() => onUpdateStatus(experiment.id, "rejected")}
                >
                  Rechazar
                </button>
              </div>

              
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
export default ModeratorView;