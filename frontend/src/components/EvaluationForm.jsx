import { useTranslation } from "react-i18next";
import {
  abStandardQuestions,
  getABAnswerKey,
  getQuestionLabel,
  singleStandardQuestions,
} from "../utils/evaluationQuestions";

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
  const { t } = useTranslation();

  return (
    <section className="card">
      <h3>{t("evaluation.form.title")}</h3>

      <form onSubmit={onSubmit} className="form">
        <div className="standard-questions-block">
          <h3>{t("evaluation.form.standardTitle")}</h3>
          <p className="evaluation-help">
            {t("evaluation.form.help")}
          </p>

          {experiment.type === "ab" ? (
            <>
              {["A", "B"].map((variant) => (
                <div key={variant} className="ab-question-group">
                  <h4>
                    {variant === "A"
                      ? t("common.variantA")
                      : t("common.variantB")}
                  </h4>

                  {abStandardQuestions.map((question) => {
                    const answerKey = getABAnswerKey(variant, question.id);

                    return (
                      <div key={answerKey} className="standard-question-card">
                        <p className="standard-question-text">
                          {getQuestionLabel(t, "ab", question.id, variant)}
                        </p>

                        <div className="likert-row">
                          <span className="likert-end-label">
                            {t("evaluation.form.stronglyDisagree")}
                          </span>

                          <div className="likert-scale">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <label key={value} className="likert-option">
                                <input
                                  type="radio"
                                  name={answerKey}
                                  value={value}
                                  checked={form.standard_answers[answerKey] === value}
                                  onChange={() =>
                                    onStandardAnswerChange(answerKey, value)
                                  }
                                />
                                <span>{value}</span>
                              </label>
                            ))}
                          </div>

                          <span className="likert-end-label">
                            {t("evaluation.form.stronglyAgree")}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              <div className="standard-question-card">
                <p className="standard-question-text">
                  {t("evaluation.form.preferredVariant")}
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
                    <span>{t("common.variantA")}</span>
                  </label>

                  <label className="likert-option">
                    <input
                      type="radio"
                      name="preferred_variant"
                      value="B"
                      checked={form.preferred_variant === "B"}
                      onChange={onChange}
                    />
                    <span>{t("common.variantB")}</span>
                  </label>
                </div>
              </div>
            </>
          ) : (
            singleStandardQuestions.map((question) => (
              <div key={question.id} className="standard-question-card">
                <p className="standard-question-text">
                  {getQuestionLabel(t, "single", question.id)}
                </p>

                <div className="likert-row">
                  <span className="likert-end-label">
                    {t("evaluation.form.stronglyDisagree")}
                  </span>

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

                  <span className="likert-end-label">
                    {t("evaluation.form.stronglyAgree")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <textarea
          name="comment"
          placeholder={t("evaluation.form.optionalComment")}
          value={form.comment}
          onChange={onChange}
        />

        {customQuestions.length > 0 && (
          <div className="custom-answers-block">
            <h3>{t("evaluation.form.customTitle")}</h3>

            {customQuestions.map((question, index) => (
              <label key={index}>
                {question}
                <textarea
                  placeholder={t("evaluation.form.customPlaceholder")}
                  value={customAnswers[question] || ""}
                  onChange={(event) =>
                    onCustomAnswersChange(question, event.target.value)
                  }
                />
              </label>
            ))}
          </div>
        )}

        <button type="submit">{t("evaluation.form.submit")}</button>
      </form>
    </section>
  );
}

export default EvaluationForm;
