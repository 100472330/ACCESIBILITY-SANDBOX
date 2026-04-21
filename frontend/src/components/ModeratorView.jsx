

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
export default ModeratorView;