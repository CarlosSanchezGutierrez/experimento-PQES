# Estado de aceptación de historias de usuario

Revisión del código en `main` al 15 de octubre de 2026 y de las capturas de Azure DevOps compartidas por el equipo. El estado “Resolved” en Azure DevOps no prueba por sí solo que todos los criterios se cumplan en el despliegue. La base de datos Supabase tiene migraciones, pero los almacenes persistentes son optativos y no se ha verificado la configuración del despliegue de Vercel.

| HU | Evidencia implementada en el repositorio | Pendiente para afirmar aceptación completa |
| --- | --- | --- |
| 07 Panel principal | `GET /api/dashboard`, métricas y pendientes según rol; pruebas de integración. | Verificar datos persistentes en el entorno desplegado y contrastar todos los criterios de Azure DevOps. No existen métricas reales de hallazgos. |
| 09 Auditorías activas y matriz | `GET /api/planning/active`, matriz 3×3, vínculos con riesgos y controles. | Verificación remota con datos Supabase, incluida navegación y permisos. |
| 14 Riesgos | API y pantalla de registro, evaluación versionada, filtros, RBAC; modo Supabase optativo. | Confirmar criterios completos de Azure DevOps, persistencia y permisos en el despliegue. |
| 15 Controles | API y pantalla de controles, asociación con múltiples riesgos, evaluaciones versionadas y referencias de evidencia; modo Supabase optativo. | El criterio visible exige que un control inefectivo permita crear un hallazgo relacionado con control y riesgo: no existe ese flujo. Revisar la autorización de Auditoría frente al texto “Como auditor” y la matriz de roles. Confirmar persistencia remota. |
| 16 Evidencias | API y pantalla de **referencias** vinculadas a riesgo, control o auditoría; modo Supabase optativo para metadatos. | Falta carga y almacenamiento de archivos binarios. La HU no puede considerarse completa con referencias externas solamente. |
| 17 Notificaciones | Bandeja de pendientes calculada desde el estado de propuestas y auditorías; navegación contextual. | Los criterios completos no aparecen en las capturas. Verificar el alcance esperado de entregas, estados de lectura y persistencia; hoy los pendientes se recalculan y no hay correo/push ni lectura persistida. |
| 18 Historial y comentarios | API y UI de eventos/comentarios; modos Supabase optativos. | Confirmar criterios completos y persistencia/auditoría en el despliegue. |
| 19 Concurrencia y navegadores | Playwright cubre Chrome, Edge, Firefox, móvil y tablet; existe un script k6 de carga. | Ejecutar y documentar una prueba real de 150 usuarios concurrentes y otra de al menos 250, con cuentas/datos y entorno de pruebas adecuados. El script preparado no equivale a una corrida. |
| 22 Propuestas | API/UI de creación, edición, validaciones y pruebas; modo Supabase optativo. | Validación funcional y persistencia en el despliegue. |
| 23 Decisiones | API/UI de aprobación/rechazo y bitácora; modo Supabase optativo. | Validación funcional y persistencia en el despliegue. |
| 26 Búsqueda y filtros | Esta rama agrega `GET /api/planning/search` y `/auditorias`, con filtros de texto, estado, riesgo, tipo, trimestre y año. El alcance de Auditoría se aplica antes de buscar. | Contrastar con los criterios completos de Azure DevOps y validar en despliegue tras el merge. |
| 34 Asistente IA | No iniciada. | En espera por decisión del equipo: primero completar y comprobar las demás HU. Aún no existe recurso Azure OpenAI para VERA. |

## Secuencia de cierre

1. Completar HU-26 en un PR acotado y validar sus filtros, roles e interfaz.
2. Implementar el flujo de hallazgos de HU-15 con relación persistente a control y riesgo, reglas de roles y pruebas.
3. Implementar carga, almacenamiento, descarga autorizada y vínculo de archivos de HU-16; conservar la distinción entre archivo y referencia externa.
4. Obtener criterios completos de HU-17/HU-18 y cubrir cualquier diferencia real; comprobar los modos Supabase en un despliegue con acceso del propietario.
5. Ejecutar la prueba de carga de HU-19 en un entorno de pruebas autorizado; registrar tasa, latencia, errores y límites. No ejecutarla contra producción sin una ventana coordinada.
6. Reconciliar el estado de Azure DevOps con evidencia de aceptación. La IA permanece fuera de esta secuencia hasta que se cierren las HU previas.

## Evidencia y límites

- Código: `backend/controllers`, `backend/routes`, `backend/repositories`, `frontend/src/pages`, `backend/tests`, `supabase/migrations`.
- PR previos: [HU-14](https://github.com/humbertofigb15/VERA/pull/19), [HU-15](https://github.com/humbertofigb15/VERA/pull/21), [HU-16](https://github.com/humbertofigb15/VERA/pull/23), [HU-17](https://github.com/humbertofigb15/VERA/pull/22), [HU-18](https://github.com/humbertofigb15/VERA/pull/20), [HU-19](https://github.com/humbertofigb15/VERA/pull/29) y [carga preparada](https://github.com/humbertofigb15/VERA/pull/30).
- Capturas de esta revisión: muestran criterios detallados de HU-15 y HU-34, además de estados y títulos de otras HU. Las capturas anteriores de HU-07, HU-09, HU-22 y HU-23 muestran algunos criterios, pero para la aceptación final se requiere el texto oficial completo. Esta matriz identifica brechas demostrables sin inventar criterios.
