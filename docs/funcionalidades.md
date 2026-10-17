# Funcionalidades

Qué puede hacer una persona en a11Lens, de principio a fin. Todo vive en `/app` salvo el historial (`/historial`). Las dos rutas exigen sesión.

## 1. Auditar

Tres formas de entrada, en pestañas (se cambian también con las flechas del teclado):

| Pestaña | Qué hace | Límites |
|---|---|---|
| **Pegar HTML** | Un documento completo o un fragmento. Nombre de la página opcional. | 2 MB |
| **Subir archivo** | Un `.html` o `.htm` del equipo. Se lee en el navegador, no se sube al servidor. | 2 MB |
| **URL** | El backend descarga la página con protección contra SSRF (`POST /api/paginas/descargar`). | http/https, puertos 80/443, 8 s, 2 MB |

axe-core corre **en el navegador**, dentro de un iframe aislado donde los scripts de la página nunca se ejecutan (ver [lente.md](lente.md) y [ADR 0006](decisiones/0006-axe-en-iframe-con-csp-y-nonce.md)). Por eso pegar HTML y subir un archivo funcionan aunque el backend esté apagado.

En un fragmento (sin `<html>`) se desactivan las reglas que solo tienen sentido en un documento completo: idioma, título, regiones, `h1` y salto al contenido.

**Aviso de SPA.** Si la página parece necesitar JavaScript para mostrarse (body casi sin texto con un contenedor típico como `#root`, `#app` o `app-root`, o casi solo scripts), aparece una alerta: a11Lens auditaría una página casi vacía; conviene pegar el HTML ya renderizado (en el navegador: *Inspeccionar → Copiar outerHTML* de `<html>`).

## 2. Resultado

- **Puntaje de 0 a 100** con su calificación (Excelente, Bueno, Necesita mejoras, Deficiente) y el conteo por gravedad.
- **«¿Cómo se calcula?»**: un `<details>` con la fórmula (ver [reporte.md](reporte.md)).
- **Problemas agrupados por gravedad** (crítico, serio, moderado, menor). Cada uno lleva:
  - descripción en español,
  - regla de axe y enlace a su documentación,
  - criterio WCAG con número, nombre oficial y nivel (por ejemplo, *1.4.3 Contraste (mínimo) · AA*),
  - cada elemento afectado con su selector y su fragmento de HTML,
  - el botón **«Ver en la lente»** (`aria-pressed`).

## 3. Lente

La página tal como se ve, con los elementos con problemas contorneados. Sincronizada en los dos sentidos:

- «Ver en la lente» en la lista → el elemento se resalta con más fuerza y se desplaza al centro de la vista previa.
- Clic en un elemento resaltado de la vista previa → se selecciona su problema y el foco va a su botón en la lista.

En la vista previa no se navega ni se envía nada: todos los clics y envíos se detienen. Todo lo de la lente se puede hacer también desde la lista, así que el iframe no es obligatorio para usar la app con teclado o lector de pantalla.

## 4. Corregir con IA

«Corregir con IA» manda el HTML y hasta 30 problemas a `POST /api/ia/corregir`. Gemini devuelve, por problema, una explicación en lenguaje simple y el fragmento corregido, más el documento completo corregido.

**Nada se muestra como solución sin verificarlo** ([ADR 0007](decisiones/0007-verificar-antes-de-mostrar.md)). Cada corrección se aplica sola y se vuelve a auditar con axe:

| Estado | Cuándo |
|---|---|
| **Resuelto** | El par regla + selector desaparece, la regla afecta a menos elementos y no aparece ningún problema nuevo |
| Resolvió pero introdujo otros | Se resolvió, pero aparecieron problemas que antes no estaban |
| No resolvió | El problema sigue |
| No se pudo aplicar | El fragmento original no está en el HTML |

Las verificadas aparecen primero, con su explicación y el código. Las demás quedan dentro de un `<details>` cerrado, «Propuestas que no pasaron la verificación», con el motivo; su código no se ofrece como solución.

El documento completo también se vuelve a auditar: se muestran el puntaje antes → después y cuántos problemas se resolvieron, siguen y aparecieron.

**Cuota de Gemini.** La misma entrada no se vuelve a pedir: el frontend no repite la llamada si nada cambió, y el backend guarda las respuestas en caché. Si la cuota se agota, el mensaje lo dice claramente (`429`). Un progreso visible («Verificando la corrección 2 de 5…») acompaña la espera.

## 5. Antes y después

Diff del HTML original contra el documento corregido, lado a lado, con las líneas quitadas (−) y agregadas (+) marcadas con símbolo y no solo con color.

## 6. Guardar y exportar

| Acción | Resultado |
|---|---|
| **Guardar en el historial** | `POST /api/auditorias` con el HTML, el puntaje, los problemas y, si hay, el HTML corregido y su puntaje |
| **Reporte en Markdown** | `a11lens-<página>.md` con puntaje, fórmula, problemas por gravedad, criterios, ubicaciones y correcciones con su estado |
| **Reporte en PDF** | La impresión del navegador sobre una vista de impresión que deja solo el reporte ([ADR 0008](decisiones/0008-pdf-con-impresion-del-navegador.md)) |
| **Descargar HTML corregido** | `a11lens-<página>-corregido.html`, el documento que devolvió la IA |

## 7. Historial

`/historial` agrupa las auditorías guardadas por página. Cada grupo muestra:

- el último puntaje y la evolución de todos (gráfico de línea con su tabla de datos equivalente),
- cada auditoría con fecha, origen, puntaje y, si se corrigió, el puntaje corregido,
- **Abrir**: vuelve a `/app?auditoria=<id>` y re-audita ese HTML (la lente necesita los resultados vivos),
- **Borrar**, con confirmación.
