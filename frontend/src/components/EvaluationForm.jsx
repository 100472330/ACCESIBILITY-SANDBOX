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

function EvaluationForm({
  experiment,
  form,
  customQuestions,
  customAnswers,
  onSubmit,
  onChange,
  onStandardAnswerChange,
  onCustomAnswersChange,
}) {
  return (
    <section className="card">
      <h3>Evaluar experimento</h3>

      <form onSubmit={onSubmit} className="form">
        <div className="standard-questions-block">
          <h3>Evaluación estándar</h3>
          <p className="evaluation-help">
            Valora cada afirmación del 1 al 5, donde 1 significa “muy en desacuerdo”
            y 5 significa “muy de acuerdo”.
          </p>

          {experiment.type === "ab" && (
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
                    onChange={onChange}
                  />
                  <span>Variante A</span>
                </label>

                <label className="likert-option">
                  <input
                    type="radio"
                    name="preferred_variant"
                    value="B"
                    checked={form.preferred_variant === "B"}
                    onChange={onChange}
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
                          onStandardAnswerChange(question.id, value)
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
          onChange={onChange}
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
                  onChange={(event) =>
                    onCustomAnswersChange(question, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        )}

        <button type="submit">Enviar evaluación</button>
      </form>
    </section>
  );
}

export default EvaluationForm;