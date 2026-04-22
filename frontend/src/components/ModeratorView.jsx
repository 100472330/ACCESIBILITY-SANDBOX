import { useState } from "react";

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

  function buildPreviewHtml(rawHtml) {
    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              min-height: 100%;
              font-family: Arial, sans-serif;
              background: #f8fafc;
            }

            .preview-shell {
              box-sizing: border-box;
              width: 100%;
              min-height: 100vh;
              padding: 32px 24px;
              display: flex;
              justify-content: center;
              align-items: flex-start;
            }

            .preview-card {
              width: 100%;
              max-width: 720px;
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 16px;
              padding: 32px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
            }
          </style>
        </head>
        <body>
          <div class="preview-shell">
            <div class="preview-card">
              ${rawHtml || ""}
            </div>
          </div>
        </body>
      </html>
    `;
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