import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getExperimentResults } from "../api";
import { buildPreviewHtml } from "../utils/previewHtml";
import {
  abStandardQuestions,
  getABAnswerKey,
  getQuestionLabel,
  singleStandardQuestions,
} from "../utils/evaluationQuestions";
import ConfirmModal from "./ConfirmModal";

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

function safeParseObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    return {};
  }
}

function escapeCSV(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function DeveloperView({
  experiments,
  currentUser,
  onCreate,
  onUpdateExperiment,
  onArchiveExperiment,
}) {
  const { t } = useTranslation();
  const [results, setResults] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    short_description: "",
    instructions: "",
    type: "single",
    category: "form",
    variant_a_html: "",
    variant_b_html: "",
  });

  const [customQuestions, setCustomQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState({});
  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [showConfirmCreate, setShowConfirmCreate] = useState(false);
  const [editingExperiment, setEditingExperiment] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function loadResults(id) {
    try {
      setLoadingResults((prev) => ({ ...prev, [id]: true }));
      const data = await getExperimentResults(id);

      setResults((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResults((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function openExperimentDetail(experiment) {
    setSelectedExperiment(experiment);

    if (!results[experiment.id]) {
      await loadResults(experiment.id);
    }
  }

  function getComputedResults(experiment) {
    const experimentResults = results[experiment.id];
    const evaluations = experimentResults?.evaluations || [];
    const isABExperiment = experiment.type === "ab";
    const questionsForResults = isABExperiment
      ? abStandardQuestions
      : singleStandardQuestions;

    let countA = 0;
    let countB = 0;
    let percentA = 0;
    let percentB = 0;

    const questionAverages = {};
    const questionAveragesA = {};
    const questionAveragesB = {};

    const averageQuestion = (items, questionId, variant = null) => {
      const values = items
        .map((evaluation) => {
          const answers = safeParseObject(evaluation.standard_answers);
          const answerKey = variant
            ? getABAnswerKey(variant, questionId)
            : questionId;

          return answers[answerKey];
        })
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map(Number);

      if (values.length === 0) return null;

      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    if (evaluations.length > 0) {
      countA = evaluations.filter((e) => e.preferred_variant === "A").length;
      countB = evaluations.filter((e) => e.preferred_variant === "B").length;

      const totalAB = countA + countB;
      percentA = totalAB ? ((countA / totalAB) * 100).toFixed(1) : 0;
      percentB = totalAB ? ((countB / totalAB) * 100).toFixed(1) : 0;

      questionsForResults.forEach((question) => {
        if (isABExperiment) {
          const averageA = averageQuestion(evaluations, question.id, "A");
          const averageB = averageQuestion(evaluations, question.id, "B");

          questionAveragesA[question.id] = averageA;
          questionAveragesB[question.id] = averageB;

          const combinedValues = [averageA, averageB].filter(
            (value) => value !== null && value !== undefined
          );

          questionAverages[question.id] = combinedValues.length
            ? combinedValues.reduce((sum, value) => sum + value, 0) /
              combinedValues.length
            : null;
        } else {
          questionAverages[question.id] = averageQuestion(
            evaluations,
            question.id
          );
        }
      });
    }

    const averageFromObject = (averages) => {
      const values = Object.values(averages).filter(
        (value) => value !== null && value !== undefined
      );

      if (values.length === 0) return null;

      return values.reduce((sum, value) => sum + value, 0) / values.length;
    };

    const globalAverage = averageFromObject(questionAverages);
    const globalAverageA = averageFromObject(questionAveragesA);
    const globalAverageB = averageFromObject(questionAveragesB);

    const sortedQuestions =
      evaluations.length > 0
        ? [...questionsForResults].sort((a, b) => {
            const valA = questionAverages[a.id] ?? 0;
            const valB = questionAverages[b.id] ?? 0;
            return valA - valB;
          })
        : [];

    const worstQuestion = sortedQuestions.length > 0 ? sortedQuestions[0] : null;
    const worstValue = worstQuestion ? questionAverages[worstQuestion.id] : null;

    const bestQuestion =
      sortedQuestions.length > 0
        ? sortedQuestions[sortedQuestions.length - 1]
        : null;
    const bestValue = bestQuestion ? questionAverages[bestQuestion.id] : null;

    const resultQuestionLabel = (question) => {
      if (experiment.type === "ab") {
        return t(`evaluation.abQuestions.${question.id}`, {
          variant: t("common.experimentTypes.ab"),
        });
      }

      return getQuestionLabel(t, experiment.type, question.id);
    };

    function generateRecommendation() {
      if (!experimentResults || experimentResults.total === 0) return null;
      if (!worstQuestion || worstValue === null || worstValue === undefined) {
        return null;
      }

      if (worstValue < 3) {
        return t("developerView.recommendation.priority", {
          question: resultQuestionLabel(worstQuestion),
          score: worstValue.toFixed(2),
        });
      }

      if (globalAverage !== null && globalAverage >= 4) {
        return t("developerView.recommendation.highScore");
      }

      return t("developerView.recommendation.improve", {
        question: resultQuestionLabel(worstQuestion),
      });
    }

    let recommendedVariant = null;
    let recommendationReason = "";

    if (isABExperiment && (globalAverageA !== null || globalAverageB !== null)) {
      if ((globalAverageA ?? 0) > (globalAverageB ?? 0)) {
        recommendedVariant = "A";
        recommendationReason = t("developerView.recommendation.betterAverage");
      } else if ((globalAverageB ?? 0) > (globalAverageA ?? 0)) {
        recommendedVariant = "B";
        recommendationReason = t("developerView.recommendation.betterAverage");
      } else if (countA > countB) {
        recommendedVariant = "A";
        recommendationReason = t("developerView.recommendation.morePreferences");
      } else if (countB > countA) {
        recommendedVariant = "B";
        recommendationReason = t("developerView.recommendation.morePreferences");
      } else {
        recommendedVariant = t("common.tie");
        recommendationReason = t("developerView.recommendation.equalPreferences");
      }
    } else if (countA > 0 || countB > 0) {
      if (countA > countB) {
        recommendedVariant = "A";
        recommendationReason = t("developerView.recommendation.morePreferences");
      } else if (countB > countA) {
        recommendedVariant = "B";
        recommendationReason = t("developerView.recommendation.morePreferences");
      } else {
        recommendedVariant = t("common.tie");
        recommendationReason = t("developerView.recommendation.equalPreferences");
      }
    }

    return {
      experimentResults,
      evaluations,
      countA,
      countB,
      percentA,
      percentB,
      questionAverages,
      questionAveragesA,
      questionAveragesB,
      globalAverage,
      globalAverageA,
      globalAverageB,
      sortedQuestions,
      questionsForResults,
      worstQuestion,
      worstValue,
      bestQuestion,
      bestValue,
      recommendedVariant,
      recommendationReason,
      generateRecommendation,
    };
  }

  function exportResultsToCSV(experimentId) {
    const experimentResults = results[experimentId];
    const experiment = experiments.find((e) => e.id === experimentId);

    if (!experimentResults || !experimentResults.evaluations || !experiment) return;

    const isABExperiment = experiment.type === "ab";
    const customQuestionList = safeParseArray(experiment.custom_questions);
    const questionsForExport = isABExperiment
      ? abStandardQuestions
      : singleStandardQuestions;

    const standardHeaders = isABExperiment
      ? ["A", "B"].flatMap((variant) =>
          questionsForExport.map((question) => {
            const answerKey = getABAnswerKey(variant, question.id);
            return `${answerKey}: ${getQuestionLabel(
              t,
              "ab",
              question.id,
              variant
            )}`;
          })
        )
      : questionsForExport.map(
          (question) =>
            `${question.id}: ${getQuestionLabel(t, "single", question.id)}`
        );

    const headers = [
      "id",
      "preferred_variant",
      "comment",
      ...standardHeaders,
      ...customQuestionList.map((question, index) => `custom_${index + 1}: ${question}`),
    ];

    const rows = experimentResults.evaluations.map((evaluation) => {
      const standardAnswers = safeParseObject(evaluation.standard_answers);
      const customAnswers = safeParseObject(evaluation.custom_answers);

      const standardValues = isABExperiment
        ? ["A", "B"].flatMap((variant) =>
            questionsForExport.map((question) => {
              const answerKey = getABAnswerKey(variant, question.id);
              return standardAnswers[answerKey] || "";
            })
          )
        : questionsForExport.map(
            (question) => standardAnswers[question.id] || ""
          );

      return [
        evaluation.id,
        evaluation.preferred_variant || "",
        evaluation.comment || "",
        ...standardValues,
        ...customQuestionList.map((question) => customAnswers[question] || ""),
      ].map(escapeCSV);
    });

    const csvContent = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `experiment-${experimentId}-results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function exportAggregatedResultsToCSV(experimentId) {
    const experimentResults = results[experimentId];
    const experiment = experiments.find((e) => e.id === experimentId);

    if (!experimentResults || !experimentResults.evaluations || !experiment) return;

    const evaluations = experimentResults.evaluations;
    const isABExperiment = experiment.type === "ab";
    const questionsForExport = isABExperiment
      ? abStandardQuestions
      : singleStandardQuestions;

    function averageForQuestion(items, questionId, variant = null) {
      const values = items
        .map((evaluation) => {
          const answers = safeParseObject(evaluation.standard_answers);
          const answerKey = variant
            ? getABAnswerKey(variant, questionId)
            : questionId;

          return answers[answerKey];
        })
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map(Number);

      if (values.length === 0) return "0.00";

      return (
        values.reduce((sum, value) => sum + value, 0) / values.length
      ).toFixed(2);
    }

    let csvContent = "";

    if (isABExperiment) {
      const countA = evaluations.filter((e) => e.preferred_variant === "A").length;
      const countB = evaluations.filter((e) => e.preferred_variant === "B").length;

      const headers = [
        "variant",
        "evaluations",
        "preference_votes",
        ...questionsForExport.map((question) => `avg_${question.id}`),
      ];

      const rows = [
        [
          "A",
          evaluations.length,
          countA,
          ...questionsForExport.map((question) =>
            averageForQuestion(evaluations, question.id, "A")
          ),
        ],
        [
          "B",
          evaluations.length,
          countB,
          ...questionsForExport.map((question) =>
            averageForQuestion(evaluations, question.id, "B")
          ),
        ],
      ];

      csvContent = [
        headers.map(escapeCSV).join(","),
        ...rows.map((row) => row.map(escapeCSV).join(",")),
      ].join("\n");
    } else {
      const headers = [
        "group",
        "count",
        ...questionsForExport.map((question) => `avg_${question.id}`),
      ];

      const row = [
        "all",
        evaluations.length,
        ...questionsForExport.map((question) =>
          averageForQuestion(evaluations, question.id)
        ),
      ];

      csvContent = [
        headers.map(escapeCSV).join(","),
        row.map(escapeCSV).join(","),
      ].join("\n");
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `experiment-${experimentId}-aggregated-results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function containsUnsafeHtml(html) {
    if (!html) return false;

    const lowered = html.toLowerCase();

    return (
      lowered.includes("window.parent") ||
      lowered.includes("parent.") ||
      lowered.includes("window.top") ||
      lowered.includes("top.") ||
      lowered.includes("document.cookie") ||
      lowered.includes("localstorage") ||
      lowered.includes("sessionstorage") ||
      lowered.includes("fetch(") ||
      lowered.includes("xmlhttprequest") ||
      lowered.includes("eval(") ||
      lowered.includes("function(") ||
      lowered.includes("import(") ||
      lowered.includes("javascript:")
    );
  }

  function looksLikeHtml(value) {
    if (!value || typeof value !== "string") return false;

    return /<\/?[a-z][\s\S]*>/i.test(value.trim());
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError("");

    if (!form.title.trim()) {
      setValidationError(t("developerView.validation.titleRequired"));
      return;
    }

    if (!form.description.trim()) {
      setValidationError(t("developerView.validation.descriptionRequired"));
      return;
    }

    if (!form.variant_a_html.trim()) {
      setValidationError(t("developerView.validation.variantARequired"));
      return;
    }

    if (!looksLikeHtml(form.variant_a_html)) {
      setValidationError(
        t("developerView.validation.variantAInvalid")
      );
      return;
    }

    if (form.type === "ab" && !form.variant_b_html.trim()) {
      setValidationError(t("developerView.validation.variantBRequired"));
      return;
    }

    if (form.type === "ab" && !looksLikeHtml(form.variant_b_html)) {
      setValidationError(
        t("developerView.validation.variantBInvalid")
      );
      return;
    }

    const unsafeA = containsUnsafeHtml(form.variant_a_html);
    const unsafeB =
      form.type === "ab" ? containsUnsafeHtml(form.variant_b_html) : false;

    if (unsafeA || unsafeB) {
      setValidationError(
        t("developerView.validation.unsafeHtml")
      );
      return;
    }

    setShowConfirmCreate(true);

  }

  async function confirmCreateExperiment() {
    setLoading(true);

    try {
      const payload = {
        title: form.title,
        description: form.description,
        short_description: form.short_description,
        instructions: form.instructions,
        type: form.type,
        category: form.category,
        created_by: currentUser?.name || t("common.roles.developer"),
        created_by_id: currentUser?.id || null,
        status: "pending",
        variant_a_html: form.variant_a_html,
        variant_b_html: form.type === "ab" ? form.variant_b_html : "",
        custom_questions: customQuestions,
      };

      if (editingExperiment) {
        await onUpdateExperiment(editingExperiment.id, payload);
      } else {
        await onCreate(payload);
      }

      setShowConfirmCreate(false);

      setForm({
        title: "",
        description: "",
        short_description: "",
        instructions: "",
        type: "single",
        category: "form",
        variant_a_html: "",
        variant_b_html: "",
      });

      setEditingExperiment(null);
      setCustomQuestions([]);
      setNewQuestion("");
    } finally {
      setLoading(false);
    }
  }

  const approvedCount = experiments.filter(
    (experiment) => experiment.status === "approved"
  ).length;

  const pendingCount = experiments.filter(
    (experiment) => experiment.status === "pending"
  ).length;

  const rejectedCount = experiments.filter(
    (experiment) => experiment.status === "rejected"
  ).length;

  function getMetricColor(value) {
    if (value >= 4) return "#22c55e";
    if (value >= 3) return "#eab308";
    return "#ef4444";
  }

  function renderExperimentDetail() {
    if (!selectedExperiment) return null;

    const {
      experimentResults,
      evaluations,
      countA,
      countB,
      percentA,
      percentB,
      questionAverages,
      questionAveragesA,
      questionAveragesB,
      globalAverage,
      globalAverageA,
      globalAverageB,
      sortedQuestions,
      worstQuestion,
      worstValue,
      bestQuestion,
      bestValue,
      recommendedVariant,
      recommendationReason,
      generateRecommendation,
    } = getComputedResults(selectedExperiment);

    const questionLabel = (question, variant = null) => {
      if (selectedExperiment.type === "ab" && !variant) {
        return t(`evaluation.abQuestions.${question.id}`, {
          variant: t("common.experimentTypes.ab"),
        });
      }

      return getQuestionLabel(t, selectedExperiment.type, question.id, variant);
    };

    const approvedQuestions = safeParseArray(selectedExperiment.approved_custom_questions);

    return (
      <>
        <section className="card developer-subheader">
          <div className="developer-subheader-row">
            <div>
              <h2>{selectedExperiment.title}</h2>
              <p>{selectedExperiment.description || t("common.noDescription")}</p>
            </div>
            <button onClick={() => setSelectedExperiment(null)}>
              {t("developerView.backToMyExperiments")}
            </button>
          </div>
        </section>

        {selectedExperiment.status === "rejected" &&
          selectedExperiment.moderation_comment && (
            <section className="card moderation-feedback-box">
              <h4>{t("developerView.moderatorFeedback")}</h4>
              <p>{selectedExperiment.moderation_comment}</p>
            </section>
          )}

        <section className="developer-detail-grid">
          <div
            className={`card detail-block ${
              selectedExperiment.type === "ab" ? "detail-block-wide" : ""
            }`}
>
            <h3>{t("developerView.experimentInfo")}</h3>
            <p>
              <strong>{t("common.type")}:</strong>{" "}
              {t(`common.experimentTypes.${selectedExperiment.type}`)}
            </p>
            <p>
              <strong>{t("common.category")}:</strong>{" "}
              {selectedExperiment.category
                ? t(`common.categories.${selectedExperiment.category}`)
                : t("common.noCategory")}
            </p>
            <p>
              <strong>{t("common.status")}:</strong>{" "}
              <span className={`status-badge status-${selectedExperiment.status}`}>
                {t(`common.statuses.${selectedExperiment.status}`)}
              </span>
            </p>
            <p><strong>{t("common.author")}:</strong> {selectedExperiment.created_by}</p>

            {approvedQuestions.length > 0 && (
              <>
                <p><strong>{t("developerView.approvedQuestions")}:</strong></p>
                <ul className="approved-questions-list">
                  {approvedQuestions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div
            className={`card detail-block ${
              selectedExperiment.type === "ab" ? "detail-block-wide" : ""
            }`}
          >
            <h3>
              {selectedExperiment.type === "ab"
                ? t("developerView.comparedComponents")
                : t("developerView.evaluatedComponent")}
            </h3>

            {selectedExperiment.type === "single" && (
              <iframe
                title={`developer-detail-preview-${selectedExperiment.id}`}
                className="preview-frame"
                sandbox="allow-scripts allow-forms"
                srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
              />
            )}

            {selectedExperiment.type === "ab" && (
              <div className="ab-container">
                <div className="ab-variant">
                  <h4>{t("common.variantA")}</h4>
                  <iframe
                    title={`developer-detail-preview-a-${selectedExperiment.id}`}
                    className="preview-frame"
                    sandbox="allow-scripts allow-forms"
                    srcDoc={buildPreviewHtml(selectedExperiment.variant_a_html)}
                  />
                </div>

                <div className="ab-variant">
                  <h4>{t("common.variantB")}</h4>
                  <iframe
                    title={`developer-detail-preview-b-${selectedExperiment.id}`}
                    className="preview-frame"
                    sandbox="allow-scripts allow-forms"
                    srcDoc={buildPreviewHtml(selectedExperiment.variant_b_html)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="card detail-block detail-block-wide">
            <h3>{t("developerView.globalSummary")}</h3>

            {loadingResults[selectedExperiment.id] && <p>{t("common.loading")}</p>}

            {!loadingResults[selectedExperiment.id] && !experimentResults && (
              <p>{t("developerView.resultsNotLoaded")}</p>
            )}

            {experimentResults && (
              <> 
                {generateRecommendation() && (
                  <div className="insight-main">
                    <p><strong>{t("developerView.mainRecommendations")}</strong></p>
                    <p>{generateRecommendation()}</p>
                  </div>
                )}
                <div className="results-summary">
                  <div className="summary-item">
                    <span className="summary-label">{t("developerView.evaluations")}</span>
                    <span className="summary-value">{experimentResults.total}</span>
                  </div>

                  {globalAverage !== null && (
                    <div className="summary-item">
                      <span className="summary-label">{t("developerView.globalAverage")}</span>
                      <span className="summary-value">{globalAverage.toFixed(2)} / 5</span>
                    </div>
                  )}

                  {selectedExperiment.type === "ab" && (countA + countB) > 0 && (
                    <div className="summary-item">
                      <span className="summary-label">{t("developerView.preference")}</span>
                      <span className="summary-value">
                        {countA > countB
                          ? `A (${percentA}%)`
                          : countB > countA
                          ? `B (${percentB}%)`
                          : t("common.tie")}
                      </span>
                    </div>
                  )}
                </div>

                {experimentResults.total > 0 && (
                  <div className="detail-actions">
                    <button
                      type="button"
                      className="export-btn"
                      onClick={() => exportResultsToCSV(selectedExperiment.id)}
                    >
                      {t("developerView.exportDetailedCsv")}
                    </button>

                    <button
                      type="button"
                      className="export-btn"
                      onClick={() => exportAggregatedResultsToCSV(selectedExperiment.id)}
                    >
                      {t("developerView.exportAggregatedCsv")}
                    </button>
                  </div>
                )}

                {experimentResults.total === 0 && (
                 <div className="empty-state">
                  <div className="empty-state-icon">＋</div>
                  <h3>{t("developerView.noResultsTitle")}</h3>
                  <p>
                    {t("developerView.noResultsBody")}
                  </p>
                </div>
                )}

                {worstQuestion && worstValue !== null && (
                  <div className="worst-question-box">
                    <p><strong>{t("developerView.worstIssue")}:</strong></p>
                    <p className="insight-subtext">
                      {t("developerView.worstIssueHelp")}
                    </p>
                    <p>
                      {questionLabel(worstQuestion)} ({worstValue.toFixed(2)} / 5)
                    </p>
                  </div>
                )}

                {bestQuestion && bestValue !== null && (
                  <div className="best-question-box">
                    <p><strong>{t("developerView.bestPoint")}:</strong></p>
                    <p className="insight-subtext">
                      {t("developerView.bestPointHelp")}
                    </p>
                    <p>
                      {questionLabel(bestQuestion)} ({bestValue.toFixed(2)} / 5)
                    </p>
                  </div>
                )}

                <div className="card detail-block detail-block-wide">
                  <h3>
                    {selectedExperiment.type === "ab"
                      ? "Resultados por variante"
                      : t("developerView.standardResults")}
                  </h3>

                  {selectedExperiment.type === "ab" ? (
                    <div className="ab-metrics">
                      {globalAverageA !== null && (
                        <div>
                          <p>
                            <strong>
                              {t("common.variantA")} · {globalAverageA.toFixed(2)} / 5
                            </strong>
                          </p>

                          <div className="standard-results">
                            {sortedQuestions.map((question) => {
                              const value = questionAveragesA[question.id];
                              if (value === null || value === undefined) return null;

                              return (
                                <div key={`a-${question.id}`} className="metric-block">
                                  <p>
                                    <strong>
                                      {questionLabel(question, "A")} {value.toFixed(2)} / 5
                                    </strong>{" "}
                                  </p>

                                  <div className="metric-bar">
                                    <div
                                      className="metric-fill"
                                      style={{
                                        width: `${(value / 5) * 100}%`,
                                        backgroundColor: getMetricColor(value),
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {globalAverageB !== null && (
                        <div>
                          <p>
                            <strong>
                              {t("common.variantB")} · {globalAverageB.toFixed(2)} / 5
                            </strong>
                          </p>

                          <div className="standard-results">
                            {sortedQuestions.map((question) => {
                              const value = questionAveragesB[question.id];
                              if (value === null || value === undefined) return null;

                              return (
                                <div key={`b-${question.id}`} className="metric-block">
                                  <p>
                                    <strong>
                                      {questionLabel(question, "B")} {value.toFixed(2)} / 5
                                    </strong>{" "}
                                  </p>

                                  <div className="metric-bar">
                                    <div
                                      className="metric-fill"
                                      style={{
                                        width: `${(value / 5) * 100}%`,
                                        backgroundColor: getMetricColor(value),
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="standard-results single-standard-results">
                      {sortedQuestions.map((question) => {
                        const value = questionAverages[question.id];
                        if (value === null || value === undefined) return null;

                        return (
                          <div key={question.id} className="metric-block">
                            <p>
                              <strong>
                                {questionLabel(question)} {value.toFixed(2)} / 5
                              </strong>{" "}
                            </p>

                            <div className="metric-bar">
                              <div
                                className="metric-fill"
                                style={{
                                  width: `${(value / 5) * 100}%`,
                                  backgroundColor: getMetricColor(value),
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              {selectedExperiment.type === "ab" && (countA + countB) > 0 && (
                <div className="card detail-block detail-block-wide">
                  <h3>{t("developerView.abResults")}</h3>

                  <p>{t("common.variantA")}: {countA} {t("developerView.votes")} ({percentA}%)</p>
                  <p>{t("common.variantB")}: {countB} {t("developerView.votes")} ({percentB}%)</p>

                  <div className="ab-bar">
                    <div className="ab-bar-a" style={{ width: `${percentA}%` }}>
                      {countA > 0 ? `${percentA}%` : ""}
                    </div>
                    <div className="ab-bar-b" style={{ width: `${percentB}%` }}>
                      {countB > 0 ? `${percentB}%` : ""}
                    </div>
                  </div>

                  <p>
                    <strong>
                      {t("developerView.winner")}:{" "}
                      {countA > countB ? "A" : countB > countA ? "B" : t("common.tie")}
                    </strong>
                  </p>

                  {recommendedVariant && (
                    <div className="recommendation-box">
                      <p><strong>{t("developerView.automaticConclusion")}:</strong></p>
                      <p>
                        <strong>{t("developerView.recommendedVariant")}:</strong>{" "}
                        {recommendedVariant}
                      </p>
                      <p>{recommendationReason}</p>
                    </div>
                  )}
                </div>
              )}

              {evaluations.some((e) => e.comment && e.comment.trim() !== "") && (
                <div className="card detail-block detail-block-wide">
                  <h3>{t("developerView.userComments")}</h3>
                  <ul>
                    {evaluations
                      .filter((e) => e.comment && e.comment.trim() !== "")
                      .map((e, index) => (
                        <li key={index}>{e.comment}</li>
                      ))}
                  </ul>
                </div>
              )}

              {evaluations.some((e) => e.custom_answers) && (
                <div className="card detail-block detail-block-wide">
                  <h3>{t("developerView.customAnswers")}</h3>

                  {evaluations.map((evaluation, index) => {
                    const customAnswers = safeParseObject(evaluation.custom_answers);
                    const entries = Object.entries(customAnswers);
                    if (entries.length === 0) return null;

                    return (
                      <div key={index} className="custom-answer-item">
                        <p>
                          <strong>
                            {t("developerView.evaluationNumber", {
                              number: index + 1,
                            })}
                          </strong>
                        </p>
                        {entries.map(([question, answer]) => (
                          <p key={question}>
                            <strong>{question}</strong><br />
                            {answer || t("common.noAnswer")}
                          </p>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
        </section>
      </>
    );
  }

  return (
    <>
      {activeTab !== "" && (
        <section className="card developer-stats">
          <div className="developer-stats-grid">
            <div className="developer-stat-card approved">
              <h3>{approvedCount}</h3>
              <p>{t("developerView.stats.approved")}</p>
            </div>

            <div className="developer-stat-card pending">
              <h3>{pendingCount}</h3>
              <p>{t("developerView.stats.pending")}</p>
            </div>

            <div className="developer-stat-card rejected">
              <h3>{rejectedCount}</h3>
              <p>{t("developerView.stats.rejected")}</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "" && (
        <section className="card developer-home">
          <h2>{t("developerView.homeTitle")}</h2>
          <p className="developer-home-subtitle">
            {t("developerView.homeSubtitle")}
          </p>

          <div className="developer-menu-cards">
            <button
              type="button"
              className="developer-menu-card"
              onClick={() => setActiveTab("create")}
            >
              <h3>{t("developerView.createCardTitle")}</h3>
              <p>
                {t("developerView.createCardBody")}
              </p>
            </button>

            <button
              type="button"
              className="developer-menu-card"
              onClick={() => setActiveTab("list")}
            >
              <h3>{t("developerView.listCardTitle")}</h3>
              <p>
                {t("developerView.listCardBody")}
              </p>
            </button>
          </div>
        </section>
      )}

      {activeTab === "create" && (
        <>
          <section className="card developer-subheader">
            <div className="developer-subheader-row">
              <div>
                <h2>
                  {editingExperiment
                    ? t("developerView.editTitle")
                    : t("developerView.createTitle")}
                </h2>
                <p>{t("developerView.createSubtitle")}</p>
              </div>
              <button onClick={() => setActiveTab("")}>
                {t("developerView.backToPanel")}
              </button>
            </div>
          </section>

          <section className="card">
            <form onSubmit={handleSubmit} className="form">
              <label htmlFor="title">{t("developerView.title")}</label>
              <input
                id="title"
                name="title"
                placeholder={t("developerView.title")}
                value={form.title}
                onChange={handleChange}
                required
              />

              <label htmlFor="description">{t("developerView.description")}</label>
              <textarea
                id="description"
                name="description"
                placeholder={t("developerView.description")}
                value={form.description}
                onChange={handleChange}
              />

              <label htmlFor="short_description">
                {t("developerView.shortDescription")}
              </label>

              <textarea
                id="short_description"
                name="short_description"
                placeholder={t("developerView.shortDescriptionPlaceholder")}
                value={form.short_description}
                onChange={handleChange}
                maxLength={120}
              />

              <p className="field-help">
                {t("developerView.maxRecommended")}
              </p>

              <label htmlFor="instructions">
                {t("developerView.userInstructions")}
              </label>

              <textarea
                id="instructions"
                name="instructions"
                placeholder={t("developerView.instructionsPlaceholder")}
                value={form.instructions}
                onChange={handleChange}
              />

              <p className="field-help">
                {t("developerView.optionalInstructionsHelp")}
              </p>

              <label htmlFor="type">{t("common.type")}</label>
              <select id="type" name="type" value={form.type} onChange={handleChange}>
                <option value="single">{t("common.experimentTypes.single")}</option>
                <option value="ab">{t("common.experimentTypes.ab")}</option>
              </select>

              <label htmlFor="category">{t("common.category")}</label>
              <select id="category" name="category" value={form.category} onChange={handleChange}>
                <option value="form">{t("common.categories.form")}</option>
                <option value="login">{t("common.categories.login")}</option>
                <option value="text">{t("common.categories.text")}</option>
                <option value="button">{t("common.categories.button")}</option>
                <option value="navigation">{t("common.categories.navigation")}</option>
                <option value="other">{t("common.categories.other")}</option>
              </select>

              <label htmlFor="variant_a_html">{t("developerView.htmlVariantA")}</label>
              <div className="info-banner">
                <strong>{t("developerView.interactiveJsTitle")}</strong>
                <p>
                  {t("developerView.interactiveJsBody")}
                </p>
              </div>
              <textarea
                id="variant_a_html"
                name="variant_a_html"
                placeholder={t("developerView.htmlVariantA")}
                value={form.variant_a_html}
                onChange={handleChange}
                required
              />

              {form.variant_a_html.trim() && (
                <div className="developer-preview-block">
                  <h3>{t("developerView.previewA")}</h3>
                  <iframe
                    title="developer-preview-a"
                    className="preview-frame"
                    sandbox="allow-scripts allow-forms"
                    srcDoc={buildPreviewHtml(form.variant_a_html)}
                  />
                </div>
              )}

              {form.type === "ab" && (
                <>
                  <label htmlFor="variant_b_html">{t("developerView.htmlVariantB")}</label>
                  <textarea
                    id="variant_b_html"
                    name="variant_b_html"
                    placeholder={t("developerView.htmlVariantB")}
                    value={form.variant_b_html}
                    onChange={handleChange}
                    required
                  />

                  {form.variant_b_html.trim() && (
                    <div className="developer-preview-block">
                      <h3>{t("developerView.previewB")}</h3>
                      <iframe
                        title="developer-preview-b"
                        className="preview-frame"
                        sandbox="allow-scripts allow-forms"
                        srcDoc={buildPreviewHtml(form.variant_b_html)}
                      />
                    </div>
                  )}
                </>
              )}

              <div className="custom-questions-card">
                <div className="custom-questions-header">
                  <h3>{t("developerView.customQuestions")}</h3>
                  <span className="custom-questions-limit">
                    {customQuestions.length}/3
                  </span>
                </div>

                <p className="custom-questions-subtext">
                  {t("developerView.customQuestionsHelp")}
                </p>

                <label htmlFor="newQuestionInput">{t("developerView.addCustomQuestion")}</label>
                <div className="add-question-row">
                  <input
                    id="newQuestionInput"
                    type="text"
                    placeholder={t("developerView.customQuestionPlaceholder")}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    disabled={customQuestions.length >= 3}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      const question = newQuestion.trim();

                      if (!question) {
                        setValidationError(t("developerView.validation.emptyQuestion"));
                        return;
                      }

                      if (question.length < 10) {
                        setValidationError(t("developerView.validation.shortQuestion"));
                        return;
                      }

                      if (customQuestions.includes(question)) {
                        setValidationError(t("developerView.validation.duplicateQuestion"));
                        return;
                      }

                      if (customQuestions.length >= 3) {
                        setValidationError(t("developerView.validation.maxQuestions"));
                        return;
                      }

                      setCustomQuestions((prev) => [...prev, question]);
                      setNewQuestion("");
                      setValidationError("");
                    }}
                    disabled={customQuestions.length >= 3}
                  >
                    {t("developerView.add")}
                  </button>
                </div>

                {customQuestions.length > 0 && (
                  <ul className="custom-questions-list">
                    {customQuestions.map((q, idx) => (
                      <li key={idx} className="custom-question-item">
                        <span>{q}</span>

                        <button
                          type="button"
                          className="remove-question-btn"
                          aria-label={t("developerView.removeQuestion")}
                          onClick={() =>
                            setCustomQuestions((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {validationError && (
                <p className="validation-error">{validationError}</p>
              )}

              <button type="submit" disabled={loading}>
                {loading
                  ? t("developerView.saving")
                  : editingExperiment
                  ? t("developerView.resubmitExperiment")
                  : t("developerView.createExperiment")}
              </button>
            </form>
          </section>
        </>
      )}

      {activeTab === "list" && (
        <>
          {!selectedExperiment && (
            <>
              <section className="card developer-subheader">
                <div className="developer-subheader-row">
                  <div>
                    <h2>{t("developerView.listCardTitle")}</h2>
                    <p>
                      {t("developerView.listSubtitle")}
                    </p>
                  </div>
                  <button onClick={() => setActiveTab("")}>
                    {t("developerView.backToPanel")}
                  </button>
                </div>
              </section>

              <section className="card">
                {experiments.length === 0 ? (
                  <p>{t("developerView.noExperiments")}</p>
                ) : (
                  <div className="experiment-list">
                    {experiments.map((experiment) => {
                      const customQuestionsList = safeParseArray(experiment.custom_questions);
                      const approvedQuestionsList = safeParseArray(
                        experiment.approved_custom_questions
                      );

                      return (
                        <div key={experiment.id} className="experiment-item">
                          <div className="experiment-card-header">
                            <div>
                              <h3>{experiment.title}</h3>
                              <p>
                                {experiment.short_description || t("common.noShortDescription")}
                              </p>
                            </div>

                            <span className={`status-badge status-${experiment.status}`}>
                              {t(`common.statuses.${experiment.status}`)}
                            </span>
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
                            <p>
                              <strong>{t("developerView.proposedQuestions")}:</strong>{" "}
                              {customQuestionsList.length}
                            </p>
                            <p>
                              <strong>{t("developerView.approvedQuestions")}:</strong>{" "}
                              {approvedQuestionsList.length}
                            </p>
                          </div>

                          <div className="experiment-card-actions">
                            <button
                              onClick={() => openExperimentDetail(experiment)}
                              disabled={loadingResults[experiment.id]}
                            >
                              {loadingResults[experiment.id]
                                ? t("common.loading")
                                : t("developerView.viewResults")}
                            </button>

                            {experiment.status === "rejected" && (
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => {
                                  setEditingExperiment(experiment);
                                  setActiveTab("create");

                                  setForm({
                                    title: experiment.title || "",
                                    description: experiment.description || "",
                                    short_description: experiment.short_description || "",
                                    instructions: experiment.instructions || "",
                                    type: experiment.type || "single",
                                    category: experiment.category || "form",
                                    variant_a_html: experiment.variant_a_html || "",
                                    variant_b_html: experiment.variant_b_html || "",
                                  });

                                  setCustomQuestions(
                                    safeParseArray(experiment.custom_questions)
                                  );
                                }}
                              >
                                {t("developerView.correctAndResubmit")}
                              </button>
                            )}

                            {[
                              "draft",
                              "approved",
                              "pending",
                              "rejected",
                            ].includes(experiment.status) && (
                              <button
                                type="button"
                                className="reject-btn"
                                onClick={() => setArchiveTarget(experiment)}
                              >
                                {t("developerView.archive")}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {selectedExperiment && renderExperimentDetail()}
        </>
      )}
      {showConfirmCreate && (
        <ConfirmModal
          title={t("developerView.confirmCreateTitle")}
          message={t("developerView.confirmCreateMessage")}
          confirmLabel={loading ? t("developerView.sending") : t("developerView.confirmSend")}
          onCancel={() => setShowConfirmCreate(false)}
          onConfirm={confirmCreateExperiment}
        />
      )}

      {archiveTarget && (
          <ConfirmModal
            title={t("developerView.archiveTitle")}
            message={t("developerView.archiveMessage", {
              title: archiveTarget.title,
            })}
            confirmLabel={t("developerView.archive")}
            confirmClassName="reject-btn"
            onCancel={() => setArchiveTarget(null)}
            onConfirm={async () => {
              await onArchiveExperiment(archiveTarget.id);
              setArchiveTarget(null);
            }}
          />
        )}
    </>
  );
}

export default DeveloperView;
