# Borradores de propuesta con revisión humana

Desde un riesgo visible, los roles autorizados a crear propuestas pueden solicitar un borrador. VERA muestra el título, objetivo, alcance, justificación y fuente antes de permitir llevarlo a Planificación. **Preparar y trasladar el borrador no crean una propuesta**. La creación ocurre únicamente cuando la persona revisa el formulario, completa el periodo y pulsa **Abrir propuesta**; el backend vuelve a validar permisos y campos.

## Flujo

1. Abrir el asistente en el contexto de un riesgo autorizado y pulsar **Preparar borrador**.
2. VERA verifica el rol y el alcance del riesgo. Envía a Azure OpenAI solo un contexto reducido de ese riesgo; exige campos estructurados dentro de límites y una cita al identificador visible.
3. Si Azure no está disponible, no produce campos válidos o no cita el riesgo, VERA presenta una **plantilla** identificada como tal. No se afirma que haya sido redactada por IA.
4. La persona comprueba texto y fuente. Al pulsar **Usar como borrador en Planificación**, los campos viajan por `sessionStorage` del navegador, asociados al usuario y con caducidad de diez minutos. No aparecen en la URL.
5. Planificación consume y elimina esa copia de sesión, abre el formulario sin guardar y deja fechas, responsable y trimestre por definir. La persona puede editar o cancelar. El guardado usa el endpoint existente de propuestas y sus permisos RBAC.

## Controles

- `POST /api/assistant/draft-proposal` exige sesión y rol `SUPER_ADMIN`, `GERENTE` o `JEFATURA`, limita solicitudes, usa `no-store` y oculta riesgos fuera del alcance.
- La respuesta indica `mode: generated` o `mode: template`, `persisted: false`, `reviewRequired: true` y la fuente citada. No crea registros ni confirma aprobaciones.
- El endpoint registra solo metadatos de estado, rol, modo y duración; no registra el texto del borrador ni claves.
- La copia en sesión se elimina al intentar usarla y se descarta si cambió el usuario o venció. El cliente no es una barrera de autorización: al guardar, el servidor valida otra vez.

## Pruebas

Las pruebas unitarias cubren formato y límites, cita obligatoria, ausencia de escritura, denegación de roles y ocultamiento de riesgos ajenos. La prueba de navegador verifica el traslado al formulario y que no ocurre ningún `POST /api/planning` antes de que el usuario confirme manualmente. La aceptación de producción con usuarios reales continúa descrita en [ai-production-acceptance.md](ai-production-acceptance.md).
