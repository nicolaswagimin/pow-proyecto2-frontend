# 0009 · CSP con recursos https y `<base href>` para las páginas por URL

- **Estado:** aceptada · **Fecha:** 2026-10-17
- Ajuste pedido al aprobar el plan.

## Contexto
Una página descargada por URL casi nunca trae sus estilos dentro: los enlaza (`<link href="/css/sitio.css">`) y usa fuentes e imágenes externas. Con una CSP `default-src 'none'` estricta, o con rutas relativas resolviendo contra `about:srcdoc`, la vista previa sale sin estilos y **el contraste se mide sobre colores que la página real no tiene**: falsos positivos y falsos negativos.

## Decisión
La CSP del iframe permite cargar, pero no ejecutar:

| Directiva | Valor | Por qué |
|---|---|---|
| `default-src` | `'none'` | Todo lo no listado queda bloqueado (incluidos `connect-src`, `frame-src`, `form-action`…) |
| `script-src` | `'nonce-X'` | Solo axe y el corredor |
| `style-src` | `https: 'unsafe-inline'` | Hojas de estilo externas por https y los `<style>` y `style=""` de la página |
| `font-src` | `https: data:` | Fuentes externas e incrustadas: cambian el tamaño y el contraste del texto |
| `img-src` | `https: data:` | Imágenes externas e incrustadas |
| `media-src` | `https: data:` | Video y audio, para las reglas de subtítulos |

Para las páginas por URL se agrega `<base href="URL final">` (después de las redirecciones) al principio del `<head>`, tras la CSP. El `<base>` que traiga la propia página se elimina al sanear. Los scripts propios usan URL absoluta, así que la base no los afecta.

`<meta http-equiv>` de la página (incluido `refresh`) se elimina: un `refresh` navegaría el iframe a otra dirección y otro `Content-Security-Policy` podría pisar el nuestro.

## Consecuencias
- El contraste se calcula con los estilos reales de la página.
- `'unsafe-inline'` en estilos permite CSS arbitrario de la página, pero solo dentro del iframe; CSS no ejecuta código y el sandbox impide navegar o enviar formularios.
- La vista previa hace peticiones a los servidores de la página desde el navegador de la persona (como al visitarla). Salen desde un documento con origen opaco, como peticiones de terceros: la app no puede leer sus respuestas.
- Recursos `http:` no cargan (contenido mixto); las páginas que dependan de ellos se verán sin esos estilos.
