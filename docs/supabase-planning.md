# Persistencia de propuestas y auditorías en Supabase

HU-07 y HU-09 exigen que los indicadores y la matriz consulten datos almacenados. La API puede usar Supabase para las propuestas y auditorías que alimentan ambas vistas. El modo predeterminado `memory` conserva el demo y sus pruebas locales.

## Activación

1. En un proyecto Supabase bajo control del equipo, ejecuta [la migración SQL](../backend/sql/vera_audit_proposals.sql) en el SQL Editor. La tabla no admite lectura directa con claves públicas.
2. Configura **solo en el backend** `VERA_PLANNING_STORE=supabase`, `SUPABASE_URL` y `SUPABASE_SECRET_KEY`. También se acepta `SUPABASE_SERVICE_ROLE_KEY` en proyectos con clave legacy. Nunca uses variables `VITE_` para la clave secreta ni la subas al repositorio.
3. Reinicia o redespliega el backend. Crea una propuesta, apruébala e iníciala desde la aplicación. Reinicia otra vez y confirma que sigue visible en `/api/planning/active` y que `/api/dashboard` refleja sus conteos para los roles autorizados.

Sin configuración completa, las solicitudes de planificación responden `503` en modo Supabase; no se sustituyen por datos temporales. No se cargan las tres propuestas de demostración en la base: un proyecto recién configurado comienza vacío.

## Alcance y límites

- Se almacenan título, objetivo, alcance temporal, área, responsable, factores y nivel de riesgo, estado y actor/fecha de cada decisión. Los cambios de estado y las ediciones usan una versión para detectar modificaciones concurrentes; la base impide duplicados por título, área y año.
- La API consulta Supabase en cada solicitud del panel, matriz, planificación y notificaciones. Los permisos por rol y asignación se aplican antes de responder.
- Las cuentas, riesgos independientes, controles, referencias de evidencia, comentarios y bitácora general todavía usan memoria. Por tanto, no se debe declarar persistencia integral ni historial permanente. Las relaciones con usuarios nuevos requieren migrar también las cuentas antes de usar datos reales.
- La matriz principal clasifica el riesgo de cada auditoría con sus factores almacenados. El riesgo residual requiere datos persistentes de controles/evaluaciones y sigue pendiente.
- Este repositorio no contiene credenciales ni acceso a un proyecto Supabase; la migración SQL y la conexión real deben ejecutarse en el proyecto del equipo para cerrar la evidencia de aceptación.
