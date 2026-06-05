import { useState } from "react";
import { useTranslation } from "react-i18next";
import ExperimentPreview from "./ExperimentPreview";
import EvaluationForm from "./EvaluationForm";
import ConfirmModal from "./ConfirmModal";

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

function UserView({
  experiments,
  onEvaluate,
  evaluatedExperimentIds = [],
  myEvaluations = [],
}) {
  const { t } = useTranslation();
  const [selectedExperimentId, setSelectedExperimentId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [customAnswers, setCustomAnswers] = useState({});
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [form, setForm] = useState(initialForm);

  const selectedExperiment = experiments.find(
    (experiment) => experiment.id === selectedExperimentId
  );

  const customQuestions = selectedExperiment
    ? safeParseArray(selectedExperiment.approved_custom_questions)
    : [];

  const categories = [
    { value: "form", label: t("common.categories.form") },
    { value: "login", label: t("common.categories.login") },
    { value: "text", label: t("common.categories.text") },
    { value: "button", label: t("common.categories.button") },
    { value: "navigation", label: t("common.categories.navigation") },
    { value: "other", label: t("common.categories.other") },
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
      alert(t("userView.missingVariantAlert"));
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
              <p className="experiment-long-description">
                {selectedExperiment.description || t("common.noDetailedDescription")}
              </p>

              {selectedExperiment.instructions && (
                <div className="experiment-instructions">
                  <h3>{t("common.instructions")}</h3>
                  <p>{selectedExperiment.instructions}</p>
                </div>
              )}

              <p>
                <strong>{t("common.type")}:</strong>{" "}
                {t(`common.experimentTypes.${selectedExperiment.type}`)} ·{" "}
                <strong>{t("common.category")}:</strong>{" "}
                {selectedExperiment.category
                  ? t(`common.categories.${selectedExperiment.category}`)
                  : t("common.noCategory")}
              </p>
            </div>

            <button onClick={closeExperiment}>
              {t("userView.backToExperiments")}
            </button>
          </div>
        </section>

        <section className="card">
          <h3>
            {selectedExperiment.type === "ab"
              ? t("userView.compareComponents")
              : t("userView.evaluateComponent")}
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
          <ConfirmModal
            title={t("userView.confirmSubmitTitle")}
            message={t("userView.confirmSubmitMessage")}
            confirmLabel={t("userView.confirmSubmitLabel")}
            onCancel={() => setShowConfirmSubmit(false)}
            onConfirm={confirmSubmitEvaluation}
          />
        )}
      </>
    );
  }

  return (
    <>
      <section className="card">
        <h2>{t("userView.myEvaluations")}</h2>

        {myEvaluations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📝</div>

            <h3>{t("userView.noEvaluationsTitle")}</h3>

            <p>
              {t("userView.noEvaluationsBody")}
            </p>
          </div>
        ) : (
          <div className="experiment-list">
            {myEvaluations.map((evaluation) => (
              <div
                key={evaluation.id}
                className="experiment-item"
              >
                <div className="experiment-card-header">
                  <div>
                    <h3>{evaluation.experiment_title}</h3>

                    <p>
                      {t("common.category")}:{" "}
                      {evaluation.category
                        ? t(`common.categories.${evaluation.category}`)
                        : t("common.noCategory")}
                    </p>
                  </div>

                  <span className="status-badge status-approved">
                    {t("common.evaluated")}
                  </span>
                </div>

                <p>
                  <strong>{t("common.type")}:</strong>{" "}
                  {evaluation.experiment_type === "ab"
                    ? t("common.experimentTypes.ab")
                    : t("common.experimentTypes.single")}
                </p>

                {evaluation.preferred_variant && (
                  <p>
                    <strong>{t("userView.preferredVariant")}:</strong>{" "}
                    {evaluation.preferred_variant}
                  </p>
                )}

                {evaluation.comment && (
                  <p>
                    <strong>{t("common.comment")}:</strong>{" "}
                    {evaluation.comment}
                  </p>
                )}

                <p>
                  <strong>{t("common.date")}:</strong>{" "}
                  {new Date(
                    evaluation.created_at
                  ).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t("userView.chooseTitle")}</h2>
        <p className="category-intro">
          {t("userView.chooseBody")}
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
            <h3>{t("userView.selectCategoryTitle")}</h3>
            <p>
              {t("userView.selectCategoryBody")}
            </p>
          </div>
        ) : filteredExperiments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">∅</div>
            <h3>{t("userView.noPublishedTitle")}</h3>
            <p>
              {t("userView.noPublishedBody")}
            </p>
          </div>
        ) : (
          <div className="experiment-list">
            {filteredExperiments.map((experiment) => {
              const alreadyEvaluated = evaluatedExperimentIds.includes(
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
                      <p>{experiment.short_description || t("common.noDescription")}</p>
                    </div>

                    {alreadyEvaluated && (
                      <span className="status-badge status-approved">
                        {t("common.evaluated")}
                      </span>
                    )}
                  </div>

                  <div className="experiment-card-meta">
                    <p>
                      <strong>{t("common.type")}:</strong>{" "}
                      {t(`common.experimentTypes.${experiment.type}`)}
                    </p>
                    <p>
                      <strong>{t("common.category")}:</strong>{" "}
                      {experiment.category
                        ? t(`common.categories.${experiment.category}`)
                        : t("common.noCategory")}
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
                      ? t("userView.evaluationSent")
                      : t("userView.evaluateExperiment")}
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
