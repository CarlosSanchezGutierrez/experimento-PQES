import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { searchPlanningAudits } from "../services/planningService";
import "./Planning.css";
import "./BuscarAuditorias.css";

const EMPTY = { q: "", status: "", risk: "", type: "", quarter: "", year: "" };
const STATUS_LABELS = {
  OPEN: "Propuesta abierta", APPROVED: "Aprobada", ACTIVE: "En curso",
  CLOSED: "Cerrada", REJECTED: "Rechazada"
};

function BuscarAuditorias() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY);
  const [audits, setAudits] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async (next) => {
    setLoading(true);
    try {
      setAudits(await searchPlanningAudits(next));
      setError("");
    } catch (cause) {
      setError(cause.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    searchPlanningAudits(EMPTY)
      .then((results) => { if (!cancelled) setAudits(results); })
      .catch((cause) => { if (!cancelled) setError(cause.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const update = (field) => (event) => setFilters((current) => ({ ...current, [field]: event.target.value }));
  const submit = (event) => { event.preventDefault(); setSelected(null); load(filters); };
  const clear = () => { setFilters(EMPTY); setSelected(null); load(EMPTY); };

  return (
    <div className="dashboard-layout">
      <Sidebar active="auditorias" />
      <main className="dashboard-main">
        <section className="dashboard-content planning-page clean-header-page audit-search-page">
          <div className="dashboard-header">
            <div><span className="eyebrow">HU-26 · CONSULTA DEL PORTAFOLIO</span><h1>Buscar auditorías</h1>
              <p>Consulta propuestas y auditorías según los permisos de tu cuenta.</p></div>
          </div>
          <form className="audit-search-form" onSubmit={submit} aria-label="Filtros de auditorías">
            <label>Búsqueda por ID, nombre, área, objetivo o responsable
              <input value={filters.q} onChange={update("q")} maxLength={120} placeholder="Escribe una palabra o identificador" />
            </label>
            <label>Estado<select value={filters.status} onChange={update("status")}>
              <option value="">Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <label>Riesgo<select value={filters.risk} onChange={update("risk")}><option value="">Todos</option>
              {["Bajo", "Medio", "Alto"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Tipo<select value={filters.type} onChange={update("type")}><option value="">Todos</option>
              {["Interna", "Externa"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Trimestre<select value={filters.quarter} onChange={update("quarter")}><option value="">Todos</option>
              {["Q1", "Q2", "Q3", "Q4"].map((value) => <option key={value}>{value}</option>)}</select></label>
            <label>Año<input type="number" min="2020" max="2100" value={filters.year} onChange={update("year")} placeholder="Todos" /></label>
            <div className="audit-search-actions"><button className="primary-action" type="submit" disabled={loading}>Buscar</button>
              <button className="secondary-action" type="button" onClick={clear} disabled={loading}>Limpiar</button></div>
          </form>
          {error && <p className="planning-message error" role="alert">{error}</p>}
          <p role="status" aria-live="polite">{loading ? "Buscando auditorías…" : `${audits.length} resultado(s)`}</p>
          {!loading && audits.length === 0 && <div className="planning-empty">No hay auditorías visibles que coincidan con los filtros.</div>}
          <div className="audit-search-results">
            {audits.map((audit) => <article className="audit-search-card" key={audit.id}>
              <div><strong>{audit.id} · {audit.title}</strong><span>{STATUS_LABELS[audit.status] || audit.status}</span></div>
              <p>{audit.area} · {audit.year} · {audit.quarter || "Sin trimestre"} · Riesgo {audit.risk}</p>
              <p>Responsable: {audit.responsible || "Sin asignar"}</p>
              <button type="button" className="secondary-action" onClick={() => setSelected(audit)}>Ver detalles</button>
              {audit.status === "ACTIVE" && <button type="button" className="secondary-action" onClick={() => navigate(`/auditorias-activas/${encodeURIComponent(audit.id)}`)}>Abrir auditoría</button>}
            </article>)}
          </div>
          {selected && <section className="audit-search-detail" aria-label={`Detalle de ${selected.id}`}>
            <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar detalles">Cerrar</button>
            <h2>{selected.id} · {selected.title}</h2>
            <dl><dt>Estado</dt><dd>{STATUS_LABELS[selected.status] || selected.status}</dd>
              <dt>Objetivo</dt><dd>{selected.objective}</dd><dt>Alcance</dt><dd>{selected.scope}</dd>
              <dt>Justificación</dt><dd>{selected.justification}</dd><dt>Responsable</dt><dd>{selected.responsible || "Sin asignar"}</dd>
              <dt>Periodo</dt><dd>{selected.startDate || "Sin fecha"} — {selected.endDate || "Sin fecha"}</dd></dl>
          </section>}
        </section>
      </main>
    </div>
  );
}

export default BuscarAuditorias;
