# Puntaje y reporte

## Puntaje

```
puntaje = max(0, 100 − Σ por regla incumplida (peso + min(5, elementos − 1)))
```

| Gravedad | Peso |
|---|---|
| Crítico | 15 |
| Serio | 8 |
| Moderado | 4 |
| Menor | 1 |

Cada regla pesa según su gravedad y suma 1 por cada elemento afectado después del primero, con un máximo de 5 extra: una página con 40 imágenes sin `alt` no queda en 0 por un solo error repetido, pero sí pesa más que una con una sola.

| Puntaje | Calificación |
|---|---|
| 95 a 100 | Excelente |
| 80 a 94 | Bueno |
| 50 a 79 | Necesita mejoras |
| 0 a 49 | Deficiente |

Ejemplo: un botón sin nombre (crítico, 1 elemento → 15) y tres textos con poco contraste (serio, 3 elementos → 8 + 2 = 10) dan 100 − 25 = **75, Necesita mejoras**.

El código está en `auditor/puntaje.ts` (`PESOS`, `MAX_EXTRA_POR_REGLA`, `penalizacion`, `calcularPuntaje`, `resumir`) y la explicación aparece en la interfaz bajo «¿Cómo se calcula?». El puntaje mide lo que axe puede detectar automáticamente (en torno a un tercio de los criterios de WCAG); un 100 no significa que la página sea accesible, sino que no tiene los problemas que axe encuentra.

## Exportar

### Markdown

`reporteMarkdown()` en `auditor/exportar.ts` arma:

1. Página, fecha, puntaje, la fórmula en una línea y la herramienta (axe-core, WCAG 2.2 A y AA).
2. Una sección por gravedad con cada problema: descripción, regla con enlace, criterios WCAG, y cada ubicación con su fragmento.
3. Si se corrigió: la explicación y el estado de cada corrección. El código corregido **solo aparece si la corrección quedó verificada como resuelta**.
4. Si se corrigió el documento: puntaje antes → después y problemas resueltos, sin resolver y nuevos.

El archivo se llama `a11lens-<página>.md`: `nombreArchivo()` pasa el nombre a minúsculas, quita acentos y deja solo letras, números y guiones.

### PDF

Con la impresión del navegador (*Guardar como PDF*), sobre estilos `@media print` de `/app`: se ocultan la barra, la entrada, la lente, la sección de guardar, los botones, la columna de recomendaciones y la insignia del pie; quedan el resultado, los problemas, las correcciones y el diff. El código de las propuestas sin solución verificada sigue dentro de su `<details>` cerrado. Ver [ADR 0008](decisiones/0008-pdf-con-impresion-del-navegador.md).

### HTML corregido

El HTML original con **solo las correcciones verificadas** aplicadas en su lugar (el resto queda byte a byte igual), como `a11lens-<página>-corregido.html`. Su puntaje verificado se ve en «Corregir con IA» antes de descargarlo.
