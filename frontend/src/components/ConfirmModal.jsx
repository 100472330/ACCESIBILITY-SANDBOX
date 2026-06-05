import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

function ConfirmModal({
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmClassName = "",
  onConfirm,
  onCancel,
  children,
}) {
  const { t } = useTranslation();
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  return (
    <div className="modal-backdrop">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <h3 id="confirm-modal-title">{title}</h3>
        <p>{message}</p>

        {children}

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            ref={cancelButtonRef}
          >
            {cancelLabel || t("common.cancel")}
          </button>

          <button
            type="button"
            className={confirmClassName}
            onClick={onConfirm}
          >
            {confirmLabel || t("common.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
