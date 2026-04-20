import { useEffect, useState } from "react";
import {
  getExperiments,
  getPublishedExperiments,
  createExperiment,
  updateExperimentStatus,
  createEvaluation,
  getExperimentResults
} from "./api";
import "./index.css";

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


  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function loadResults(id) {
    try {
      const data = await getExperimentResults(id);
      setResults((prev) => ({
        ...prev,
        [id]: data,
      }));
    } catch (err) {
      console.error(err);
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

              if (experimentResults && experimentResults.evaluations) {
                const evaluations = experimentResults.evaluations;

                countA = evaluations.filter(e => e.preferred_variant === "A").length;
                countB = evaluations.filter(e => e.preferred_variant === "B").length;

                const totalAB = countA + countB;

                percentA = totalAB ? ((countA / totalAB) * 100).toFixed(1) : 0;
                percentB = totalAB ? ((countB / totalAB) * 100).toFixed(1) : 0;
              }

              return (
                <div key={experiment.id} className="experiment-item">
                  <h3>{experiment.title}</h3>
                  <p>{experiment.description || "Sin descripción"}</p>
                  <p><strong>Tipo:</strong> {experiment.type}</p>
                  <p><strong>Estado:</strong> {experiment.status}</p>
                  <p><strong>Autor:</strong> {experiment.created_by}</p>

                  <button onClick={() => loadResults(experiment.id)}>
                    Ver resultados
                  </button>

                  {experimentResults && (
                    <div className="results-box">
                      <p><strong>Total respuestas:</strong> {experimentResults.total}</p>
                      <p><strong>Claridad media:</strong> {experimentResults.averages.clarity.toFixed(2)}</p>
                      <p><strong>Comprensión media:</strong> {experimentResults.averages.comprehension.toFixed(2)}</p>
                      <p><strong>Carga cognitiva media:</strong> {experimentResults.averages.cognitive_load.toFixed(2)}</p>

                      {(countA + countB) > 0 && (
                        <div className="ab-results">
                          <p><strong>Resultados A/B:</strong></p>
                          <p>Variante A: {countA} votos ({percentA}%)</p>
                          <p>Variante B: {countB} votos ({percentB}%)</p>
                          <p>
                            <strong>
                              Ganadora: {countA > countB ? "A" : countB > countA ? "B" : "Empate"}
                            </strong>
                          </p>
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

function ModeratorView({ experiments, onUpdateStatus }) {
  const pendingExperiments = experiments.filter(
    (experiment) => experiment.status === "pending"
  );

  return (
    <section className="card">
      <h2>Moderación</h2>
      {pendingExperiments.length === 0 ? (
        <p>No hay experimentos pendientes.</p>
      ) : (
        <div className="experiment-list">
          {pendingExperiments.map((experiment) => (
            <div key={experiment.id} className="experiment-item">
              <h3>{experiment.title}</h3>
              <p>{experiment.description || "Sin descripción"}</p>
              <p><strong>Tipo:</strong> {experiment.type}</p>
              <p><strong>Estado:</strong> {experiment.status}</p>

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
                sandbox=""
                srcDoc={selectedExperiment.variant_a_html}
              />
            )}

            {selectedExperiment.type === "ab" && (
              <div className="ab-container">
                <div className="ab-variant">
                  <h3>Variante A</h3>
                  <iframe
                    title="variant-a"
                    className="preview-frame"
                    sandbox=""
                    srcDoc={selectedExperiment.variant_a_html}
                  />
                </div>

                <div className="ab-variant">
                  <h3>Variante B</h3>
                  <iframe
                    title="variant-b"
                    className="preview-frame"
                    sandbox=""
                    srcDoc={selectedExperiment.variant_b_html}
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

function App() {
  const [role, setRole] = useState("");
  const [experiments, setExperiments] = useState([]);
  const [publishedExperiments, setPublishedExperiments] = useState([]);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
  if (successMessage) {
    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }
}, [successMessage]);

  async function loadExperiments() {
    try {
      const data = await getExperiments();
      setExperiments(data);
    } catch (err) {
      setError("Error loading experiments");
      console.error(err);
    }
  }

  async function loadPublishedExperiments() {
    try {
      const data = await getPublishedExperiments();
      setPublishedExperiments(data);
    } catch (err) {
      setError("Error loading published experiments");
      console.error(err);
    }
  }

  useEffect(() => {
    loadExperiments();
    loadPublishedExperiments();
  }, []);

  async function handleCreateExperiment(payload) {
    try {
      setError("");
      await createExperiment(payload);
      await setSuccessMessage("Experimento creado correctamente!");
      await loadExperiments();
    } catch (err) {
      setError("Error creating experiment");
      console.error(err);
    }
  }

  async function handleUpdateStatus(id, status) {
    try {
      setError("");
      await updateExperimentStatus(id, status);
      setSuccessMessage(`Experimento ${status}`);
      await loadExperiments();
      await loadPublishedExperiments();
    } catch (err) {
      setError("Error updating experiment status");
      console.error(err);
    }
  }

  async function handleCreateEvaluation(payload) {
    try {
      setError("");
      await createEvaluation(payload);
      setSuccessMessage("Evaluación enviada correctamente!");
    } catch (err) {
      setError("Error creating evaluation");
      console.error(err);
    }
  }

  if (!role) {
    return (
      <div className="app">
        <section className="card login-card">
          <h1>Accessibility Sandbox</h1>
          <p>Selecciona el rol con el que quieres acceder al prototipo.</p>

          <div className="role-entry-buttons">
            <button onClick={() => setRole("developer")}>
              Entrar como Developer
            </button>
            <button onClick={() => setRole("moderator")}>
              Entrar como Moderator
            </button>
            <button onClick={() => setRole("user")}>
              Entrar como User
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Accessibility Sandbox</h1>
        <div className="role-switcher">
          <span>Rol actual: <strong>{role}</strong></span>
          <button onClick={() => setRole("")}>Cambiar rol</button>
        </div>
      </header>

      {successMessage && (
        <p className="success">{successMessage}</p>
      )}

      {error && <p className="error">{error}</p>}


      {role === "developer" && (
        <section className="card role-banner developer-banner">
          <h2>Panel de desarrollador</h2>
          <p>Crea experimentos, consulta su estado y analiza resultados.</p>
        </section>
      )}

      {role === "moderator" && (
        <section className="card role-banner moderator-banner">
          <h2>Panel de moderación</h2>
          <p>Revisa experimentos pendientes y decide si se publican.</p>
        </section>
      )}

      {role === "user" && (
        <section className="card role-banner user-banner">
          <h2>Área de evaluación</h2>
          <p>Explora experimentos publicados y envía tu evaluación.</p>
        </section>
      )}
      
      {role === "developer" && (
        <DeveloperView
          experiments={experiments}
          onCreate={handleCreateExperiment}
        />
      )}

      {role === "moderator" && (
        <ModeratorView
          experiments={experiments}
          onUpdateStatus={handleUpdateStatus}
        />
      )}

      {role === "user" && (
        <UserView
          experiments={publishedExperiments}
          onEvaluate={handleCreateEvaluation}
        />
      )}
    </div>
  );
}

export default App;