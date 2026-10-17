// Qué hacer con cada regla de axe, en español y en una frase. Es el texto fijo de la columna de
// recomendaciones; la explicación de la IA, si ya se pidió, lo complementa.

const QUE_HACER: Record<string, string> = {
  'image-alt':
    'Agrega un atributo alt que diga qué muestra la imagen, o alt="" si es solo decorativa.',
  'input-image-alt': 'Agrega un alt al botón de imagen que diga qué hace («Buscar», «Enviar»).',
  'area-alt': 'Da a cada <area> del mapa un alt que diga a dónde lleva.',
  'svg-img-alt': 'Agrega un <title> dentro del SVG o un aria-label que diga qué representa.',
  'role-img-alt': 'Agrega un aria-label que diga qué representa la imagen.',
  'button-name': 'Escribe un texto dentro del botón o agrega un aria-label que diga qué hace.',
  'link-name': 'Escribe un texto dentro del enlace que diga a dónde lleva (o un aria-label).',
  label: 'Asocia un <label> al campo (for + id) o agrega un aria-label.',
  'select-name': 'Asocia un <label> a la lista desplegable (for + id).',
  'color-contrast':
    'Oscurece el texto o aclara el fondo hasta llegar a 4.5:1 (3:1 si el texto es grande).',
  'html-has-lang': 'Agrega lang al <html> con el idioma de la página, por ejemplo lang="es".',
  'html-lang-valid': 'Usa un código de idioma válido en <html lang>, como "es" o "en".',
  'valid-lang': 'Corrige el atributo lang de ese fragmento con un código válido.',
  'document-title': 'Agrega un <title> dentro del <head> que diga de qué trata la página.',
  'frame-title': 'Agrega un title al iframe que diga qué contiene.',
  'heading-order': 'Usa el nivel de encabezado siguiente (h2 después de h1, h3 después de h2).',
  'empty-heading': 'Escribe el texto del encabezado o quítalo si no titula nada.',
  'page-has-heading-one': 'Agrega un <h1> con el título principal de la página.',
  'landmark-one-main': 'Envuelve el contenido principal en un <main>.',
  region: 'Coloca este contenido dentro de una región: <header>, <nav>, <main> o <footer>.',
  list: 'Deja dentro de <ul> u <ol> solo elementos <li>.',
  listitem: 'Coloca los <li> dentro de un <ul> o un <ol>.',
  'duplicate-id-aria': 'Cambia uno de los ids repetidos: cada id debe ser único.',
  'aria-allowed-attr': 'Quita los atributos aria-* que ese rol no admite.',
  'aria-required-attr': 'Agrega los atributos aria-* que exige el rol (por ejemplo aria-checked).',
  'aria-valid-attr': 'Corrige el nombre del atributo aria-*: ese no existe.',
  'aria-valid-attr-value': 'Corrige el valor del atributo aria-* (por ejemplo, un id que exista).',
  'aria-roles': 'Usa un rol ARIA válido o quita el atributo role.',
  'aria-hidden-focus':
    'Quita aria-hidden o saca los controles del orden de tabulación (tabindex="-1").',
  'nested-interactive': 'No pongas un control dentro de otro: sepáralos.',
  'meta-viewport': 'Quita user-scalable=no y maximum-scale del meta viewport.',
  'link-in-text-block': 'Subraya el enlace o distínguelo del texto con algo más que el color.',
  'target-size': 'Haz el control de al menos 24 × 24 píxeles o sepáralo de los vecinos.',
  tabindex: 'Usa tabindex="0" o "-1"; los valores mayores alteran el orden del teclado.',
  'autocomplete-valid': 'Usa un valor de autocomplete válido, como "email" o "name".',
  'td-headers-attr': 'Haz que headers apunte a ids de encabezados de la misma tabla.',
  'th-has-data-cells': 'Quita el <th> sin celdas o agrega las celdas de datos que encabeza.',
  'video-caption': 'Agrega subtítulos con <track kind="captions">.',
  bypass: 'Agrega un enlace «Saltar al contenido» al principio, o regiones como <main>.',
};

const GENERAL = 'Revisa la guía de la regla en «Más información» y corrige el elemento señalado.';

export function queHacer(regla: string): string {
  return QUE_HACER[regla] ?? GENERAL;
}
