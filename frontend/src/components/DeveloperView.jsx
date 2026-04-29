import { useState } from "react";
import { getExperimentResults } from "../api";

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

function DeveloperView({ experiments, onCreate }) {
  const [results, setResults] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
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
  const [openResults, setOpenResults] = useState({});

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

      setOpenResults((prev) => ({
        ...prev,
        [id]: true,
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResults((prev) => ({ ...prev, [id]: false }));
    }
  }

  function toggleResults(id) {
    setOpenResults((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function exportResultsToCSV(experimentId) {
    const experimentResults = results[experimentId];
    const experiment = experiments.find((e) => e.id === experimentId);

    if (!experimentResults || !experimentResults.evaluations) return;

    const customQuestionList = safeParseArray(experiment?.custom_questions);

    const headers = [
      "id",
      "preferred_variant",
      "comment",
      ...standardQuestions.map((question) => `${question.id}: ${question.text}`),
      ...customQuestionList.map((question, index) => `custom_${index + 1}: ${question}`),
    ];

    const rows = experimentResults.evaluations.map((evaluation) => {
      const standardAnswers = safeParseObject(evaluation.standard_answers);
      const customAnswers = safeParseObject(evaluation.custom_answers);

      return [
        evaluation.id,
        evaluation.preferred_variant || "",
        evaluation.comment || "",
        ...standardQuestions.map((question) => standardAnswers[question.id] || ""),
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

    if (!experimentResults || !experimentResults.evaluations) return;

    const evaluations = experimentResults.evaluations;

    function averageForQuestion(items, questionId) {
      const values = items
        .map((evaluation) => safeParseObject(evaluation.standard_answers)[questionId])
        .filter((value) => value !== undefined && value !== null && value !== "")
        .map(Number);

      if (values.length === 0) return "0.00";

      return (
        values.reduce((sum, value) => sum + value, 0) / values.length
      ).toFixed(2);
    }

    let csvContent = "";

    if (experiment?.type === "ab") {
      const evalA = evaluations.filter((e) => e.preferred_variant === "A");
      const evalB = evaluations.filter((e) => e.preferred_variant === "B");

      const headers = [
        "variant",
        "count",
        ...standardQuestions.map((question) => `avg_${question.id}`),
      ];

      const rows = [
        [
          "A",
          evalA.length,
          ...standardQuestions.map((question) => averageForQuestion(evalA, question.id)),
        ],
        [
          "B",
          evalB.length,
          ...standardQuestions.map((question) => averageForQuestion(evalB, question.id)),
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
        ...standardQuestions.map((question) => `avg_${question.id}`),
      ];

      const row = [
        "all",
        evaluations.length,
        ...standardQuestions.map((question) => averageForQuestion(evaluations, question.id)),
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
      lowered.includes("<script") ||
      lowered.includes("onclick=") ||
      lowered.includes("onerror=") ||
      lowered.includes("onload=") ||
      lowered.includes("onmouseover=")
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setValidationError("");

    try {
      const unsafeA = containsUnsafeHtml(form.variant_a_html);
      const unsafeB =
        form.type === "ab" ? containsUnsafeHtml(form.variant_b_html) : false;

      if (unsafeA || unsafeB) {
        setValidationError(
          "El HTML contiene etiquetas o atributos no permitidos (por ejemplo <script> u onClick)."
        );
        return;
      }

      await onCreate({
        title: form.title,
        description: form.description,
        type: form.type,
        category: form.category,
        created_by: "Maria",
        status: "pending",
        variant_a_html: form.variant_a_html,
        variant_b_html: form.type === "ab" ? form.variant_b_html : "",
        custom_questions: customQuestions,
      });

      setForm({
        title: "",
        description: "",
        type: "single",
        category: "form",
        variant_a_html: "",
        variant_b_html: "",
      });
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
    if (value >= 4) return "#22c55e"; // verde
    if (value >= 3) return "#eab308"; // amarillo
    return "#ef4444"; // rojo
  }

  return (
    <>
      {activeTab !== "" && (
        <section className="card developer-stats">
          <div className="developer-stats-grid">
            <div className="developer-stat-card approved">
              <h3>{approvedCount}</h3>
              <p>Aprobados</p>
            </div>

            <div className="developer-stat-card pending">
              <h3>{pendingCount}</h3>
              <p>Pendientes</p>
            </div>

            <div className="developer-stat-card rejected">
              <h3>{rejectedCount}</h3>
              <p>Rechazados</p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "" && (
        <section className="card developer-home">
          <h2>Panel de desarrollador</h2>
          <p className="developer-home-subtitle">
            Selecciona la acción que quieres realizar dentro del sandbox.
          </p>

          <div className="developer-menu-cards">
            <div
              className="developer-menu-card"
              onClick={() => setActiveTab("create")}
            >
              <h3>Crear nuevo experimento</h3>
              <p>
                Define un nuevo experimento, configura sus variantes y envíalo a
                moderación.
              </p>
            </div>

            <div
              className="developer-menu-card"
              onClick={() => setActiveTab("list")}
            >
              <h3>Mis experimentos</h3>
              <p>
                Consulta el estado de tus experimentos y analiza sus resultados.
              </p>
            </div>
          </div>
        </section>
      )}

      {activeTab === "create" && (
        <>
          <section className="card developer-subheader">
            <div className="developer-subheader-row">
              <div>
                <h2>Crear experimento</h2>
                <p>Configura un nuevo experimento para enviarlo a moderación.</p>
              </div>
              <button onClick={() => setActiveTab("")}>Volver al panel</button>
            </div>
          </section>

          <section className="card">
            <form onSubmit={handleSubmit} className="form">
              <input
                name="title"
                placeholder="Título"
                value={form.title}
                onChange={handleChange}
                required
              />

              <textarea
                name="description"
                placeholder="Descripción"
                value={form.description}
                onChange={handleChange}
              />

              <select name="type" value={form.type} onChange={handleChange}>
                <option value="single">Single</option>
                <option value="ab">A/B</option>
              </select>

              <select name="category" value={form.category} onChange={handleChange}>
                <option value="form">Formulario</option>
                <option value="login">Pantallas de acceso</option>
                <option value="text">Texto</option>
                <option value="button">Botón / CTA</option>
                <option value="navigation">Navegación</option>
                <option value="other">Otro</option>
              </select>

              <textarea
                name="variant_a_html"
                placeholder="HTML variante A"
                value={form.variant_a_html}
                onChange={handleChange}
                required
              />

              {form.type === "ab" && (
                <textarea
                  name="variant_b_html"
                  placeholder="HTML variante B"
                  value={form.variant_b_html}
                  onChange={handleChange}
                  required
                />
              )}

              <div className="custom-questions-block">
                <h3>Preguntas personalizadas (máx. 3)</h3>

                <div className="add-question-row">
                  <input
                    type="text"
                    placeholder="Escribe una pregunta..."
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    disabled={customQuestions.length >= 3}
                  />

                  <button
                    type="button"
                    onClick={() => {
                      if (!newQuestion.trim() || customQuestions.length >= 3) return;
                      setCustomQuestions((prev) => [...prev, newQuestion.trim()]);
                      setNewQuestion("");
                    }}
                    disabled={customQuestions.length >= 3}
                  >
                    Añadir
                  </button>
                </div>

                {customQuestions.length > 0 && (
                  <ul className="custom-questions-list">
                    {customQuestions.map((q, idx) => (
                      <li key={idx}>
                        {q}
                        <button
                          type="button"
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
                {loading ? "Guardando..." : "Crear experimento"}
              </button>
            </form>
          </section>
        </>
      )}

      {activeTab === "list" && (
        <>
          <section className="card developer-subheader">
            <div className="developer-subheader-row">
              <div>
                <h2>Mis experimentos</h2>
                <p>
                  Revisa el estado de tus experimentos y consulta los resultados
                  disponibles.
                </p>
              </div>
              <button onClick={() => setActiveTab("")}>Volver al panel</button>
            </div>
          </section>

          <section className="card">
            {experiments.length === 0 ? (
              <p>No hay experimentos todavía.</p>
            ) : (
              <div className="experiment-list">
                {experiments.map((experiment) => {
                  const experimentResults = results[experiment.id];
                  const evaluations = experimentResults?.evaluations || [];

                  let countA = 0;
                  let countB = 0;
                  let percentA = 0;
                  let percentB = 0;
                  const questionAverages = {};
                  const questionAveragesA = {};
                  const questionAveragesB = {};

                  if (evaluations.length > 0) {
                    countA = evaluations.filter((e) => e.preferred_variant === "A").length;
                    countB = evaluations.filter((e) => e.preferred_variant === "B").length;

                    const totalAB = countA + countB;
                    percentA = totalAB ? ((countA / totalAB) * 100).toFixed(1) : 0;
                    percentB = totalAB ? ((countB / totalAB) * 100).toFixed(1) : 0;

                    const averageQuestion = (items, questionId) => {
                      const values = items
                        .map((evaluation) => safeParseObject(evaluation.standard_answers)[questionId])
                        .filter((value) => value !== undefined && value !== null && value !== "")
                        .map(Number);

                      if (values.length === 0) return null;
                      return values.reduce((sum, value) => sum + value, 0) / values.length;
                    };

                    standardQuestions.forEach((question) => {
                      questionAverages[question.id] = averageQuestion(evaluations, question.id);
                      questionAveragesA[question.id] = averageQuestion(
                        evaluations.filter((e) => e.preferred_variant === "A"),
                        question.id
                      );
                      questionAveragesB[question.id] = averageQuestion(
                        evaluations.filter((e) => e.preferred_variant === "B"),
                        question.id
                      );
                    });
                  }

                  const sortedQuestions = [...standardQuestions].sort((a, b) => {
                    const valA = questionAverages[a.id] ?? 0;
                    const valB = questionAverages[b.id] ?? 0;
                    return valA - valB; // de menor a mayor (peor primero)
                  });

                  let recommendedVariant = null;
                  let recommendationReason = "";

                  if (countA > 0 || countB > 0) {
                    if (countA > countB) {
                      recommendedVariant = "A";
                      recommendationReason = "ha recibido más preferencias por parte de los usuarios.";
                    } else if (countB > countA) {
                      recommendedVariant = "B";
                      recommendationReason = "ha recibido más preferencias por parte de los usuarios.";
                    } else {
                      recommendedVariant = "Empate";
                      recommendationReason = "ambas variantes han recibido el mismo número de preferencias.";
                    }
                  }

                  return (
                    <div
                      key={experiment.id}
                      className={`experiment-item ${openResults[experiment.id] ? "expanded" : ""}`}
                    >
                      <h3>{experiment.title}</h3>
                      <p>{experiment.description || "Sin descripción"}</p>
                      <p><strong>Tipo:</strong> {experiment.type}</p>
                      <p><strong>Categoría:</strong> {experiment.category || "Sin categoría"}</p>
                      {experiment.custom_questions && (
                        <p>
                          <strong>Preguntas personalizadas:</strong>{" "}
                          {safeParseArray(experiment.custom_questions).length}
                        </p>
                      )}
                      <p>
                        <strong>Estado:</strong>{" "}
                        <span className={`status-badge status-${experiment.status}`}>
                          {experiment.status}
                        </span>
                      </p>
                      <p><strong>Autor:</strong> {experiment.created_by}</p>

                      <button
                        onClick={() => {
                          if (!results[experiment.id]) {
                            loadResults(experiment.id);
                          } else {
                            toggleResults(experiment.id);
                          }
                        }}
                      >
                        {loadingResults[experiment.id]
                          ? "Cargando..."
                          : !results[experiment.id]
                          ? "Ver resultados"
                          : openResults[experiment.id]
                          ? "Ocultar resultados"
                          : "Mostrar resultados"}
                      </button>

                      {experimentResults &&
                        openResults[experiment.id] &&
                        evaluations.length > 0 && (
                          <>
                            <button
                              className="export-btn"
                              onClick={() => exportResultsToCSV(experiment.id)}
                            >
                              Exportar CSV
                            </button>

                            <button
                              className="export-btn"
                              onClick={() => exportAggregatedResultsToCSV(experiment.id)}
                            >
                              Exportar resumen CSV
                            </button>
                          </>
                        )}

                      {experimentResults && (
                        <p><strong>{experimentResults.total}</strong> evaluaciones</p>
                      )}

                      {experimentResults && openResults[experiment.id] && (
                        <div className="results-box">
                          {experimentResults.total === 0 && (
                            <p>No hay evaluaciones todavía.</p>
                          )}

                          <p><strong>Total respuestas:</strong> {experimentResults.total}</p>

                          {evaluations.length > 0 && (
                            <div className="standard-results">
                              <p><strong>Resultados por pregunta estándar:</strong></p>

                              {sortedQuestions.map((question) => {
                                const value = questionAverages[question.id];
                                if (value === null || value === undefined) return null;

                                return (
                                  <div key={question.id} className="metric-block">
                                    <p>
                                      <strong>{question.text}</strong>{" "}
                                      {value.toFixed(2)} / 5
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

                          {(countA + countB) > 0 && (
                            <div className="ab-results">
                              <p><strong>Resultados A/B:</strong></p>
                              <p>Variante A: {countA} votos ({percentA}%)</p>
                              <p>Variante B: {countB} votos ({percentB}%)</p>

                              <div className="ab-bar">
                                <div
                                  className="ab-bar-a"
                                  style={{ width: `${percentA}%` }}
                                >
                                  {countA > 0 ? `${percentA}%` : ""}
                                </div>
                                <div
                                  className="ab-bar-b"
                                  style={{ width: `${percentB}%` }}
                                >
                                  {countB > 0 ? `${percentB}%` : ""}
                                </div>
                              </div>

                              <p>
                                <strong>
                                  Ganadora: {countA > countB ? "A" : countB > countA ? "B" : "Empate"}
                                </strong>
                              </p>
                            </div>
                          )}

                          {(countA > 0 || countB > 0) && (
                            <div className="ab-metrics">
                              <p><strong>Detalle por variante:</strong></p>

                              {countA > 0 && (
                                <div>
                                  <p><strong>Variante A</strong></p>
                                  {sortedQuestions.map((question) => {
                                    const value = questionAveragesA[question.id];
                                    if (value === null || value === undefined) return null;
                                    return (
                                      <p key={question.id}>{question.id.toUpperCase()}: {value.toFixed(2)}</p>
                                    );
                                  })}
                                </div>
                              )}

                              {countB > 0 && (
                                <div>
                                  <p><strong>Variante B</strong></p>
                                  {sortedQuestions.map((question) => {
                                    const value = questionAveragesB[question.id];
                                    if (value === null || value === undefined) return null;
                                    return (
                                      <p key={question.id}>{question.id.toUpperCase()}: {value.toFixed(2)}</p>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {recommendedVariant && (
                            <div className="recommendation-box">
                              <p><strong>Conclusión automática:</strong></p>
                              <p>
                                <strong>Variante recomendada:</strong>{" "}
                                {recommendedVariant}
                              </p>
                              <p>{recommendationReason}</p>
                            </div>
                          )}

                          {evaluations.some((e) => e.comment && e.comment.trim() !== "") && (
                            <div className="comments-box">
                              <p><strong>Comentarios de usuarios:</strong></p>
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
                            <div className="comments-box">
                              <p><strong>Respuestas a preguntas personalizadas:</strong></p>
                              {evaluations.map((evaluation, index) => {
                                const customAnswers = safeParseObject(evaluation.custom_answers);
                                const entries = Object.entries(customAnswers);
                                if (entries.length === 0) return null;

                                return (
                                  <div key={index} className="custom-answer-item">
                                    <p><strong>Evaluación {index + 1}</strong></p>
                                    {entries.map(([question, answer]) => (
                                      <p key={question}>
                                        <strong>{question}</strong><br />
                                        {answer || "Sin respuesta"}
                                      </p>
                                    ))}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

export default DeveloperView;

