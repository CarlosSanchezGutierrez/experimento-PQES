# HU-11: permisos de creación de auditorías

## Fuente y alcance

La matriz CRUD entregada por el equipo describe permisos de aplicaciones de auditoría existentes. Este documento toma las filas **Audit Engagement** de `RACI!B23`, `Retail!C16` y `Beverage!C10` como referencia para el flujo de auditorías de VERA. Los nombres de roles de la matriz no coinciden exactamente con los roles del producto; la correspondencia siguiente es una decisión de implementación, no un dato escrito literalmente en el archivo.

| Rol en VERA | Referencia en la matriz | Crear propuesta | Editar propuesta abierta | Aprobar/rechazar | Eliminar propuesta abierta |
| --- | --- | --- | --- | --- | --- |
| `AUDITOR` | AuditorsOp / AuditorsCorp | No | No | No | No |
| `JEFATURA` | LeadOp / LeadCorp | Sí | Solo propia | No | No |
| `GERENTE` | Executive ManagementOp / Corp | Sí | Sí | No | No |
| `DIRECTOR` | Audit Director | Sí | Sí | Sí | No |
| `SUPER_ADMIN` | CoE / administración de VERA | Sí | Sí | Sí | Sí |

Las tres hojas coinciden en que el auditor puede visualizar un **Audit Engagement**, pero no crearlo; jefaturas y niveles gerenciales pueden crearlo. En la fila principal, `RACI!P23:S23` y `RACI!T23:W23` habilitan crear, visualizar y actualizar para jefaturas, sin eliminar. `RACI!AN23:AQ23` hace lo mismo para dirección. La matriz CRUD no incluye una columna de aprobación; VERA conserva la autorización de `DIRECTOR` y `SUPER_ADMIN` definida por HU-23.

## Flujo de VERA

La creación de una auditoría empieza como propuesta **OPEN**. Solo después de la aprobación queda **APPROVED** y puede iniciarse como **ACTIVE**. Por eso habilitar la creación de propuestas a `JEFATURA` no equivale a permitirle activar una auditoría sin aprobación. El backend valida el rol en cada ruta. Para `JEFATURA`, además comprueba que la propuesta abierta que intenta editar tenga su identificador en `createdBy.id`; la interfaz oculta la acción de edición cuando no corresponde.

Los permisos de propuestas se mantienen separados de los de riesgos y controles. `JEFATURA` no obtiene acceso de escritura a esos módulos por el cambio de HU-11. Solo `SUPER_ADMIN` puede eliminar una propuesta abierta; una propuesta resuelta no puede eliminarse.

## Límite pendiente del modelo

La matriz distingue Retail/Spin y Beverage, además de grupos de segunda línea. VERA actualmente solo guarda un campo libre `area` y un rol global por usuario. No existe un identificador de unidad de negocio en el usuario ni una relación verificable entre unidad y propuesta. Por eso este cambio no afirma implementar segregación por unidad: esa regla necesita un modelo de membresía y autorización en datos antes de habilitarla. Tampoco se traslada automáticamente el resto de aplicaciones de la matriz a VERA.
