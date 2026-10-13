# Arquitectura del frontend

Angular 22 con componentes standalone, signals y `ChangeDetectionStrategy.OnPush` en todos los componentes. Sin SSR ni librerías de UI: CSS plano. La única dependencia extra es `axe-core`, que se carga bajo demanda.

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
    services/api.service.ts   /health, /items y /ia
    lente/                 la herramienta: inspeccion.ts, app-margen y app-auditoria (axe-core)
    ui/                    componentes base (botón, campos, medidor, alerta, avatar, íconos, tema)
    layouts/auth-layout/   plantilla de acceso: hoja con formulario y margen de anotaciones
    pages/
      acceso/              login y registro (un solo componente)
      inicio/              /app como informe anotado
      guia/                /design con contraste medido en vivo
```

`lente/inspeccion.ts` lee el DOM real (nombre accesible, rol, estados, contraste, tamaño). `app-margen` no conoce el formulario: anota cualquier elemento enfocado dentro de su ámbito, así que sirve igual en el acceso, en `/app` y en `/design`. Es la misma inspección que el producto aplicará al HTML que pegue la persona.

`axe-core` se importa con `import('axe-core')` dentro de `app-auditoria`: queda en un chunk diferido (unos 160 kB comprimido) que solo se descarga al pulsar "Auditar esta página". Está en `allowedCommonJsDependencies` porque se publica como CommonJS.

## Rutas

| Ruta | Componente | Guard | Qué muestra |
|---|---|---|---|
| `/` | — | — | Redirige a `/app` con sesión o a `/login` sin ella |
| `/login`, `/registro` | `Acceso` (carga diferida) | `invitadoGuard` | Un solo componente para los dos: el modo llega como input desde la URL (`rutaAcceso`), así el cambio no recarga la página |
| `/app` | `Inicio` (carga diferida) | `authGuard` | Bienvenida, lista de verificación del sistema, registros e IA, con el margen de anotaciones |
| `/design` | `Guia` (carga diferida) | — | Guía de estilo viva. No se enlaza desde la app |
| `**` | — | — | Redirige a `/` |

`withComponentInputBinding()` pasa `modo` y `?sesion=expirada` como inputs del componente.

## Servicios

| Archivo | Qué hace |
|---|---|
| `core/auth.service.ts` | `login`, `registrar`, `refrescarUsuario` y `cerrarSesion`. Guarda token y usuario en `localStorage` (con `try/catch`: en modo privado la sesión dura la pestaña) y los expone como signals. `estaAutenticado()` revisa la expiración del JWT en cada navegación. |
| `services/api.service.ts` | `estado()` (`GET /health`), `listar`, `crear` y `eliminar` items, `preguntarIA`. |
| `core/tema.service.ts` | Tema claro u oscuro. La primera vez sigue al sistema; después recuerda la elección. Aplica `data-theme` en `<html>` dentro de una View Transition. |
| `core/errores.ts` | `mapearError(err, contexto)`: el único lugar donde las respuestas del backend se convierten en mensajes (0, 400, 401, 409, 429, 502, 5xx). |
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

## Configuración

- Puerto fijo 4202 en `angular.json` (los tres proyectos corren a la vez).
- `allowedCommonJsDependencies: ["axe-core"]`.
- Budgets de producción: inicial 500 kB (aviso) y 1 MB (error); estilos por componente 8 kB (aviso) y 12 kB (error). El bundle inicial pesa unos 290 kB (81 kB comprimido); axe-core no cuenta porque es diferido.
- `vercel.json` reescribe todas las rutas a `index.html`.
