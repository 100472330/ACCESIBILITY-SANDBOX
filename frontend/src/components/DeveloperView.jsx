import { useState } from "react";
import { getExperimentResults } from "../api";

function DeveloperView({ experiments, onCreate }) {
  const [results, setResults] = useState({});
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "single",
    variant_a_html: "",
    variant_b_html: "",
  });
  const [loading, setLoading] = useState(false);
  const [loadingResults, setLoadingResults] = useState({});


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

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      await onCreate({
        title: form.title,
        description: form.description,
        type: form.type,
        created_by: "Maria",
        status: "pending",
        variant_a_html: form.variant_a_html,
        variant_b_html: form.type === "ab" ? form.variant_b_html : "",
      });

      setForm({
        title: "",
        description: "",
        type: "single",
        variant_a_html: "",
        variant_b_html: "",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="card">
        <h2>Crear experimento</h2>
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

          <button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Crear experimento"}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Mis experimentos</h2>
        {experiments.length === 0 ? (
          <p>No hay experimentos todavía.</p>
        ) : (
          <div className="experiment-list">
            {experiments.map((experiment) => {
              const experimentResults = results[experiment.id];

              let countA = 0;
              let countB = 0;
              let percentA = 0;
              let percentB = 0;
              

              let avgA = { clarity: 0, comprehension: 0, cognitive_load: 0 };
              let avgB = { clarity: 0, comprehension: 0, cognitive_load: 0 };

              if (experimentResults && experimentResults.evaluations) {
                const evaluations = experimentResults.evaluations;
                
                countA = evaluations.filter((e) => e.preferred_variant === "A").length;
                countB = evaluations.filter((e) => e.preferred_variant === "B").length;
                
                const totalAB = countA + countB;
                
                percentA = totalAB ? ((countA / totalAB) * 100).toFixed(1) : 0;
                percentB = totalAB ? ((countB / totalAB) * 100).toFixed(1) : 0;
                
                const evalA = evaluations.filter((e) => e.preferred_variant === "A");
                const evalB = evaluations.filter((e) => e.preferred_variant === "B");
                if (evalA.length > 0) {
                  avgA.clarity = (
                    evalA.reduce((sum, e) => sum + e.clarity, 0) / evalA.length
                  ).toFixed(2);
                  avgA.comprehension = (
                    evalA.reduce((sum, e) => sum + e.comprehension, 0) / evalA.length
                  ).toFixed(2);
                  avgA.cognitive_load = (
                    evalA.reduce((sum, e) => sum + e.cognitive_load, 0) / evalA.length
                  ).toFixed(2);
                }

                if (evalB.length > 0) {
                  avgB.clarity = (
                    evalB.reduce((sum, e) => sum + e.clarity, 0) / evalB.length
                  ).toFixed(2);
                  avgB.comprehension = (
                    evalB.reduce((sum, e) => sum + e.comprehension, 0) / evalB.length
                  ).toFixed(2);
                  avgB.cognitive_load = (
                    evalB.reduce((sum, e) => sum + e.cognitive_load, 0) / evalB.length
                  ).toFixed(2);
                }
              }

              let recommendedVariant = null;
              let recommendationReason = "";

              if (countA > 0 || countB > 0) {
                let scoreA = 0;
                let scoreB = 0;

                if (countA > countB) scoreA += 1;
                if (countB > countA) scoreB += 1;

                if (Number(avgA.clarity) > Number(avgB.clarity)) scoreA += 1;
                if (Number(avgB.clarity) > Number(avgA.clarity)) scoreB += 1;

                if (Number(avgA.comprehension) > Number(avgB.comprehension)) scoreA += 1;
                if (Number(avgB.comprehension) > Number(avgA.comprehension)) scoreB += 1;

                if (Number(avgA.cognitive_load) < Number(avgB.cognitive_load)) scoreA += 1;
                if (Number(avgB.cognitive_load) < Number(avgA.cognitive_load)) scoreB += 1;

                if (scoreA > scoreB) {
                  recommendedVariant = "A";
                  recommendationReason = "obtiene mejor equilibrio entre preferencia, claridad, comprensión y carga cognitiva";
                } else if (scoreB > scoreA) {
                  recommendedVariant = "B";
                  recommendationReason = "obtiene mejor equilibrio entre preferencia, claridad, comprensión y carga cognitiva";
                } else {
                  recommendedVariant = "Empate";
                  recommendationReason = "los resultados están equilibrados entre ambas variantes";
                }
              }
              

              return (
                <div key={experiment.id} className="experiment-item">
                  <h3>{experiment.title}</h3>
                  <p>{experiment.description || "Sin descripción"}</p>
                  <p><strong>Tipo:</strong> {experiment.type}</p>
                  <p>
                    <strong>Estado:</strong>{" "}
                    <span className={`status-badge status-${experiment.status}`}>
                      {experiment.status}
                    </span>
                  </p>
                  <p><strong>Autor:</strong> {experiment.created_by}</p>

                  <button onClick={() => loadResults(experiment.id)}>
                    {loadingResults[experiment.id]
                      ? "Cargando..."
                      : results[experiment.id]
                      ? "Actualizar resultados"
                      : "Ver resultados"}
                  </button>

                  {experimentResults && (
                    <p><strong>{experimentResults.total}</strong> evaluaciones</p>
                  )}

                  {experimentResults && (
                    <div className="results-box">
                      {experimentResults.total === 0 && (
                        <p>No hay evaluaciones todavía.</p>
                      )}
                      <p><strong>Total respuestas:</strong> {experimentResults.total}</p>
                      <div className="metric-block">
                        <p><strong>Claridad media:</strong> {experimentResults.averages.clarity.toFixed(2) || "0.00"}</p>
                        <div className="metric-bar">
                          <div
                            className="metric-fill"
                            style={{ width: `${(experimentResults.averages.clarity / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="metric-block">
                        <p><strong>Comprensión media:</strong> {experimentResults.averages.comprehension.toFixed(2) || "0.00"}</p>
                        <div className="metric-bar">
                          <div
                            className="metric-fill"
                            style={{ width: `${(experimentResults.averages.comprehension / 5) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="metric-block">
                        <p><strong>Carga cognitiva media:</strong> {experimentResults.averages.cognitive_load.toFixed(2) || "0.00"}</p>
                        <div className="metric-bar">
                          <div
                            className="metric-fill"
                            style={{ width: `${(experimentResults.averages.cognitive_load / 5) * 100}%` }}
                          />
                        </div>
                      </div>
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
                              <p>Claridad: {avgA.clarity}</p>
                              <p>Comprensión: {avgA.comprehension}</p>
                              <p>Carga cognitiva: {avgA.cognitive_load}</p>
                            </div>
                          )}

                          {countB > 0 && (
                            <div>
                              <p><strong>Variante B</strong></p>
                              <p>Claridad: {avgB.clarity}</p>
                              <p>Comprensión: {avgB.comprehension}</p>
                              <p>Carga cognitiva: {avgB.cognitive_load}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {recommendedVariant && (
                        <div className="recommendation-box">
                          <p><strong>Conclusión automática:</strong></p>
                          <p>
                            <strong>Variante recomendada:</strong> {recommendedVariant}
                          </p>
                          <p>{recommendationReason}</p>
                        </div>
                      )}

                      { experimentResults.evaluations &&
                        experimentResults.evaluations.some(
                          (e) => e.comment && e.comment.trim() !== ""
                        ) && (
                          <div className="comments-box">
                            <p><strong>Comentarios de usuarios:</strong></p>
                            <ul>
                              {experimentResults.evaluations
                                .filter((e) => e.comment && e.comment.trim() !== "")
                                .map((e, index) => (
                                  <li key={index}>{e.comment}</li>
                                ))}
                            </ul>
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
  );
}

export default DeveloperView;
