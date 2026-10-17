# Arquitectura del frontend

Angular 22 con componentes standalone, signals y `ChangeDetectionStrategy.OnPush` en todos los componentes. Sin SSR ni librerías de UI: CSS plano. La única dependencia extra es `axe-core`, que se usa de dos formas: bajo demanda en la herramienta «Auditar esta página» (`lente/`) y como archivo estático dentro del iframe aislado que audita el HTML de la persona (`auditor/`).

## Carpetas

```
src/
  index.html               título, idioma (es), fuentes (Atkinson Hyperlegible Next y Mono) y tema guardado antes de pintar
  main.ts                  arranque con appConfig
  styles.css               importa los tres archivos de styles/
  styles/
    tokens.css             todos los tokens de diseño (único archivo para re-tematizar)
    base.css               reset, anillo de foco doble, fuente de código, movimiento reducido
    utilities.css          .visually-hidden y .stack
  environments/            URL del backend en desarrollo y en producción
  app/
    app.config.ts          HttpClient con el interceptor y router con input binding
    app.routes.ts          rutas (ver abajo)
    config.ts              APP_NOMBRE = 'a11Lens'
    core/                  sesión, guards, interceptor, errores, tema, fortaleza, movimiento
    services/              paginas (descarga por URL), ia (corrección) y auditorias (historial)
    auditor/               el producto: auditar HTML ajeno, puntaje, verificación, diff y exportación
      aislar.ts            sanear() y documentoAislado(): HTML saneado + CSP con nonce + <base>
      motor.service.ts     MotorService (abrir, auditarHtml) y SesionAislada (postMessage)
      axe-a-problemas.ts   resultado de axe → Problema (gravedad, descripción en español, WCAG); pareceSpa()
      criterios-wcag.ts    criterios de WCAG 2.2 A y AA con su nombre en español
      puntaje.ts           fórmula del puntaje y calificación
      verificar.ts         aplica cada corrección y vuelve a auditar; compara antes y después
      diff.ts              diff por líneas (LCS entre los extremos iguales)
      exportar.ts          reporte en Markdown, nombres de archivo y descarga
      componentes/         entrada-html, puntaje, lista-problemas, lente, correcciones y diff-codigo
    lente/                 la herramienta sobre la propia app: inspeccion.ts, app-margen y app-auditoria
    ui/                    componentes base (botón, campos, medidor, alerta, avatar, íconos, tema)
    layouts/auth-layout/   plantilla de acceso: hoja con formulario y margen de anotaciones
    layouts/barra-app/     barra superior de /app e /historial (logo, Historial, tema, usuario, salir)
    pages/
      acceso/              login y registro (un solo componente)
      inicio/              /app: la auditoría (auditoria-estado.ts guarda el estado con signals)
      historial/           /historial: auditorías agrupadas por página (agrupar.ts)
      guia/                /design con contraste medido en vivo
```

`lente/inspeccion.ts` lee el DOM real (nombre accesible, rol, estados, contraste, tamaño). `app-margen` no conoce el formulario: anota cualquier elemento enfocado dentro de su ámbito, así que sirve igual en el acceso, en `/app` y en `/design`. Es la misma inspección que el producto aplicará al HTML que pegue la persona.

Fuera del iframe nadie toca el HTML de la persona: `public/auditor/corredor.js` corre dentro, junto a `auditor/axe.min.js` (copiado de `node_modules/axe-core` por `angular.json`), y habla con la app por `postMessage`. Detalle y protocolo en [lente.md](lente.md).

En la herramienta sobre la propia app, `axe-core` se importa con `import('axe-core')` dentro de `app-auditoria`: queda en un chunk diferido (unos 160 kB comprimido) que solo se descarga al pulsar "Auditar esta página". Está en `allowedCommonJsDependencies` porque se publica como CommonJS.

## Rutas

| Ruta | Componente | Guard | Qué muestra |
|---|---|---|---|
| `/` | — | — | Redirige a `/app` con sesión o a `/login` sin ella |
| `/login`, `/registro` | `Acceso` (carga diferida) | `invitadoGuard` | Un solo componente para los dos: el modo llega como input desde la URL (`rutaAcceso`), así el cambio no recarga la página |
| `/app` | `Inicio` (carga diferida) | `authGuard` | Auditar, resultado, lente, problemas, corrección con IA, antes y después, guardar y exportar. `?auditoria=<id>` abre una del historial |
| `/historial` | `Historial` (carga diferida) | `authGuard` | Auditorías guardadas agrupadas por página, con la evolución del puntaje |
| `/design` | `Guia` (carga diferida) | — | Guía de estilo viva. No se enlaza desde la app |
| `**` | — | — | Redirige a `/` |

`withComponentInputBinding()` pasa `modo` y `?sesion=expirada` como inputs del componente. `Inicio` lee `?auditoria` del `ActivatedRoute` al crearse.

## Servicios

| Archivo | Qué hace |
|---|---|
| `core/auth.service.ts` | `login`, `registrar`, `refrescarUsuario` y `cerrarSesion`. Guarda token y usuario en `localStorage` (con `try/catch`: en modo privado la sesión dura la pestaña) y los expone como signals. `estaAutenticado()` revisa la expiración del JWT en cada navegación. |
| `services/paginas.service.ts` | `descargar(url)` → `POST /paginas/descargar`. |
| `services/ia.service.ts` | `corregir(html, problemas)` → `POST /ia/corregir`. |
| `services/auditorias.service.ts` | `listar`, `obtener`, `guardar` y `eliminar` en `/auditorias`. |
| `pages/inicio/auditoria-estado.ts` | `AuditoriaEstado`, provisto en `Inicio`: entrada, auditoría, corrección con IA y su verificación, guardado y carga desde el historial. No repite la corrección si la entrada no cambió. |
| `core/tema.service.ts` | Tema claro u oscuro. La primera vez sigue al sistema; después recuerda la elección. Aplica `data-theme` en `<html>` dentro de una View Transition. |
| `core/errores.ts` | `mapearError(err, contexto)`: el único lugar donde las respuestas del backend se convierten en mensajes (0, 400, 401, 409, 413, 429, 502, 503, 5xx). |
| `core/fuerza.ts` | Nivel de fortaleza de una contraseña y su pista. |
| `core/movimiento.ts` | `prefiereMenosMovimiento()` y `leerToken()`. |

## Guards

- `authGuard`: deja pasar solo con sesión válida; si no, redirige a `/login`.
- `invitadoGuard`: login y registro son solo para quien no tiene sesión; con sesión, redirige a `/app`.

## Interceptor

`core/auth.interceptor.ts`:
1. Agrega `Authorization: Bearer <token>` a las peticiones al backend, salvo las públicas (`/auth/login`, `/auth/registro`, `/health`).
2. Si una ruta protegida responde 401, cierra la sesión y lleva a `/login?sesion=expirada`, donde el acceso muestra "Tu sesión expiró".

## Flujo de un login

1. `Acceso` valida el formulario. Si hay errores, enfoca el primer campo inválido y anuncia el resumen. El margen anota ese campo con "inválido" y su mensaje.
2. El botón pasa a cargando ("Iniciando sesión…", `aria-busy`).
3. `AuthService.login` hace `POST /api/auth/login`. Si tarda más de 4 s, aparece "El servidor está despertando" (Render gratuito).
4. Si sale bien, se guarda la sesión, se anuncia "Sesión iniciada. Entrando…" y se navega a `/app`.
5. Si sale mal, `mapearError` traduce el error: va junto al campo si el backend dice cuál, o en una alerta `role="alert"`.

## Flujo de una auditoría

1. `ui-entrada-html` emite el HTML pegado, el archivo o la URL. Con URL, `PaginasService` lo descarga por el backend.
2. `AuditoriaEstado.auditar` llama a `MotorService.auditarHtml`: iframe oculto, `listo`, `auditar`, `resultado`. `aProblemas` traduce el resultado y `calcularPuntaje` lo puntúa.
3. `ui-lente` abre su propia sesión con el mismo HTML para la vista previa; la selección viaja por `resaltar` y `enfocar`, y los clics vuelven por `clic`.
4. «Explicar y corregir»: `IaService.corregir`, luego `verificarPorProblema` para cada corrección y `verificarDocumento` para el documento completo, cada una en un iframe oculto nuevo.
5. «Guardar»: `AuditoriasService.guardar`. «Exportar»: `reporteMarkdown`, `window.print()` o el HTML corregido.

## Pruebas

`npm test` corre Vitest con jsdom (`@angular/build:unit-test`, configuración en `vitest-base.config.mts`): 105 pruebas de puntaje, criterios, saneado, aislamiento (el `sandbox` es exactamente `allow-scripts`), verificación, diff, exportación, estado de la auditoría, historial y cada componente. Lo que jsdom no puede hacer (render real, contraste, iframes) se verificó con Playwright sobre Chrome.

## Configuración

- Puerto fijo 4202 en `angular.json` (los tres proyectos corren a la vez).
- `allowedCommonJsDependencies: ["axe-core"]` y el asset `auditor/axe.min.js`.
- Budgets de producción: inicial 500 kB (aviso) y 1 MB (error); estilos por componente 8 kB (aviso) y 12 kB (error). El bundle inicial pesa unos 80 kB comprimido; axe-core no cuenta porque es diferido o un archivo estático.
- `vercel.json` reescribe todas las rutas a `index.html`.
