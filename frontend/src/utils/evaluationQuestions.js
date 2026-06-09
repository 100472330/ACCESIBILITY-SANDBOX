export const singleStandardQuestions = [
  { id: "q1" },
  { id: "q2" },
  { id: "q3" },
  { id: "q4" },
  { id: "q5" },
  { id: "q6" },
  { id: "q7" },
  { id: "q8" },
  { id: "q9" },
  { id: "q10" },
];

export const abStandardQuestions = [
  { id: "q1" },
  { id: "q2" },
  { id: "q3" },
  { id: "q4" },
  { id: "q5" },
];

export function getABAnswerKey(variant, questionId) {
  return `${variant.toLowerCase()}_${questionId}`;
}

export function buildStandardAnswers(type = "single") {
  if (type === "ab") {
    return ["A", "B"].reduce((answers, variant) => {
      abStandardQuestions.forEach((question) => {
        answers[getABAnswerKey(variant, question.id)] = 3;
      });

      return answers;
    }, {});
  }

  return singleStandardQuestions.reduce((answers, question) => {
    answers[question.id] = 3;
    return answers;
  }, {});
}

export function getQuestionLabel(t, experimentType, questionId, variant = null) {
  if (experimentType === "ab") {
    const variantLabel =
      variant === "A" ? t("common.variantA") : t("common.variantB");

    return t(`evaluation.abQuestions.${questionId}`, {
      variant: variantLabel,
    });
  }

  return t(`evaluation.standardQuestions.${questionId}`);
}