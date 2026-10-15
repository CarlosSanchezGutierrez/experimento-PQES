import { useCallback, useEffect, useState } from "react";
import { Activity, CheckCircle2, Pencil, Play, RefreshCw } from "lucide-react";
import Sidebar from "../components/Sidebar";
import PlanningHistoryButton from "../components/PlanningHistoryButton";
import EditAuditModal from "../components/EditAuditModal";
import { PLANNING_APPROVE_ROLES, RISK_FACTORS } from "../constants/planning";
import { closeAudit, getActiveAudits, getPlanningAudits, startAudit } from "../services/planningService";
import { getRisks } from "../services/riskService";
import { getControls } from "../services/controlService";
import "./Planning.css";

const riskFor = (likelihood, impact) => {
  const score = likelihood * impact;
  return score <= 2 ? "Bajo" : score <= 4 ? "Medio" : "Alto";
};

function AuditoriasActivas() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const canManage = PLANNING_APPROVE_ROLES.includes(user?.role);
  const [activeAudits, setActiveAudits] = useState([]);
  const [approvedAudits, setApprovedAudits] = useState([]);
  const [risks, setRisks] = useState([]);
  const [controls, setControls] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingAudit, setEditingAudit] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const [active, proposals, linkedRisks, linkedControls] = await Promise.all([
        getActiveAudits(), getPlanningAudits(), getRisks(), getControls()
      ]);
      setActiveAudits(active);
      setApprovedAudits(proposals.filter((item) => item.status === "APPROVED"));
      setRisks(linkedRisks);
      setControls(linkedControls);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getActiveAudits(), getPlanningAudits(), getRisks(), getControls()])
      .then(([active, proposals, linkedRisks, linkedControls]) => {
        if (cancelled) return;
        setActiveAudits(active);
        setApprovedAudits(proposals.filter((item) => item.status === "APPROVED"));
        setRisks(linkedRisks);
        setControls(linkedControls);
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

  const runTransition = async (id, action, successMessage) => {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      await action(id);
      await refresh();
      setMessage(successMessage);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleEdited = async (successMessage) => {
    setEditingAudit(null);
    await refresh();
    setMessage(successMessage);
  };

  const editButton = (audit) => canManage && (
    <button type="button" onClick={() => { setMessage(""); setEditingAudit(audit); }} disabled={busyId === audit.id}>
      <Pencil size={16} aria-hidden="true" />Editar
    </button>
  );

  const factorLabel = (value) => RISK_FACTORS.find((factor) => factor.value === value)?.label || "Media";
  const matrixCount = (likelihood, impact) => activeAudits.filter(
    (audit) => (audit.likelihood ?? 2) === likelihood && (audit.impact ?? 2) === impact
  ).length;
  const selectedAudits = selectedCell ? activeAudits.filter((audit) =>
    (audit.likelihood ?? 2) === selectedCell.likelihood && (audit.impact ?? 2) === selectedCell.impact
  ) : [];

  return (
    <div className="dashboard-layout">
      <Sidebar active="auditorias-activas" />
      <main className="dashboard-main">
        <section className="dashboard-content planning-page clean-header-page active-audits-page">
          <div className="dashboard-header">
            <div>
              <span className="eyebrow">EJECUCIÓN Y RIESGO</span>
              <h1>Auditorías activas y matriz de riesgos</h1>
              <p>Consulta las auditorías en curso, su exposición y las decisiones de inicio o cierre.</p>
            </div>
            <button className="secondary-action" type="button" onClick={refresh} disabled={loading}>
              <RefreshCw size={16} aria-hidden="true" /> Actualizar
            </button>
          </div>

          {message && <p className="planning-message success" role="status">{message}</p>}
          {error && <p className="planning-message error" role="alert">{error}</p>}

          <div className="planning-summary">
            <div><strong>{activeAudits.length}</strong><span>Auditorías en curso</span></div>
            <div><strong>{approvedAudits.length}</strong><span>Aprobadas por iniciar</span></div>
            <div><strong>{activeAudits.filter((audit) => riskFor(audit.likelihood ?? 2, audit.impact ?? 2) === "Alto").length}</strong><span>Riesgo alto en curso</span></div>
          </div>

          <section className="risk-matrix-panel" aria-labelledby="risk-matrix-title">
            <div className="planning-section-heading">
              <div>
                <span className="eyebrow">MATRIZ 3 × 3</span>
                <h2 id="risk-matrix-title">Probabilidad e impacto de auditorías en curso</h2>
              </div>
              <span>Clasificación = probabilidad × impacto</span>
            </div>
            {loading ? <div className="planning-empty">Cargando matriz de riesgos...</div> : (
              <div className="risk-matrix-scroll">
                <table className="risk-matrix">
                  <caption>Conteo de auditorías activas por nivel de probabilidad e impacto</caption>
                  <thead>
                    <tr>
                      <th scope="col">Probabilidad ↓ / Impacto →</th>
                      {RISK_FACTORS.map((factor) => <th scope="col" key={factor.value}>{factor.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {[...RISK_FACTORS].reverse().map((likelihood) => (
                      <tr key={likelihood.value}>
                        <th scope="row">{likelihood.label}</th>
                        {RISK_FACTORS.map((impact) => {
                          const risk = riskFor(likelihood.value, impact.value);
                          return (
                            <td className={`matrix-cell matrix-${risk.toLowerCase()}`} key={impact.value}>
                              <button
                                type="button"
                                className="matrix-cell-button"
                                aria-label={`Ver auditorías con probabilidad ${likelihood.label} e impacto ${impact.label}: ${matrixCount(likelihood.value, impact.value)}`}
                                aria-pressed={selectedCell?.likelihood === likelihood.value && selectedCell?.impact === impact.value}
                                onClick={() => setSelectedCell({ likelihood: likelihood.value, impact: impact.value })}
                              >
                                <strong>{matrixCount(likelihood.value, impact.value)}</strong>
                                <span>{risk}</span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="risk-matrix-legend">Bajo: puntuación 1–2 · Medio: 3–4 · Alto: 6–9. El producto se calcula con niveles de 1 (bajo) a 3 (alto).</p>
            {selectedCell && (
              <section className="matrix-selection" aria-live="polite" aria-label="Detalle de la celda seleccionada">
                <h3>Auditorías y riesgos · probabilidad {factorLabel(selectedCell.likelihood)}, impacto {factorLabel(selectedCell.impact)}</h3>
                {selectedAudits.length === 0 ? <p>No hay auditorías activas en esta celda.</p> : selectedAudits.map((audit) => {
                  const linkedRisks = risks.filter((item) => item.linkedAuditId === audit.id);
                  return <article key={audit.id} className="matrix-selection-audit">
                    <h4>{audit.id} · {audit.title}</h4>
                    <p>Riesgo de auditoría: {riskFor(audit.likelihood ?? 2, audit.impact ?? 2)} ({(audit.likelihood ?? 2) * (audit.impact ?? 2)}/9).</p>
                    {linkedRisks.length ? linkedRisks.map((item) => {
                      const relatedControls = controls.filter((control) => control.riskIds.includes(item.id));
                      return <div key={item.id} className="matrix-linked-risk">
                        <strong>{item.id} · {item.title}</strong>
                        <p>{item.description} · Nivel {item.level} ({item.score}/9)</p>
                        <p>Controles asociados: {relatedControls.length ? relatedControls.map((control) => `${control.id} · ${control.title} (${control.effectiveness}/5)`).join(", ") : "ninguno registrado"}.</p>
                      </div>;
                    }) : <p>No hay riesgos registrados vinculados a esta auditoría.</p>}
                    <a href={`#audit-${audit.id}`}>Ir a la auditoría {audit.id}</a>
                  </article>;
                })}
              </section>
            )}
          </section>

          <div className="planning-section-heading active-list-heading">
            <div><span className="eyebrow">SEGUIMIENTO</span><h2>En curso</h2></div>
            <span>{activeAudits.length} activas</span>
          </div>
          {loading ? <div className="planning-empty">Cargando auditorías...</div> : activeAudits.length === 0 ? (
            <div className="planning-empty"><Activity size={20} aria-hidden="true" />No hay auditorías en curso.</div>
          ) : (
            <div className="planning-list">
              {activeAudits.map((audit) => (
                <article className="planning-card active-audit-card" id={`audit-${audit.id}`} key={audit.id}>
                  <div className="planning-card-icon"><Activity size={21} aria-hidden="true" /></div>
                  <div className="planning-card-content">
                    <div className="proposal-heading">
                      <span className="planning-id">{audit.id}</span>
                      <span className={`risk-badge risk-${riskFor(audit.likelihood ?? 2, audit.impact ?? 2).toLowerCase()}`}>
                        Riesgo {riskFor(audit.likelihood ?? 2, audit.impact ?? 2)}
                      </span>
                    </div>
                    <h2>{audit.title}</h2>
                    <p>{audit.objective}</p>
                    <div className="proposal-meta">
                      <span><b>Área:</b> {audit.area}</span>
                      <span><b>Responsable:</b> {audit.responsible || "Sin asignar"}</span>
                      <span><b>Inicio:</b> {audit.startedAt ? new Date(audit.startedAt).toLocaleDateString("es-MX") : "Sin dato"}</span>
                      <span><b>Probabilidad / impacto:</b> {factorLabel(audit.likelihood ?? 2)} / {factorLabel(audit.impact ?? 2)}</span>
                    </div>
                  </div>
                  <div className="planning-card-actions">
                    {canManage && <button type="button" onClick={() => runTransition(audit.id, closeAudit, "Auditoría cerrada.")} disabled={busyId === audit.id}>
                      <CheckCircle2 size={16} aria-hidden="true" />{busyId === audit.id ? "Guardando..." : "Cerrar auditoría"}
                    </button>}
                    {editButton(audit)}
                    <PlanningHistoryButton proposal={audit} />
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="planning-section-heading active-list-heading">
            <div><span className="eyebrow">LISTAS PARA EJECUCIÓN</span><h2>Aprobadas pendientes de inicio</h2></div>
            <span>{approvedAudits.length} aprobadas</span>
          </div>
          {approvedAudits.length === 0 ? (
            <div className="planning-empty">No hay auditorías aprobadas pendientes de inicio.</div>
          ) : (
            <div className="planning-list">
              {approvedAudits.map((audit) => (
                <article className="planning-card active-audit-card" key={audit.id}>
                  <div className="planning-card-icon"><CheckCircle2 size={21} aria-hidden="true" /></div>
                  <div className="planning-card-content">
                    <span className="planning-id">{audit.id} · {audit.quarter} {audit.year}</span>
                    <h2>{audit.title}</h2>
                    <p>{audit.area} · Riesgo {riskFor(audit.likelihood ?? 2, audit.impact ?? 2)}</p>
                  </div>
                  <div className="planning-card-actions">
                    {canManage && <button type="button" onClick={() => runTransition(audit.id, startAudit, "Auditoría iniciada y visible en la matriz.")} disabled={busyId === audit.id}>
                      <Play size={16} aria-hidden="true" />{busyId === audit.id ? "Guardando..." : "Iniciar auditoría"}
                    </button>}
                    {editButton(audit)}
                    <PlanningHistoryButton proposal={audit} />
                  </div>
                </article>
              ))}
            </div>
          )}

          {editingAudit && (
            <EditAuditModal
              audit={editingAudit}
              onClose={() => setEditingAudit(null)}
              onSaved={handleEdited}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default AuditoriasActivas;
