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

Abre <http://localhost:4200>. Arriba verás tres indicadores (Backend, Base de datos, IA):
verde = funciona, rojo = hay que revisar algo (la página te dice qué).

Para compilar la versión de producción:

```bash
npm run build      # genera dist/pow-proyecto2-frontend/browser
```

## Entornos (URL del backend)

| Archivo                                         | Se usa con             | `apiUrl`                                |
| ----------------------------------------------- | ---------------------- | --------------------------------------- |
| `src/environments/environment.development.ts`   | `ng serve` (local)     | `http://localhost:3002/api`             |
| `src/environments/environment.ts`               | `ng build` (producción) | `https://TU-BACKEND.onrender.com/api`  |

El reemplazo lo hace `fileReplacements` en `angular.json`. **Antes de desplegar**, cambia
`TU-BACKEND` en `environment.ts` por la URL real de tu servicio en Render.

## Desplegar en Vercel

1. Despliega primero el backend en Render y pon su URL en `src/environments/environment.ts`. Haz commit y push.
2. En <https://vercel.com> crea un **New Project** e importa este repositorio.
3. Configura:
   - **Framework Preset:** Angular
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist/pow-proyecto2-frontend/browser`
4. Despliega y copia la URL que te da Vercel (por ejemplo `https://pow-proyecto2.vercel.app`).
5. En Render, agrega esa URL a la variable `FRONTEND_URL` del backend (sin `/` al final) para que CORS la permita.

## Estructura

```
src/
├── app/
│   ├── app.ts / app.html / app.css   ← componente principal (única pantalla)
│   ├── app.config.ts                 ← provideHttpClient
│   └── services/api.service.ts       ← llamadas al backend
├── environments/                     ← URL del backend por entorno
├── index.html                        ← título de la pestaña
└── styles.css                        ← estilos globales y colores (modo claro/oscuro)
```

## Qué cambiar al adaptar el tema

- **`src/app/services/api.service.ts`**: la interfaz `Item` y las rutas si renombras `/items` en el backend.
- **`src/app/app.ts`**: la constante `nombre` y los campos del formulario (`titulo`, `descripcion`).
- **`src/app/app.html`**: textos, campos del formulario y cómo se muestra cada registro.
- **`src/styles.css`**: los colores de `:root` (claro) y del bloque `prefers-color-scheme: dark` (oscuro).
- **`src/index.html`**: el `<title>` de la pestaña.
- **`src/environments/environment.ts`**: la URL de tu backend en producción.
