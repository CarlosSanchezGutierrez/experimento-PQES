# PQES · acuerdo inicial de modernización

## Objetivo

Construir una nueva implementación a partir del comportamiento verificable de VERA. La experiencia visual y de interacción, los permisos, las reglas de negocio y los flujos de gobierno son requisitos de equivalencia. El lenguaje del backend, la base de datos y el entorno de despliegue se decidirán mediante evidencia de PQES y de la arquitectura aprobada por FEMSA.

La referencia reproducible es el tag [`vera-baseline-720cef0`](https://github.com/CarlosSanchezGutierrez/experimento-PQES/tree/vera-baseline-720cef0), que apunta al commit `720cef05d2e1c5b16a5552837dbc0c5c3043381e`. El tag fija el punto de comparación; no certifica que cada HU esté aceptada en producción. Consulta la [matriz de aceptación heredada](../hu-acceptance-audit.md).

## Invariantes que hay que caracterizar

| Área | Comportamiento a describir y comparar |
| --- | --- |
| Experiencia | Rutas, pantallas, contenido, estados vacío/carga/error, teclado y tamaños de pantalla. |
| Gobierno | Propuesta, revisión, decisión, auditoría activa, riesgo, control, evidencia, hallazgo y seguimiento; sus transiciones, responsables y registros. |
| Acceso | Identidad, roles, permisos por operación y por expediente; respuestas de acceso denegado sin revelar datos ajenos. |
| Datos | Identificadores, relaciones, integridad, historial, retención, migración y recuperación. |
| Integraciones | Sistemas autorizados, propietarios, contrato, autenticación, red, trazas y manejo de errores. |
| Calidad | Casos reproducibles que comparen la referencia con PQES, además de las pruebas propias de la nueva implementación. |

La equivalencia se juzgará por resultados observables y criterios de aceptación; no exige traducir línea por línea el código existente. El frontend puede conservar sus componentes y requerir un adaptador de transporte si cambia una API, siempre que el comportamiento visible y los permisos permanezcan comprobables.

## Secuencia y puertas de decisión

1. **Inventario de referencia.** Relacionar HU, rutas, operaciones, reglas, respuestas, estados de interfaz y pruebas existentes. Señalar lo no implementado y lo no verificado. Salida: matriz de trazabilidad y escenarios de caracterización.
2. **Contratos y dominio.** Describir las API con OpenAPI, transiciones de estado, política de acceso y modelo conceptual de datos. Salida: contratos revisables y catálogo de discrepancias.
3. **Decisión de plataforma.** Comparar Java y .NET con criterios medibles: estándares de FEMSA, experiencia del equipo, soporte, dependencias, observabilidad, contenedores y costo operativo. Elegir la base de datos según requisitos de integridad, operación e integración. Registrar decisiones en ADR; no escoger por la tecnología del prototipo.
4. **Sección vertical.** Implementar un flujo completo desde la interfaz hasta una base de datos de prueba en la plataforma elegida. Comparar sus respuestas, permisos, trazas y estados con la referencia antes de ampliar el alcance.
5. **Migración controlada.** Incorporar módulos y datos por etapas, con ensayos de migración, verificación de integridad y plan de reversión. La coexistencia de dos sistemas, si se necesita, tendrá rutas y dueño de datos explícitos.
6. **Operación.** Construir imágenes Docker reproducibles, configurar secretos fuera de la imagen, health checks, logs estructurados, métricas, respaldos y despliegue en el entorno autorizado.

## Dependencias de FEMSA

La integración empresarial aún no está definida. Antes de diseñarla se requiere un catálogo aprobado de sistemas e interfaces, dueños de datos, identidad corporativa, topología/red, ambientes, clasificación de información, retención y criterios de despliegue. Tener acceso a Azure DevOps o una cuenta universitaria no demuestra acceso a esos sistemas. No se incluirán credenciales, datos reales ni supuestos de conectividad en el repositorio.

## Próxima entrega

El siguiente PR de PQES debe aportar la **matriz de equivalencia** del primer flujo con evidencia de la referencia: pasos, reglas, permisos, entradas, respuestas esperadas y casos negativos. La [auditoría de ramas y calidad](baseline-and-quality.md) describe por qué no se fusionan todas las ramas heredadas y cómo se valida este fork.
