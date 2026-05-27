function ConfirmModal({
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmClassName = "",
  onConfirm,
  onCancel,
}) {
  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <h3>{title}</h3>
        <p>{message}</p>

        <div className="modal-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            className={confirmClassName}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;