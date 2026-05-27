import { useState } from "react";
import ExperimentPreview from "./ExperimentPreview";
import EvaluationForm from "./EvaluationForm";

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
  const [submittedExperimentIds, setSubmittedExperimentIds] = useState([]);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
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

  function handleExperimentKeyDown(event, experimentId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openExperiment(experimentId);
    }
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

    if (selectedExperiment.type === "ab" && !form.preferred_variant) {
      alert("Debes seleccionar qué variante prefieres antes de enviar la evaluación.");
      return;
    }

    setShowConfirmSubmit(true);

    const answers = form.standard_answers;

    const average = (ids) =>
      ids.reduce((sum, id) => sum + Number(answers[id] || 0), 0) / ids.length;

    const derivedClarity = average(["q1", "q2", "q3", "q8"]);
    const derivedComprehension = average(["q4", "q5", "q7"]);
    const derivedCognitiveLoad = 6 - average(["q6", "q9", "q10"]);
  }

  async function confirmSubmitEvaluation() {
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

    setSubmittedExperimentIds((prev) => [
      ...prev,
      selectedExperiment.id,
    ]);

    setShowConfirmSubmit(false);
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

          <ExperimentPreview
            experiment={selectedExperiment}
            selectedVariant={form.preferred_variant}
            variantClassName="user-ab-full"
            fullWidth
          />
        </section>

        <EvaluationForm
          experiment={selectedExperiment}
          form={form}
          customQuestions={customQuestions}
          customAnswers={customAnswers}
          onSubmit={handleSubmit}
          onChange={handleChange}
          onStandardAnswerChange={handleStandardAnswerChange}
          onCustomAnswersChange={(question, value) =>
            setCustomAnswers((prev) => ({
              ...prev,
              [question]: value,
            }))
          }
        />

        
        {showConfirmSubmit && (
          <div className="modal-backdrop">
            <div className="modal-card">
              <h3>Confirmar envío</h3>
              <p>
                Vas a enviar tu evaluación. Una vez enviada, el experimento quedará
                marcado como evaluado en esta sesión.
              </p>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowConfirmSubmit(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmSubmitEvaluation}
                >
                  Confirmar envío
                </button>
              </div>
            </div>
          </div>
        )}
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
            <button
              type="button"
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
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        {selectedCategory === "" ? (
          <div className="empty-state">
            <div className="empty-state-icon">⌕</div>
            <h3>Selecciona una categoría</h3>
            <p>
              Elige una categoría para ver los experimentos disponibles y comenzar una evaluación.
            </p>
          </div>
        ) : filteredExperiments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">∅</div>
            <h3>No hay experimentos publicados</h3>
            <p>
              Todavía no hay experimentos disponibles en esta categoría. Prueba con otra categoría o vuelve más tarde.
            </p>
          </div>
        ) : (
          <div className="experiment-list">
            {filteredExperiments.map((experiment) => {
              const alreadyEvaluated = submittedExperimentIds.includes(
                experiment.id
              );

              return (
                <div
                  key={experiment.id}
                  className={`experiment-item selectable ${
                    alreadyEvaluated ? "already-evaluated" : ""
                  }`}
                  onClick={() => {
                    if (alreadyEvaluated) return;
                    openExperiment(experiment.id);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (alreadyEvaluated) return;
                    handleExperimentKeyDown(event, experiment.id);
                  }}
                >
                  <div className="experiment-card-header">
                    <div>
                      <h3>{experiment.title}</h3>
                      <p>{experiment.description || "Sin descripción"}</p>
                    </div>

                    {alreadyEvaluated && (
                      <span className="status-badge status-approved">
                        Evaluado
                      </span>
                    )}
                  </div>

                  <div className="experiment-card-meta">
                    <p><strong>Tipo:</strong> {experiment.type}</p>
                    <p>
                      <strong>Categoría:</strong>{" "}
                      {experiment.category || "Sin categoría"}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={alreadyEvaluated}
                    onClick={(event) => {
                      event.stopPropagation();

                      if (alreadyEvaluated) return;

                      openExperiment(experiment.id);
                    }}
                  >
                    {alreadyEvaluated
                      ? "Evaluación enviada"
                      : "Evaluar experimento"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default UserView;