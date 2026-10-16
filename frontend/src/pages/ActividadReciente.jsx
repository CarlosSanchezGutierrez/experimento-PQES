import { useEffect, useState } from "react";
import { ArrowRight, Clock3, Inbox, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getRecentAuditActivity } from "../services/auditService";
import "./Dashboard.css";
import "./ActividadReciente.css";

const ACTION_LABELS = {
  AUDIT_PROPOSAL_CREATED: "Propuesta creada",
  AUDIT_PROPOSAL_UPDATED: "Propuesta actualizada",
  AUDIT_PROPOSAL_APPROVED: "Auditoría aprobada",
  AUDIT_PROPOSAL_REJECTED: "Propuesta rechazada",
  AUDIT_PROPOSAL_DELETED: "Propuesta eliminada",
  AUDIT_COMMENT_ADDED: "Comentario agregado",
  AUDIT_STARTED: "Auditoría iniciada",
  AUDIT_CLOSED: "Auditoría cerrada",
  AUDIT_UPDATED: "Auditoría actualizada",
  FINDING_REGISTERED: "Hallazgo registrado",
  EVIDENCE_REGISTERED: "Evidencia registrada",
  EVIDENCE_FILE_UPLOADED: "Archivo de evidencia cargado"
};

const formatDate = (date) => new Date(date).toLocaleString("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit"
});

function ActividadReciente() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setActivities(await getRecentAuditActivity());
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    getRecentAuditActivity()
      .then((entries) => {
        if (cancelled) return;
        setActivities(entries);
        setError("");
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const openAudit = (audit) => {
    const auditId = encodeURIComponent(audit.id);
    navigate(audit.status === "ACTIVE"
      ? `/auditorias-activas/${auditId}`
      : `/auditorias?auditId=${auditId}`);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar active="actividad" />
      <main className="dashboard-main">
        <section className="dashboard-content recent-activity-page">
          <header className="dashboard-header">
            <div>
              <span className="eyebrow">SEGUIMIENTO DE AUDITORÍAS</span>
              <h1>Actividad reciente</h1>
              <p>Eventos recientes de los expedientes de auditoría visibles para tu cuenta.</p>
            </div>
            <button type="button" className="recent-activity-refresh" onClick={load} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" />
              Actualizar
            </button>
          </header>

          {error && <p className="recent-activity-error" role="alert">{error}</p>}
          {loading && <p className="recent-activity-state" role="status">Cargando actividad…</p>}
          {!loading && !error && activities.length === 0 && (
            <div className="recent-activity-empty">
              <Inbox size={22} aria-hidden="true" />
              <p>No hay actividad reciente en tus auditorías.</p>
            </div>
          )}
          {!loading && activities.length > 0 && (
            <ol className="recent-activity-list">
              {activities.map((entry) => (
                <li key={entry.id}>
                  <article className="recent-activity-card">
                    <div className="recent-activity-card-icon"><Clock3 size={19} aria-hidden="true" /></div>
                    <div className="recent-activity-card-content">
                      <span className="recent-activity-action">{ACTION_LABELS[entry.action] || entry.action}</span>
                      <h2>{entry.audit.id} · {entry.audit.title}</h2>
                      <p>{entry.actor.username || "Sistema"} · {formatDate(entry.date)}</p>
                    </div>
                    <button type="button" className="recent-activity-open" onClick={() => openAudit(entry.audit)}>
                      Abrir auditoría <ArrowRight size={16} aria-hidden="true" />
                    </button>
                  </article>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>
    </div>
  );
}

export default ActividadReciente;
