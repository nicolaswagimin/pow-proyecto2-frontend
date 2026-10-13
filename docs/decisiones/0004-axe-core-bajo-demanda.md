# 0004 · axe-core cargado bajo demanda

- **Estado:** aceptada
- **Fecha:** 2026-10-12

## Contexto
El producto audita con axe-core. Para que el login demuestre que la app es accesible, puede correr axe sobre sí mismo. Pero axe-core pesa unos 675 kB (160 kB comprimido), más que todo el resto de la app.

## Decisión
Agregar `axe-core` como dependencia e importarlo con `import('axe-core')` solo cuando se pulsa "Auditar esta página". Se declara en `allowedCommonJsDependencies` porque se publica como CommonJS.

## Consecuencias
- La carga inicial no crece (unos 81 kB comprimidos) y los budgets de `angular.json` se cumplen.
- La primera auditoría tarda lo que tarde en descargarse el chunk; el botón muestra "Auditando…".
- Si la descarga falla, el resultado lo explica en lugar de quedarse colgado.
- El producto reutilizará la misma dependencia para auditar el HTML pegado.
