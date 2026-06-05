import { buildPreviewHtml } from "../utils/previewHtml";
import { useTranslation } from "react-i18next";

function ExperimentPreview({
  experiment,
  selectedVariant = "",
  variantClassName = "",
  fullWidth = false,
}) {
  const { t } = useTranslation();

  if (!experiment) return null;

  if (experiment.type === "single") {
    return (
      <iframe
        title={`preview-${experiment.id}`}
        className={`preview-frame ${fullWidth ? "user-full-preview" : ""}`}
        sandbox="allow-scripts allow-forms"
        srcDoc={buildPreviewHtml(experiment.variant_a_html)}
      />
    );
  }

  if (experiment.type === "ab") {
    return (
      <div className={`ab-container ${variantClassName}`}>
        <div
          className={`ab-variant ${
            selectedVariant === "A" ? "selected" : ""
          }`}
        >
          <h4>{t("common.variantA")}</h4>
          <iframe
            title={`preview-a-${experiment.id}`}
            className="preview-frame"
            sandbox="allow-scripts allow-forms"
            srcDoc={buildPreviewHtml(experiment.variant_a_html)}
          />
        </div>

        <div
          className={`ab-variant ${
            selectedVariant === "B" ? "selected" : ""
          }`}
        >
          <h4>{t("common.variantB")}</h4>
          <iframe
            title={`preview-b-${experiment.id}`}
            className="preview-frame"
            sandbox="allow-scripts allow-forms"
            srcDoc={buildPreviewHtml(experiment.variant_b_html)}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default ExperimentPreview;
