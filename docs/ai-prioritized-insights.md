# Prioridades explicables del asistente

El asistente muestra **Qué revisar primero** al abrir la vista general. Cada tarjeta enlaza al registro que originó la señal y enumera los factores usados. La lista es orientativa y de solo lectura: no representa riesgo residual, no modifica datos y no sustituye una decisión profesional.

## Fuente y alcance

`GET /api/assistant/insights` exige sesión, desactiva caché y usa `buildAssistantContext` para obtener auditorías, riesgos, controles, hallazgos y pendientes visibles para el rol. El Auditor solo recibe registros de su alcance; las relaciones de controles se cuentan únicamente contra riesgos visibles. En producción, el endpoint exige almacenes persistentes. Esta consulta no envía datos a Azure OpenAI y sigue disponible si el modelo está temporalmente apagado.

## Orden de atención

La versión `rule-based-attention-v1` usa reglas reproducibles:

| Señal | Factores | Puntaje orientativo |
| --- | --- | --- |
| Riesgo alto o con control por revisar o hallazgo abierto | Puntaje de riesgo registrado, controles con efectividad menor a 4/5, hallazgos abiertos | `min(100, riesgo × 10 + controles × 15 + hallazgos × 10)` |
| Auditoría activa con vencimiento en 14 días o menos | Días a fecha objetivo y avance registrado | 55 si próxima, 80 si vencida; +15 cuando avance es menor a 50 %, máximo 100 |
| Control por revisar vinculado a riesgos visibles | Efectividad y cantidad de riesgos visibles relacionados | `min(90, 50 + riesgos × 8 + 15 si efectividad ≤ 2)` |
| Actividad marcada alta para la cuenta | Prioridad ya calculada por el módulo de notificaciones | 75 |

Las señales se ordenan por puntaje descendente y clave estable. Se muestran máximo seis y la interfaz indica cuando hay más. El puntaje mide **atención sugerida**, no probabilidad, impacto ni eficacia residual. Para una decisión se debe abrir el registro fuente y comprobar su estado actual.

## Validación

- Pruebas unitarias de orden, fórmula, fuentes, fechas, límite y ausencia de datos.
- Prueba HTTP de sesión requerida, `Cache-Control: no-store` y exclusión del riesgo de otro Auditor.
- Prueba UI de explicación, enlace y advertencia de alcance.
- La aceptación con usuarios reales en producción requiere cuentas activas por rol; se documenta en [ai-production-acceptance.md](ai-production-acceptance.md).
