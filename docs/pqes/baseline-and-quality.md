# Línea base, ramas y calidad del fork

## Estado observado al iniciar PQES

La referencia de este inventario es el tag [`vera-baseline-720cef0`](https://github.com/CarlosSanchezGutierrez/experimento-PQES/tree/vera-baseline-720cef0). Al clonar el fork, `origin/main` y `upstream/main` apuntaban ambos a `720cef05d2e1c5b16a5552837dbc0c5c3043381e`: no faltaba promover commits del origen a `main` del fork en ese momento. Hay que volver a comparar ambos remotos antes de una sincronización futura.

El fork contenía otras **30 ramas remotas**:

- **20 ramas de funcionalidad, corrección, documentación o calidad:** cada una corresponde a un PR ya fusionado en el repositorio VERA. Algunas ramas son ancestros de `main`; otras conservan commits originales distintos del squash merge. Fusionarlas de nuevo no agrega una HU pendiente y puede reintroducir código antiguo o conflictos.
- **10 ramas de Dependabot:** corresponden a propuestas de actualización todavía abiertas en VERA. Incluyen cambios de versión mayor en paquetes de backend o herramientas frontend. Cada actualización necesita un PR actualizado contra el `main` de PQES, lectura de notas de cambio y checks verdes. La mera existencia de la rama no autoriza fusionarla.

Los [PR del origen](https://github.com/humbertofigb15/VERA/pulls?q=is%3Apr) son historial de procedencia; los [PR de PQES](https://github.com/CarlosSanchezGutierrez/experimento-PQES/pulls) serán el historial de cambios de este proyecto. **No borrar ni fusionar ramas en bloque** antes de revisar su PR y su diferencia contra la línea base.

## Calidad heredada en el código

`main` ya contiene `npm run quality`, pruebas de backend, lint, build y auditoría de dependencias, E2E de navegadores y accesibilidad, CodeQL, evaluación sintética de IA y el workflow integral docente. Los archivos están en `.github/workflows/`; los scripts están en `package.json` y los paquetes. Que esos archivos existan en el fork **no equivale a una corrida aprobada en PQES**.

| Workflow | Disparador | Condición para atribuir resultado a PQES |
| --- | --- | --- |
| `quality.yml` | PR, push a `main`, manual | Corrida verde del commit del fork con artefacto de calidad. |
| `e2e.yml` | PR, push a `main`, manual | Corrida verde con navegadores y perfiles declarados. |
| `codeql.yml` | PR, push a `main`, semanal, manual | Análisis registrado en este repositorio. |
| `classroom-quality.yml` | Semanal o manual | Resumen y artefacto del fork; no confundir con VERA. |
| `ai-evaluation.yml` | Manual | Informe sintético del fork; no verifica Azure en producción. |
| `load-test.yml` | Manual con confirmación | Solo staging autorizado, host permitido y cuenta de prueba. No ejecutar contra producción por defecto. |

## Activación y gobierno

En el inventario inicial, GitHub informaba `total_count: 0` para workflows del fork y no había corridas, aunque los seis archivos y el permiso general de Actions estaban presentes. Los forks pueden requerir habilitar explícitamente sus workflows en la pestaña **Actions**. Antes de exigir checks de rama se deben registrar y ejecutar en el fork.

Orden de activación:

1. Habilitar los workflows heredados en **Actions** del fork y comprobar que aparecen los seis.
2. Ejecutar `quality.yml`, `e2e.yml` y `codeql.yml` contra un PR de PQES. Revisar resultados, duración y artefactos; corregir fallos reales si aparecen.
3. Configurar protección de `main`: PR obligatorio, sin force push ni borrado, y checks requeridos de calidad, E2E y CodeQL con nombres observados en el fork.
4. Ejecutar manualmente el workflow integral y el de evaluación sintética si se necesita evidencia del fork. Mantener la carga de 150/250 usuarios reservada a staging aprobado.
5. Revisar Dependabot y Code Scanning como configuraciones del fork; no trasladar secretos ni variables de VERA sin inventario y autorización.

Los badges y enlaces del README de PQES apuntan al fork. Una insignia verde del upstream nunca reemplaza su propia ejecución. Registrar en cada PR qué se verificó localmente, qué pasó en CI y qué requeriría un ambiente real.
