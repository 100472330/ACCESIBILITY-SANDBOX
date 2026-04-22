import { useState } from "react";
import { buildPreviewHtml } from "../utils/previewHtml";

function UserView({ experiments, onEvaluate }) {
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [form, setForm] = useState({
    clarity: 3,
    comprehension: 3,
    cognitive_load: 3,
    preferred_variant: "",
    comment: "",
  });

  const selectedExperiment = experiments.find(
    (experiment) => experiment.id === selectedExperimentId
  );

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedExperiment) return;

    await onEvaluate({
      experiment_id: selectedExperiment.id,
      clarity: Number(form.clarity),
      comprehension: Number(form.comprehension),
      cognitive_load: Number(form.cognitive_load),
      preferred_variant: form.preferred_variant || null,
      comment: form.comment,
    });

    setForm({
      clarity: 3,
      comprehension: 3,
      cognitive_load: 3,
      preferred_variant: "",
      comment: "",
    });

  }

  return (
    <>
      <section className="card">
        <h2>Experimentos publicados</h2>
        {experiments.length === 0 ? (
          <p>No hay experimentos publicados.</p>
        ) : (
          <div className="experiment-list">
            {experiments.map((experiment) => (
              <div
                key={experiment.id}
                className={`experiment-item selectable ${
                  selectedExperimentId === experiment.id ? "selected" : ""
                }`}
                onClick={() => setSelectedExperimentId(experiment.id)}
              >
                <h3>{experiment.title}</h3>
                <p>{experiment.description || "Sin descripción"}</p>
                <p><strong>Tipo:</strong> {experiment.type}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedExperiment && (
        <>
          <section className="card">
            <h2>Vista previa del componente</h2>
            {selectedExperiment.type === "single" && (
              <iframe
                title="preview"
                className="preview-frame"
                sandbox="allow-forms allow-same-origin"
                srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
              />
            )}

            {selectedExperiment.type === "ab" && (
              <div className="ab-container">
                <div className={`ab-variant ${form.preferred_variant === "A" ? "selected" : ""}`}>
                  <h3>Variante A</h3>
                  <iframe
                    title="variant-a"
                    className="preview-frame"
                    sandbox="allow-forms allow-same-origin"
                    srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
                  />
                </div>

                <div className={`ab-variant ${form.preferred_variant === "B" ? "selected" : ""}`}>
                  <h3>Variante B</h3>
                  <iframe
                    title="variant-b"
                    className="preview-frame"
                    sandbox="allow-forms allow-same-origin"
                    srcDoc={buildPreviewHtml(selectedExperiment.variant_b_html)}
                  />
                </div>
              </div>
            )}
          </section>

          <section className="card">
            <h2>Evaluar experimento</h2>
            <form onSubmit={handleSubmit} className="form">
              <label>
                Claridad
                <select
                  name="clarity"
                  value={form.clarity}
                  onChange={handleChange}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>

              <label>
                Comprensión
                <select
                  name="comprehension"
                  value={form.comprehension}
                  onChange={handleChange}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>

              <label>
                Carga cognitiva
                <select
                  name="cognitive_load"
                  value={form.cognitive_load}
                  onChange={handleChange}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </select>
              </label>

              {selectedExperiment.type === "ab" && (
                <div className="ab-choice">
                  <p><strong>¿Qué variante prefieres?</strong></p>

                  <label>
                    <input
                      type="radio"
                      name="preferred_variant"
                      value="A"
                      checked={form.preferred_variant === "A"}
                      onChange={handleChange}
                    />
                    Variante A
                  </label>

                  <label>
                    <input
                      type="radio"
                      name="preferred_variant"
                      value="B"
                      checked={form.preferred_variant === "B"}
                      onChange={handleChange}
                    />
                    Variante B
                  </label>
                </div>
              )}

              <textarea
                name="comment"
                placeholder="Comentario opcional"
                value={form.comment}
                onChange={handleChange}
              />

              <button type="submit">Enviar evaluación</button>
            </form>
          </section>
        </>
      )}
    </>
  );
}
export default UserView;