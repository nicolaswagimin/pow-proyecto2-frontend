# a11Lens · Frontend

**a11Lens** es un autocorrector de accesibilidad web: pegas HTML (o una URL), la app detecta los problemas con axe-core, los explica en lenguaje simple y la IA propone el código corregido. La propia app cumple WCAG 2.2 AA, con el texto principal en AAA.

Proyecto 2 de la materia Programación orientada a la web. Angular 22 (standalone, signals, sin SSR, CSS plano) y axe-core cargado bajo demanda.

Backend: <https://github.com/nicolaswagimin/pow-proyecto2-backend>

## Capturas

El acceso es una demostración del producto: al enfocar cualquier campo, el margen lo anota con su nombre accesible, rol, estados, contraste y tamaño, leídos del DOM real, y con lo que diría un lector de pantalla. "Auditar esta página" corre axe-core sobre el propio login.

| | Claro | Oscuro |
|---|---|---|
| Acceso, escritorio | ![Acceso en escritorio, modo claro](docs/capturas/login-escritorio-claro.png) | ![Acceso en escritorio, modo oscuro](docs/capturas/login-escritorio-oscuro.png) |
| `/app`, escritorio | ![App en escritorio, modo claro](docs/capturas/app-escritorio-claro.png) | ![App en escritorio, modo oscuro](docs/capturas/app-escritorio-oscuro.png) |
| Acceso, móvil | <img src="docs/capturas/login-movil-claro.png" alt="Acceso en móvil, modo claro" width="260"> | <img src="docs/capturas/login-movil-oscuro.png" alt="Acceso en móvil, modo oscuro" width="260"> |
| `/app`, móvil | <img src="docs/capturas/app-movil-claro.png" alt="App en móvil, modo claro" width="260"> | <img src="docs/capturas/app-movil-oscuro.png" alt="App en móvil, modo oscuro" width="260"> |

## Requisitos

- Node.js 22.22.3+ o 24.15+ (lo exige Angular 22). En Vercel: *Settings → Build and Deployment → Node.js Version* en 22.x o superior.
- El backend corriendo en <http://localhost:3002>.

## Correr en local

```bash
npm install
npm start          # ng serve en http://localhost:4202
```

El puerto está fijo en `angular.json`, así los tres proyectos pueden correr a la vez (desde la carpeta raíz, `./demo.sh` arranca todo).

Para compilar la versión de producción:

```bash
npm run build      # genera dist/pow-proyecto2-frontend/browser
```

## Rutas

| Ruta | Qué muestra |
|---|---|
| `/` | Redirige a `/app` si hay sesión, o a `/login` si no. |
| `/login` | Inicio de sesión con el margen de anotaciones. |
| `/registro` | Crear cuenta. Comparte componente con `/login`. |
| `/app` | Protegida. Informe anotado: estado del sistema, registros e IA. |
| `/design` | Guía de estilo viva: contraste de cada token medido en vivo y componentes. |

## Entornos (URL del backend)

| Archivo | Se usa con | `apiUrl` |
|---|---|---|
| `src/environments/environment.development.ts` | `ng serve` (local) | `http://localhost:3002/api` |
| `src/environments/environment.ts` | `ng build` (producción) | `https://pow-proyecto2-backend.onrender.com/api` |

## Desplegar en Vercel

1. Despliega primero el backend en Render como `pow-proyecto2-backend`.
2. En <https://vercel.com> crea un **New Project** e importa este repositorio.
3. Configura **Framework Preset:** Angular, **Build Command:** `npm run build`, **Output Directory:** `dist/pow-proyecto2-frontend/browser`.
4. Agrega la URL de Vercel a `FRONTEND_URL` del backend en Render (sin `/` final) para que CORS la permita.

`vercel.json` reescribe todas las rutas a `/index.html`, así que recargar `/login` o `/app` no da 404.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/brief-diseno.md](docs/brief-diseno.md) | Concepto "Margen anotado", demostración del login, direcciones descartadas |
| [docs/design-system.md](docs/design-system.md) | Tokens de color (con contraste), anillo de foco, tipografía, espaciado, radios, sombras y movimiento |
| [docs/componentes.md](docs/componentes.md) | Cada componente con sus inputs, outputs y estados |
| [docs/animaciones.md](docs/animaciones.md) | Qué comunica cada animación y cómo se reduce |
| [docs/accesibilidad.md](docs/accesibilidad.md) | Decisiones de accesibilidad y resultado de axe |
| [docs/arquitectura-frontend.md](docs/arquitectura-frontend.md) | Carpetas, rutas, servicios, guards, interceptor y flujo de un login |
| [docs/decisiones/](docs/decisiones/) | ADR: la lente es el foco, anotaciones del DOM real, Atkinson, axe-core bajo demanda, movimiento solo como respuesta |
| [CHANGELOG.md](CHANGELOG.md) | Cambios agrupados |

## Estructura

```
src/
  styles/tokens.css     todos los tokens de diseño
  app/core/             sesión, guards, interceptor, tema, errores, fortaleza
  app/lente/            inspección del DOM, margen de anotaciones y auditoría con axe-core
  app/ui/               componentes base
  app/layouts/          auth-layout: hoja con formulario y margen
  app/pages/            acceso, inicio (/app) y guía (/design)
```
