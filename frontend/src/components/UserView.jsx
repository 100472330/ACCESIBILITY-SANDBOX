import { useState } from "react";
import { buildPreviewHtml } from "../utils/previewHtml";

const standardQuestions = [
  { id: "q1", text: "El propósito del componente se entiende rápidamente." },
  { id: "q2", text: "La información principal está organizada de forma clara." },
  { id: "q3", text: "Los textos e instrucciones son fáciles de comprender." },
  { id: "q4", text: "Sé qué acción debo realizar sin necesitar ayuda externa." },
  { id: "q5", text: "Los elementos importantes son fáciles de identificar visualmente." },
  { id: "q6", text: "El componente evita mostrar demasiada información al mismo tiempo." },
  { id: "q7", text: "El orden de los elementos facilita completar la tarea." },
  { id: "q8", text: "Los nombres de botones, campos o enlaces son claros." },
  { id: "q9", text: "El componente reduce la posibilidad de cometer errores." },
  { id: "q10", text: "La experiencia general resulta sencilla y poco demandante." },
];

const initialForm = {
  standard_answers: {
    q1: 3,
    q2: 3,
    q3: 3,
    q4: 3,
    q5: 3,
    q6: 3,
    q7: 3,
    q8: 3,
    q9: 3,
    q10: 3,
  },
  preferred_variant: "",
  comment: "",
};

function safeParseArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function UserView({ experiments, onEvaluate }) {
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customAnswers, setCustomAnswers] = useState({});
  const [form, setForm] = useState(initialForm);

  const selectedExperiment = experiments.find(
    (experiment) => experiment.id === selectedExperimentId
  );

  const customQuestions = selectedExperiment
    ? safeParseArray(selectedExperiment.approved_custom_questions)
    : [];

  const categories = [
    { value: "form", label: "Formularios" },
    { value: "login", label: "Formularios de Login" },
    { value: "text", label: "Textos" },
    { value: "button", label: "Botones / CTA" },
    { value: "navigation", label: "Barras de Navegación" },
    { value: "other", label: "Otros" },
  ];

  const filteredExperiments = selectedCategory
    ? experiments.filter(
        (experiment) => (experiment.category || "other") === selectedCategory
      )
    : [];

  function resetEvaluationForm() {
    setForm(initialForm);
    setCustomAnswers({});
  }

  function openExperiment(experimentId) {
    setSelectedExperimentId(experimentId);
    resetEvaluationForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeExperiment() {
    setSelectedExperimentId(null);
    resetEvaluationForm();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleStandardAnswerChange(questionId, value) {
    setForm((prev) => ({
      ...prev,
      standard_answers: {
        ...prev.standard_answers,
        [questionId]: Number(value),
      },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedExperiment) return;

    const answers = form.standard_answers;

    const average = (ids) =>
      ids.reduce((sum, id) => sum + Number(answers[id] || 0), 0) / ids.length;

    const derivedClarity = average(["q1", "q2", "q3", "q8"]);
    const derivedComprehension = average(["q4", "q5", "q7"]);
    const derivedCognitiveLoad = 6 - average(["q6", "q9", "q10"]);

    await onEvaluate({
      experiment_id: selectedExperiment.id,
      clarity: Number(derivedClarity.toFixed(2)),
      comprehension: Number(derivedComprehension.toFixed(2)),
      cognitive_load: Number(derivedCognitiveLoad.toFixed(2)),
      preferred_variant: form.preferred_variant || null,
      comment: form.comment,
      standard_answers: form.standard_answers,
      custom_answers: customAnswers,
    });

    resetEvaluationForm();
    setSelectedExperimentId(null);
  }

  if (selectedExperiment) {
    return (
      <>
        <section className="card developer-subheader">
          <div className="developer-subheader-row">
            <div>
              <h2>{selectedExperiment.title}</h2>
              <p>{selectedExperiment.description || "Sin descripción"}</p>
              <p>
                <strong>Tipo:</strong> {selectedExperiment.type} ·{" "}
                <strong>Categoría:</strong>{" "}
                {selectedExperiment.category || "Sin categoría"}
              </p>
            </div>

            <button onClick={closeExperiment}>
              Volver a experimentos
            </button>
          </div>
        </section>

        <section className="card">
          <h3>
            {selectedExperiment.type === "ab"
              ? "Componentes a comparar"
              : "Componente a evaluar"}
          </h3>

          {selectedExperiment.type === "single" && (
            <iframe
              title={`user-preview-${selectedExperiment.id}`}
              className="preview-frame user-full-preview"
              sandbox="allow-forms allow-same-origin"
              srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
            />
          )}

          {selectedExperiment.type === "ab" && (
            <div className="ab-container user-ab-full">
              <div
                className={`ab-variant ${
                  form.preferred_variant === "A" ? "selected" : ""
                }`}
              >
                <h4>Variante A</h4>
                <iframe
                  title={`user-preview-a-${selectedExperiment.id}`}
                  className="preview-frame"
                  sandbox="allow-forms allow-same-origin"
                  srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
                />
              </div>

              <div
                className={`ab-variant ${
                  form.preferred_variant === "B" ? "selected" : ""
                }`}
              >
                <h4>Variante B</h4>
                <iframe
                  title={`user-preview-b-${selectedExperiment.id}`}
                  className="preview-frame"
                  sandbox="allow-forms allow-same-origin"
                  srcDoc={buildPreviewHtml(selectedExperiment.variant_b_html)}
                />
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <h3>Evaluar experimento</h3>

          <form onSubmit={handleSubmit} className="form">
            <div className="standard-questions-block">
              <h3>Evaluación estándar</h3>
              <p className="evaluation-help">
                Valora cada afirmación del 1 al 5, donde 1 significa “muy en desacuerdo”
                y 5 significa “muy de acuerdo”.
              </p>

              {selectedExperiment.type === "ab" && (
                <div className="standard-question-card">
                  <p className="standard-question-text">
                    ¿Qué variante prefieres?
                  </p>

                  <div className="ab-choice-inline">
                    <label className="likert-option">
                      <input
                        type="radio"
                        name="preferred_variant"
                        value="A"
                        checked={form.preferred_variant === "A"}
                        onChange={handleChange}
                      />
                      <span>Variante A</span>
                    </label>

                    <label className="likert-option">
                      <input
                        type="radio"
                        name="preferred_variant"
                        value="B"
                        checked={form.preferred_variant === "B"}
                        onChange={handleChange}
                      />
                      <span>Variante B</span>
                    </label>
                  </div>
                </div>
              )}

              {standardQuestions.map((question) => (
                <div key={question.id} className="standard-question-card">
                  <p className="standard-question-text">{question.text}</p>

                  <div className="likert-row">
                    <span className="likert-end-label">Muy en desacuerdo</span>

                    <div className="likert-scale">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <label key={value} className="likert-option">
                          <input
                            type="radio"
                            name={question.id}
                            value={value}
                            checked={form.standard_answers[question.id] === value}
                            onChange={() =>
                              handleStandardAnswerChange(question.id, value)
                            }
                          />
                          <span>{value}</span>
                        </label>
                      ))}
                    </div>

                    <span className="likert-end-label">Muy de acuerdo</span>
                  </div>
                </div>
              ))}
            </div>

            <textarea
              name="comment"
              placeholder="Comentario opcional"
              value={form.comment}
              onChange={handleChange}
            />

            {customQuestions.length > 0 && (
              <div className="custom-answers-block">
                <h3>Preguntas específicas del experimento</h3>

                {customQuestions.map((question, index) => (
                  <label key={index}>
                    {question}
                    <textarea
                      placeholder="Escribe tu respuesta..."
                      value={customAnswers[question] || ""}
                      onChange={(e) =>
                        setCustomAnswers((prev) => ({
                          ...prev,
                          [question]: e.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            )}

            <button type="submit">Enviar evaluación</button>
          </form>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="card">
        <h2>Elige qué quieres evaluar</h2>
        <p className="category-intro">
          Selecciona una categoría para ver los experimentos publicados.
        </p>

        <div className="category-card-grid">
          {categories.map((category) => (
            <div
              key={category.value}
              className={`category-card ${
                selectedCategory === category.value ? "active-category-card" : ""
              }`}
              onClick={() => {
                setSelectedCategory(category.value);
                setSelectedExperimentId(null);
              }}
            >
              <h3>{category.label}</h3>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        {selectedCategory === "" ? (
          <p>Selecciona una categoría para empezar.</p>
        ) : filteredExperiments.length === 0 ? (
          <p>No hay experimentos publicados en esta categoría.</p>
        ) : (
          <div className="experiment-list">
            {filteredExperiments.map((experiment) => (
              <div
                key={experiment.id}
                className="experiment-item selectable"
                onClick={() => openExperiment(experiment.id)}
              >
                <div className="experiment-card-header">
                  <div>
                    <h3>{experiment.title}</h3>
                    <p>{experiment.description || "Sin descripción"}</p>
                  </div>
                </div>

                <div className="experiment-card-meta">
                  <p><strong>Tipo:</strong> {experiment.type}</p>
                  <p><strong>Categoría:</strong> {experiment.category || "Sin categoría"}</p>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openExperiment(experiment.id);
                  }}
                >
                  Evaluar experimento
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default UserView;