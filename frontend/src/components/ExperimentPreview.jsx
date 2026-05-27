import { buildPreviewHtml } from "../utils/previewHtml";

function ExperimentPreview({
  experiment,
  selectedVariant = "",
  variantClassName = "",
  fullWidth = false,
}) {
  if (!experiment) return null;

  if (experiment.type === "single") {
    return (
      <iframe
        title={`preview-${experiment.id}`}
        className={`preview-frame ${fullWidth ? "user-full-preview" : ""}`}
        sandbox="allow-forms allow-same-origin"
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
          <h4>Variante A</h4>
          <iframe
            title={`preview-a-${experiment.id}`}
            className="preview-frame"
            sandbox="allow-forms allow-same-origin"
            srcDoc={buildPreviewHtml(experiment.variant_a_html)}
          />
        </div>

        <div
          className={`ab-variant ${
            selectedVariant === "B" ? "selected" : ""
          }`}
        >
          <h4>Variante B</h4>
          <iframe
            title={`preview-b-${experiment.id}`}
            className="preview-frame"
            sandbox="allow-forms allow-same-origin"
            srcDoc={buildPreviewHtml(experiment.variant_b_html)}
          />
        </div>
      </div>
    );
  }

  return null;
}

export default ExperimentPreview;