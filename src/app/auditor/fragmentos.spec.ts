import { FuenteHtml, analizarFuente, elegirFragmento } from './fragmentos';

// El texto del rango debe ser literal: es lo que se reemplaza en el HTML original.
function texto(fuente: FuenteHtml, r: { inicio: number; fin: number } | undefined): string {
  return r ? fuente.html.slice(r.inicio, r.fin) : '';
}

const PAGINA = `<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="30">
  <title>Tienda  de prueba</title>
  <script>var x = '<img>';</script>
</head>
<body>
  <noscript><img src="sin-js.png"></noscript>
  <header><a href="/" data-x='a > b'><img src="logo.png" class=logo></a></header>
  <script src="app.js"></script>
  <main>
    <p>uno<p>dos <img src="dos.png">
    <div><iframe src="mapa.html"></iframe><button type="button"></button></div>
  </main>
</body>
</html>`;

describe('analizarFuente', () => {
  let fuente: FuenteHtml;
  beforeAll(async () => {
    fuente = await analizarFuente(PAGINA);
  });

  it('lee el idioma y el título de la página', () => {
    expect(fuente.idioma).toBe('es');
    expect(fuente.titulo).toBe('Tienda de prueba');
  });

  it('ubica un elemento por su ruta, saltando lo que quita el saneador (script, noscript, meta refresh)', () => {
    // html → body (1) → header (0, el noscript no cuenta) → a (0) → img (0)
    const img = fuente.ubicar([1, 0, 0, 0], 'img');
    expect(texto(fuente, img?.elemento)).toBe('<img src="logo.png" class=logo>');
    expect(texto(fuente, img?.apertura)).toBe('<img src="logo.png" class=logo>');
  });

  it('respeta comillas simples y ">" dentro de un atributo', () => {
    const a = fuente.ubicar([1, 0, 0], 'a');
    expect(texto(fuente, a?.apertura)).toBe(`<a href="/" data-x='a > b'>`);
    expect(texto(fuente, a?.elemento)).toBe(
      `<a href="/" data-x='a > b'><img src="logo.png" class=logo></a>`,
    );
  });

  it('un <p> sin cierre termina donde lo cierra el parser', () => {
    // main es body > (header 0, main 1); el script entre ellos no cuenta
    const p = fuente.ubicar([1, 1, 1], 'p');
    expect(texto(fuente, p?.elemento)).toBe('<p>dos <img src="dos.png">\n    ');
    const img = fuente.ubicar([1, 1, 1, 0], 'img');
    expect(texto(fuente, img?.elemento)).toBe('<img src="dos.png">');
  });

  it('el iframe no cuenta: el botón es el primer hijo del div', () => {
    expect(texto(fuente, fuente.ubicar([1, 1, 2, 0], 'button')?.elemento)).toBe(
      '<button type="button"></button>',
    );
  });

  it('la huella del elemento es la misma que calcula el corredor', async () => {
    const f = await analizarFuente(
      '<main><p>a</p><img class="foto" src="a.png" onerror="x()" alt=""><p>b</p></main>',
    );
    expect(f.huella([1, 0, 1])).toBe('alt=\nclass=foto\nsrc=a.png|0|3');
  });

  it('con la huella, una ruta que cae en otro elemento de la misma etiqueta no se ubica', async () => {
    // En modo quirks (sin doctype) <p><table> anida; el iframe (con doctype) cierra el <p>. La ruta
    // del #a en el iframe es [1, 0, 3], que en el original es el #c: misma etiqueta, otro elemento.
    const quirks = await analizarFuente(
      '<div><p>x<table><tr><td>t</td></tr></table></p><img id=a><img id=b><img id=c><img id=d></div>',
    );
    expect(quirks.ubicar([1, 0, 3], 'img')?.elemento).toBeDefined();
    expect(quirks.ubicar([1, 0, 3], 'img', 'id=a|0|7')).toBeNull();
    expect(texto(quirks, quirks.ubicar([1, 0, 3], 'img', 'id=c|0|5')?.elemento)).toBe('<img id=c>');
  });

  it('los elementos de la página con data-a11lens no cuentan (el corredor tampoco los cuenta)', async () => {
    const f = await analizarFuente('<main><span data-a11lens="">x</span><img src="a.png"></main>');
    expect(texto(f, f.ubicar([1, 0, 0], 'img')?.elemento)).toBe('<img src="a.png">');
  });

  it('si la etiqueta no coincide, o no hay ruta, no se ubica', () => {
    expect(fuente.ubicar([1, 0, 0, 0], 'button')).toBeNull();
    expect(fuente.ubicar(null, 'img')).toBeNull();
    expect(fuente.ubicar(undefined, 'img')).toBeNull();
    expect(fuente.ubicar([9, 9], 'img')).toBeNull();
  });

  it('un elemento implícito (sin etiqueta en la fuente) no se ubica', async () => {
    const sinHtml = await analizarFuente('<title>x</title><p>hola</p>');
    expect(sinHtml.ubicar([], 'html')).toBeNull();
    expect(texto(sinHtml, sinHtml.ubicar([1, 0], 'p')?.elemento)).toBe('<p>hola</p>');
  });

  it('da la apertura del padre como contexto (recortada)', () => {
    expect(fuente.aperturaPadre([1, 0, 0, 0])).toBe(`<a href="/" data-x='a > b'>`);
    expect(fuente.aperturaPadre([])).toBe('');
  });

  it('ubica el <head> para agregar un <title>', () => {
    expect(texto(fuente, fuente.head()?.apertura)).toBe('<head>');
  });
});

describe('elegirFragmento', () => {
  let fuente: FuenteHtml;
  beforeAll(async () => {
    fuente = await analizarFuente(PAGINA);
  });

  it('un elemento corto sin otros problemas dentro va completo', () => {
    const boton = fuente.ubicar([1, 1, 2, 0], 'button')!;
    expect(elegirFragmento(fuente, 'button-name', boton, [])).toMatchObject({
      tipo: 'elemento',
      texto: '<button type="button"></button>',
    });
  });

  it('si contiene otro elemento con problemas, va solo su apertura', () => {
    const a = fuente.ubicar([1, 0, 0], 'a')!;
    const img = fuente.ubicar([1, 0, 0, 0], 'img')!;
    expect(elegirFragmento(fuente, 'link-name', a, [img.elemento])).toMatchObject({
      tipo: 'apertura',
      texto: `<a href="/" data-x='a > b'>`,
    });
  });

  it('un elemento de más de 1500 caracteres va solo con su apertura', async () => {
    const largo = await analizarFuente(
      `<main><div style="color:#999">${'texto '.repeat(400)}</div></main>`,
    );
    const div = largo.ubicar([1, 0, 0], 'div')!;
    expect(elegirFragmento(largo, 'color-contrast', div, [])).toMatchObject({
      tipo: 'apertura',
      texto: '<div style="color:#999">',
    });
  });

  it('html, head y body van siempre con su apertura', () => {
    const body = fuente.ubicar([1], 'body')!;
    expect(elegirFragmento(fuente, 'region', body, [])).toMatchObject({
      tipo: 'apertura',
      texto: '<body>',
    });
  });

  it('document-title usa la apertura del <head>', async () => {
    const sinTitulo = await analizarFuente(
      '<html lang="es"><head><meta charset="utf-8"></head><body></body></html>',
    );
    const html = sinTitulo.ubicar([], 'html')!;
    expect(elegirFragmento(sinTitulo, 'document-title', html, [])).toMatchObject({
      tipo: 'apertura',
      texto: '<head>',
    });
  });

  it('document-title funciona aunque el <html> sea implícito', async () => {
    const implicito = await analizarFuente('<head><meta charset="utf-8"></head><p>x</p>');
    expect(elegirFragmento(implicito, 'document-title', null, [])).toMatchObject({
      texto: '<head>',
    });
  });

  it('sin elemento ubicado (y no es document-title) no hay fragmento', () => {
    expect(elegirFragmento(fuente, 'image-alt', null, [])).toBeNull();
  });

  it('document-title sin <head> escrito no tiene fragmento', async () => {
    const sinHead = await analizarFuente('<html lang="es"><body></body></html>');
    expect(elegirFragmento(sinHead, 'document-title', sinHead.ubicar([], 'html')!, [])).toBeNull();
  });
});
