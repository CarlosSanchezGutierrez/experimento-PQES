import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  BellRing,
  Bot,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Files,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldAlert,
  ScrollText,
  UserCog,
  X
} from "lucide-react";
import { ROLE_LABELS, USER_ADMIN_ROLES } from "../constants/roles";
import { getRecentAuditActivity } from "../services/auditService";
import "../pages/Dashboard.css";
import "./Sidebar.css";

const ICON_SIZE = 20;
const ICON_STROKE = 1.75;

const ACTIVITY_LABELS = {
  AUDIT_PROPOSAL_CREATED: "Propuesta creada",
  AUDIT_PROPOSAL_UPDATED: "Propuesta actualizada",
  AUDIT_PROPOSAL_APPROVED: "Auditoría aprobada",
  AUDIT_PROPOSAL_REJECTED: "Propuesta rechazada",
  AUDIT_COMMENT_ADDED: "Comentario agregado",
  AUDIT_STARTED: "Auditoría iniciada",
  AUDIT_CLOSED: "Auditoría cerrada",
  FINDING_REGISTERED: "Hallazgo registrado",
  EVIDENCE_REGISTERED: "Evidencia registrada",
  EVIDENCE_FILE_UPLOADED: "Archivo de evidencia cargado"
};

const formatDate = (date) => new Date(date).toLocaleString("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit"
});

function Sidebar({ active }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityError, setActivityError] = useState("");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const canSeeUsers = USER_ADMIN_ROLES.includes(user?.role);
  const canSeeAuditLog = user?.role === "SUPER_ADMIN";
  const items = [
    { id: "dashboard", label: "Panel de Portafolio", Icon: LayoutDashboard, path: "/dashboard" },
    { id: "planificacion", label: "Planificación", Icon: ClipboardList, path: "/planificacion" },
    { id: "trimestres", label: "Trimestres", Icon: CalendarRange, path: "/trimestres" },
    { id: "auditorias-activas", label: "Auditorías activas y riesgos", Icon: Activity, path: "/auditorias-activas" },
    { id: "auditorias", label: "Buscar auditorías", Icon: Search, path: "/auditorias" },
    { id: "riesgos", label: "Registro de riesgos", Icon: ShieldAlert, path: "/riesgos" },
    { id: "controles", label: "Mapa de controles", Icon: ClipboardCheck, path: "/controles" },
    { id: "notificaciones", label: "Pendientes", Icon: BellRing, path: "/notificaciones" },
    { id: "asistente", label: "Asistente de IA", Icon: Bot, path: "/asistente" },
    { id: "evidencias", label: "Evidencias", Icon: Files, path: "/evidencias" },
    ...(canSeeUsers ? [{ id: "usuarios", label: "Usuarios", Icon: UserCog, path: "/usuarios" }] : []),
    ...(canSeeAuditLog ? [{ id: "auditoria", label: "Registro de actividad", Icon: ScrollText, path: "/auditoria" }] : [])
  ];

  const toggleActivity = async () => {
    if (activityOpen) {
      setActivityOpen(false);
      return;
    }

    setActivityOpen(true);
    setActivityLoading(true);
    setActivityError("");
    try {
      setActivities(await getRecentAuditActivity());
      setActivityError("");
    } catch (error) {
      setActivityError(error.message);
    } finally {
      setActivityLoading(false);
    }
  };

  const openActivity = (entry) => {
    const auditId = encodeURIComponent(entry.audit.id);
    const path = entry.audit.status === "ACTIVE"
      ? `/auditorias-activas/${auditId}`
      : `/auditorias?auditId=${auditId}`;
    navigate(path);
    setMobileOpen(false);
    setActivityOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen((open) => !open)}
        aria-label={mobileOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
        aria-expanded={mobileOpen}
        aria-controls="vera-sidebar"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside id="vera-sidebar" className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <img src="/vera-logo.svg" alt="VERA" style={{ width: 32, height: 32 }} />
          </div>

          <div>
            <h2>VERA</h2>
            <p>
              VERIFICACIÓN · EVIDENCIA ·
              <br />
              RIESGO · AUDITORÍA
            </p>
          </div>
        </div>

        <div className="sidebar-navigation">
          <div className="nav-title">NAVEGACIÓN</div>
          <nav aria-label="Módulos principales">
            {items.map(({ id, label, Icon, path }) => (
              <button
                type="button"
                key={id}
                className={`nav-item${active === id ? " active" : ""}`}
                onClick={() => {
                  navigate(path);
                  setMobileOpen(false);
                  setActivityOpen(false);
                }}
              >
                <Icon size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-activity">
            <button
              type="button"
              className={`nav-item${activityOpen ? " active" : ""}`}
              onClick={toggleActivity}
              aria-expanded={activityOpen}
              aria-controls="recent-audit-activity"
            >
              <Activity size={ICON_SIZE} strokeWidth={ICON_STROKE} aria-hidden="true" />
              <span>Actividad reciente</span>
            </button>
            {activityOpen && (
              <section id="recent-audit-activity" className="recent-activity" aria-label="Actividad reciente de auditorías">
                <h3>Actividad reciente</h3>
                {activityLoading && <p className="recent-activity-message">Cargando actividad…</p>}
                {activityError && <p className="recent-activity-message error" role="alert">{activityError}</p>}
                {!activityLoading && !activityError && activities.length === 0 && (
                  <p className="recent-activity-message">No hay actividad reciente en tus auditorías.</p>
                )}
                {!activityLoading && activities.map((entry) => (
                  <button
                    type="button"
                    className="recent-activity-item"
                    key={entry.id}
                    onClick={() => openActivity(entry)}
                  >
                    <strong>{ACTIVITY_LABELS[entry.action] || entry.action}</strong>
                    <span>{entry.audit.id} · {entry.audit.title}</span>
                    <small>{entry.actor.username || "Sistema"} · {formatDate(entry.date)}</small>
                  </button>
                ))}
              </section>
            )}
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="user-info">
            <div className="avatar">{user?.name?.charAt(0)}</div>

            <div>
              <strong>{user?.name}</strong>
              <span>{ROLE_LABELS[user?.role] || user?.role}</span>
            </div>
          </div>

          <button type="button" className="logout-button" onClick={logout}>
            <LogOut size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
