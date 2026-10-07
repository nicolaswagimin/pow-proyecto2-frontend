# Proyecto 2 · Frontend

Interfaz base en **Angular** (componentes standalone, signals, sin SSR, CSS plano) que se conecta al backend
del Proyecto 2 para mostrar el estado del sistema, gestionar registros y hacer preguntas a la IA.
Materia: Programación orientada a la web.

Backend asociado: <https://github.com/nicolaswagimin/pow-proyecto2-backend>

## Requisitos

- Node.js 22.22.3+ o 24.15+ (lo exige Angular 22). En Vercel: *Settings → Build and Deployment → Node.js Version* en 22.x o superior.
- El backend corriendo en <http://localhost:3002>

## Correr en local

```bash
npm install
npm start          # equivale a ng serve
```

Abre <http://localhost:4202> (el puerto está fijo en `angular.json`, así los tres proyectos pueden correr a la vez). Arriba verás tres indicadores (Backend, Base de datos, IA):
verde = funciona, rojo = hay que revisar algo (la página te dice qué).

Para compilar la versión de producción:

```bash
npm run build      # genera dist/pow-proyecto2-frontend/browser
```

## Entornos (URL del backend)

| Archivo                                         | Se usa con             | `apiUrl`                                |
| ----------------------------------------------- | ---------------------- | --------------------------------------- |
| `src/environments/environment.development.ts`   | `ng serve` (local)     | `http://localhost:3002/api`             |
| `src/environments/environment.ts`               | `ng build` (producción) | `https://pow-proyecto2-backend.onrender.com/api` |

El reemplazo lo hace `fileReplacements` en `angular.json`. Si el servicio de Render tiene otro nombre,
cambia la URL de `environment.ts` antes de desplegar.

## Desplegar en Vercel

1. Despliega primero el backend en Render como `pow-proyecto2-backend` (la URL ya está en `src/environments/environment.ts`).
2. En <https://vercel.com> crea un **New Project** e importa este repositorio.
3. Configura:
   - **Framework Preset:** Angular
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/pow-proyecto2-frontend/browser`
4. Despliega y copia la URL que te da Vercel (por ejemplo `https://pow-proyecto2.vercel.app`).
5. En Render, agrega esa URL a la variable `FRONTEND_URL` del backend (sin `/` al final) para que CORS la permita.

`vercel.json` reescribe todas las rutas a `/index.html`, así que recargar `/login` o `/app` no da 404.

## Rutas y sesión

| Ruta        | Qué muestra                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `/`         | Redirige a `/app` si hay sesión, o a `/login` si no.                         |
| `/login`    | Inicio de sesión (correo y contraseña).                                     |
| `/registro` | Crear cuenta. Comparte componente con `/login`: el cambio es una animación. |
| `/app`      | Protegida. Registros e IA del usuario, con su avatar y Cerrar sesión.       |
| `/design`   | Guía de estilo viva: tokens y componentes en todos sus estados.             |

- `AuthService` (`src/app/core/auth.service.ts`) guarda el token y el usuario en `localStorage` y los expone como signals.
- El interceptor (`src/app/core/auth.interceptor.ts`) agrega `Authorization: Bearer <token>` a cada petición al backend.
  Si una ruta protegida responde `401`, cierra la sesión y lleva a `/login?sesion=expirada`.
- Los mensajes de error del backend se traducen en un solo lugar: `src/app/core/errores.ts`.

## Estructura

```
src/
  styles/tokens.css     colores, tipografía, espacios y tiempos (único archivo para re-tematizar)
  styles/base.css       reset, foco visible, movimiento reducido, transición de tema
  app/core/             sesión, guards, interceptor, tema, errores, fortaleza de contraseña
  app/ui/               componentes base (botón, campos, alerta, avatar, íconos, tema)
  app/fx/               efectos: formas geométricas en parallax y confeti con sello
  app/layouts/          auth-layout: póster, formas y tarjeta 3D con giro de dos caras
  app/pages/            acceso (login/registro), inicio (/app) y guía (/design)
docs/brief-diseno.md    dirección visual "Constructiva"
```

## Qué cambiar al adaptar el tema

- **`src/styles/tokens.css`**: colores (claro y oscuro), tipografías, radios y tiempos. Las formas y el confeti usan estos colores.
- **`src/index.html`**: el `<title>` de la pestaña y las fuentes de Google Fonts si cambias de familia.
- **`src/app/config.ts`**: `APP_NOMBRE`, el nombre que aparece en la cabecera y en los títulos.
- **`src/app/pages/acceso/acceso.ts`**: los textos de login y registro (`TEXTOS`); el titular del póster está en `src/app/layouts/auth-layout/auth-layout.ts` (`POSTER`).
- **`src/app/services/api.service.ts`**: la interfaz `Item` y las rutas si renombras `/items` en el backend.
- **`src/app/pages/inicio/`**: los campos del formulario (`titulo`, `descripcion`) y cómo se muestra cada registro.
- **`src/environments/environment.ts`**: la URL de tu backend en producción.
