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

function UserView({ experiments, onEvaluate }) {
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customAnswers, setCustomAnswers] = useState({});

  const [form, setForm] = useState({
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
  });

  const selectedExperiment = experiments.find(
    (experiment) => experiment.id === selectedExperimentId
  );

  const customQuestions = selectedExperiment?.approved_custom_questions
    ? JSON.parse(selectedExperiment.approved_custom_questions || "[]")
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

    setForm({
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
    });

    setCustomAnswers({});

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
                className={`experiment-item selectable ${
                  selectedExperimentId === experiment.id ? "selected" : ""
                }`}
                onClick={() => {
                  setSelectedExperimentId(experiment.id);
                  setCustomAnswers({});
                }}
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
            <h2>
              {selectedExperiment.type === "ab"
                ? "Comparación de variantes"
                : "Vista previa del componente"}
            </h2>

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
                <div
                  className={`ab-variant ${
                    form.preferred_variant === "A" ? "selected" : ""
                  }`}
                >
                  <h3>Variante A</h3>
                  <iframe
                    title="variant-a"
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
              <div className="standard-questions-block">
                <h3>Evaluación estándar</h3>
                <p className="evaluation-help">
                  Valora cada afirmación del 1 al 5, donde 1 significa “muy en desacuerdo”
                  y 5 significa “muy de acuerdo”.
                </p>

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
                              onChange={() => handleStandardAnswerChange(question.id, value)}
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
      )}
    </>
  );
}
export default UserView;