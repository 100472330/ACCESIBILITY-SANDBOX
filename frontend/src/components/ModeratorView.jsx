import { useState } from "react";
import { useTranslation } from "react-i18next";
import { buildPreviewHtml } from "../utils/previewHtml";
import ConfirmModal from "./ConfirmModal";

function ModeratorView({
    experiments,
    pendingUsers = [],
    onUpdateStatus,
    onUpdateCategory,
    onUpdateApprovedQuestions,
    onUpdateUserStatus,
  }) {
  const [openPreview, setOpenPreview] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [approvedQuestionsByExperiment, setApprovedQuestionsByExperiment] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);
  const [rejectionComment, setRejectionComment] = useState("");
  const { t } = useTranslation();

  const pendingExperiments = experiments.filter(
    (experiment) => experiment.status === "pending"
  );

  const categories = [
    { value: "form", label: t("common.categories.form") },
    { value: "login", label: t("common.categories.login") },
    { value: "text", label: t("common.categories.text") },
    { value: "button", label: t("common.categories.button") },
    { value: "navigation", label: t("common.categories.navigation") },
    { value: "other", label: t("common.categories.other") },
  ];

  const filteredPendingExperiments = selectedCategory
    ? pendingExperiments.filter(
        (experiment) => (experiment.category || "other") === selectedCategory
      )
    : [];

    function togglePreview(id) {
      setOpenPreview((prev) => ({
        ...prev,
        [id]: !prev[id],
      }));
    }
  
  function parseQuestions(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function toggleApprovedQuestion(experiment, question) {
    const currentApproved =
      approvedQuestionsByExperiment[experiment.id] ??
      parseQuestions(experiment.approved_custom_questions);

    const nextApproved = currentApproved.includes(question)
      ? currentApproved.filter((q) => q !== question)
      : [...currentApproved, question];
    
    console.log("Updating approved questions", experiment.id, nextApproved);

    setApprovedQuestionsByExperiment((prev) => ({
      ...prev,
      [experiment.id]: nextApproved,
    }));

    onUpdateApprovedQuestions(experiment.id, nextApproved);
  }

  function requestStatusChange(experiment, status) {
    setConfirmAction({ experiment, status });
    setRejectionComment("");
  }

  async function confirmStatusChange() {
    if (!confirmAction) return;

    await onUpdateStatus(
      confirmAction.experiment.id,
      confirmAction.status,
      confirmAction.status === "rejected" ? rejectionComment : ""
    );

    setConfirmAction(null);
  }

  return (
    <>
      <section className="card">
        <h2>{t("moderatorView.developerRequestsTitle")}</h2>
        <p className="category-intro">
          {t("moderatorView.developerRequestsBody")}
        </p>

        {pendingUsers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>{t("moderatorView.noRequestsTitle")}</h3>
            <p>{t("moderatorView.noRequestsBody")}</p>
          </div>
        ) : (
          <div className="experiment-list">
            {pendingUsers.map((user) => (
              <div key={user.id} className="experiment-item">
                <div className="experiment-card-header">
                  <div>
                    <h3>{user.name}</h3>
                    <p>{user.email}</p>
                  </div>

                  <span className="status-badge status-pending">
                    {user.account_status}
                  </span>
                </div>

                <p>
                  <strong>{t("moderatorView.requestedRole")}:</strong>{" "}
                  {t(`common.roles.${user.role}`)}
                </p>

                <div className="actions">
                  <button
                    className="approve-btn"
                    onClick={() => onUpdateUserStatus(user.id, "approved")}
                  >
                    {t("moderatorView.approveDeveloper")}
                  </button>

                  <button
                    className="reject-btn"
                    onClick={() => onUpdateUserStatus(user.id, "rejected")}
                  >
                    {t("moderatorView.rejectDeveloper")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t("moderatorView.moderationTitle")}</h2>
        <p className="category-intro">
          {t("moderatorView.moderationBody")}
        </p>

        <div className="category-card-grid">
          {categories.map((category) => (
            <button
              type="button"
              key={category.value}
              className={`category-card ${
                selectedCategory === category.value ? "active-category-card" : ""
              }`}
              onClick={() => setSelectedCategory(category.value)}
            >
              <h3>{category.label}</h3>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        {selectedCategory === "" ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛡</div>
            <h3>{t("moderatorView.selectCategoryTitle")}</h3>
            <p>
              {t("moderatorView.selectCategoryBody")}
            </p>
          </div>
        ) : filteredPendingExperiments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <h3>{t("moderatorView.noPendingTitle")}</h3>
            <p>
              {t("moderatorView.noPendingBody")}
            </p>
          </div>
        ) : (
          <div className="experiment-list">
            {filteredPendingExperiments.map((experiment) => {
              const customQuestions = parseQuestions(experiment.custom_questions);
              const approvedQuestions =
                approvedQuestionsByExperiment[experiment.id] ??
                parseQuestions(experiment.approved_custom_questions);

              return (
                <div
                  key={experiment.id}
                  className={`experiment-item ${
                    openPreview[experiment.id] ? "expanded" : ""
                  }`}
                >
                  <h3>{experiment.title}</h3>

                  <p className="experiment-short-description">
                    {experiment.short_description || t("common.noShortDescription")}
                  </p>

                  <p className="experiment-long-description">
                    {experiment.description || t("common.noDetailedDescription")}
                  </p>

                  {experiment.instructions && (
                    <div className="experiment-instructions">
                      <h4>{t("common.instructions")}</h4>
                      <p>{experiment.instructions}</p>
                    </div>
                  )}

                  <p>
                    <strong>{t("common.type")}:</strong>{" "}
                    {t(`common.experimentTypes.${experiment.type}`)}
                  </p>

                  <label className="moderator-category-select">
                    <strong>{t("common.category")}:</strong>
                    <select
                      value={experiment.category || "other"}
                      onChange={(e) =>
                        onUpdateCategory(experiment.id, e.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {customQuestions.length > 0 && (
                    <div className="moderator-questions-box">
                      <p>
                        <strong>{t("moderatorView.proposedQuestions")}:</strong>
                      </p>

                      {customQuestions.map((question, index) => {
                        const checked = approvedQuestions.includes(question);

                        return (
                          <label
                            key={index}
                            className="moderator-question-item"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleApprovedQuestion(experiment, question)
                              }
                            />
                            <span>{question}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <p>
                    <strong>{t("common.status")}:</strong>{" "}
                    {t(`common.statuses.${experiment.status}`)}
                  </p>

                  <button onClick={() => togglePreview(experiment.id)}>
                    {openPreview[experiment.id]
                      ? t("moderatorView.hidePreview")
                      : t("moderatorView.showPreview")}
                  </button>

                  {openPreview[experiment.id] && (
                    <div className="moderator-preview-box">
                      <p className="preview-label">
                        {experiment.type === "ab"
                          ? t("moderatorView.variantsComparison")
                          : t("moderatorView.componentPreview")}
                      </p>

                      {experiment.type === "single" && (
                        <iframe
                          title={`preview-${experiment.id}`}
                          className="preview-frame"
                          sandbox="allow-scripts allow-forms"
                          srcDoc={buildPreviewHtml(
                            experiment.variant_a_html
                          )}
                        />
                      )}

                      {experiment.type === "ab" && (
                        <div className="ab-container">
                          <div className="ab-variant">
                            <h4>{t("common.variantA")}</h4>
                            <iframe
                              title={`preview-a-${experiment.id}`}
                              className="preview-frame"
                              sandbox="allow-scripts allow-forms"
                              srcDoc={buildPreviewHtml(
                                experiment.variant_a_html
                              )}
                            />
                          </div>

                          <div className="ab-variant">
                            <h4>{t("common.variantB")}</h4>
                            <iframe
                              title={`preview-b-${experiment.id}`}
                              className="preview-frame"
                              sandbox="allow-scripts allow-forms"
                              srcDoc={buildPreviewHtml(
                                experiment.variant_b_html
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="actions">
                    <button
                      className="approve-btn"
                      onClick={() => requestStatusChange(experiment, "approved")}
                    >
                      {t("moderatorView.approve")}
                    </button>

                   <button
                    className="reject-btn"
                    onClick={() => requestStatusChange(experiment, "rejected")}
                  >
                    {t("moderatorView.reject")}
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      {confirmAction && (
        <ConfirmModal
          title={
            confirmAction.status === "approved"
              ? t("moderatorView.confirmApproveTitle")
              : t("moderatorView.confirmRejectTitle")
          }
          message={
            confirmAction.status === "approved"
              ? t("moderatorView.confirmApproveMessage", {
                  title: confirmAction.experiment.title,
                })
              : t("moderatorView.confirmRejectMessage", {
                  title: confirmAction.experiment.title,
                })
          }
          confirmLabel={
            confirmAction.status === "approved"
              ? t("moderatorView.approveExperiment")
              : t("moderatorView.rejectExperiment")
          }
          confirmClassName={
            confirmAction.status === "approved"
              ? "approve-btn"
              : "reject-btn"
          }
          onCancel={() => setConfirmAction(null)}
          onConfirm={confirmStatusChange}
        >
          {confirmAction.status === "rejected" && (
            <label>
              <span>{t("moderatorView.rejectionReason")}</span>
              <textarea
                placeholder={t("moderatorView.rejectionPlaceholder")}
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
              />
            </label>
          )}
        </ConfirmModal>
      )}
    </>
  );
}
export default ModeratorView;
