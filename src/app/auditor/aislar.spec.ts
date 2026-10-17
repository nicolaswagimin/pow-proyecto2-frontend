import { CSP_AISLADA, documentoAislado, esFragmento, sanear } from './aislar';

const parsear = (html: string) => new DOMParser().parseFromString(html, 'text/html');

describe('sanear', () => {
  const hostil = `<html lang="es"><head>
    <meta http-equiv="refresh" content="0;url=https://malo.example">
    <meta http-equiv="Content-Security-Policy" content="script-src *">
    <base href="https://malo.example/">
    <style>.a{color:red}</style>
  </head><body>
    <h1 onclick="alert(1)" onmouseover="x()">Título</h1>
    <script>alert(1)</script><noscript>sin js</noscript>
    <a href="  JaVaScRiPt:alert(1)">enlace</a><a href="/ok">bien</a>
    <img src="a.png" onerror="alert(1)">
    <iframe src="https://x.example"></iframe><object data="x"></object><embed src="x">
    <form action="javascript:alert(1)"><button formaction="javascript:x()">b</button></form>
    <div srcdoc="<script>">x</div>
  </body></html>`;
  const doc = parsear(sanear(hostil));

  it('quita scripts, noscript, marcos, objetos y embebidos', () => {
    expect(doc.querySelectorAll('script, noscript, iframe, object, embed').length).toBe(0);
  });
  it('quita meta refresh, cualquier meta http-equiv y el base del usuario', () => {
    expect(doc.querySelectorAll('meta[http-equiv], base').length).toBe(0);
  });
  it('quita los atributos on*', () => {
    expect(
      [...doc.querySelectorAll('*')].some((el) =>
        [...el.attributes].some((a) => a.name.startsWith('on')),
      ),
    ).toBe(false);
  });
  it('quita URLs javascript: de href, action y formaction', () => {
    expect(
      doc.querySelectorAll('[href^="javascript" i], form[action], button[formaction]').length,
    ).toBe(0);
    expect(doc.querySelector('a[href="/ok"]')).not.toBeNull();
  });
  it('quita srcdoc', () => expect(doc.querySelector('[srcdoc]')).toBeNull());
  it('conserva el contenido, los estilos y el idioma', () => {
    expect(doc.querySelector('h1')?.textContent).toBe('Título');
    expect(doc.querySelector('style')?.textContent).toContain('color:red');
    expect(doc.documentElement.lang).toBe('es');
  });
});

describe('documentoAislado', () => {
  const opciones = {
    nonce: 'abc123',
    sesion: 'tok3n',
    urlAxe: 'https://app.example/auditor/axe.min.js',
    urlCorredor: 'https://app.example/auditor/corredor.js',
  };

  it('agrega la CSP con el nonce: solo esos scripts, estilos, fuentes e imágenes https', () => {
    const doc = parsear(documentoAislado('<html><body><p>x</p></body></html>', opciones));
    const csp =
      doc.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') ??
      '';
    expect(csp).toBe(CSP_AISLADA('abc123'));
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'nonce-abc123'");
    expect(csp).toContain('style-src https:');
    expect(csp).toContain('img-src https: data:');
    expect(csp).toContain('font-src https: data:');
    expect(csp).not.toMatch(/script-src[^;]*(https:|\*|unsafe)/);
  });

  it('la CSP va antes que cualquier otro contenido del head', () => {
    const doc = parsear(
      documentoAislado(
        '<html><head><link rel="stylesheet" href="a.css"></head><body></body></html>',
        opciones,
      ),
    );
    expect(doc.head.firstElementChild?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
  });

  it('carga axe y el corredor con el nonce y URL absoluta', () => {
    const scripts = [...parsear(documentoAislado('<p>x</p>', opciones)).querySelectorAll('script')];
    expect(scripts.map((s) => [s.getAttribute('src'), s.getAttribute('nonce')])).toEqual([
      [opciones.urlAxe, 'abc123'],
      [opciones.urlCorredor, 'abc123'],
    ]);
  });

  it('con baseHref agrega <base> con la URL original', () => {
    const doc = parsear(
      documentoAislado('<html><head></head><body><img src="logo.png"></body></html>', {
        ...opciones,
        baseHref: 'https://ejemplo.org/docs/',
      }),
    );
    expect(doc.querySelectorAll('base').length).toBe(1);
    expect(doc.querySelector('base')?.getAttribute('href')).toBe('https://ejemplo.org/docs/');
  });

  it('sin baseHref no hay <base> (ni siquiera el del usuario)', () => {
    expect(
      parsear(
        documentoAislado('<base href="https://malo.example/"><p>x</p>', opciones),
      ).querySelector('base'),
    ).toBeNull();
  });

  it('marca los fragmentos para que el corredor omita las reglas de documento completo', () => {
    const corredor = (html: string) =>
      parsear(documentoAislado(html, opciones)).querySelectorAll('script')[1];
    expect(corredor('<p>solo un fragmento</p>').dataset['fragmento']).toBe('si');
    expect(
      corredor('<!doctype html><html lang="es"><body></body></html>').dataset['fragmento'],
    ).toBe('no');
  });
});

describe('esFragmento', () => {
  it('distingue documentos completos de fragmentos', () => {
    expect(esFragmento('<html lang="es"><body></body></html>')).toBe(false);
    expect(esFragmento('<!DOCTYPE html>\n<HTML>')).toBe(false);
    expect(esFragmento('<main><p>x</p></main>')).toBe(true);
  });
});

describe('mXSS: el documento final, tal como lo parsea el iframe, no trae nada peligroso', () => {
  const opciones = {
    nonce: 'n0nce',
    sesion: 'tok3n',
    urlAxe: 'https://app.example/auditor/axe.min.js',
    urlCorredor: 'https://app.example/auditor/corredor.js',
  };
  const cargas = [
    '<form><math><mtext></form><form><mglyph><style></math><meta http-equiv=refresh content="0;url=https://malo.example/x.html">',
    '<form><math><mtext></form><form><mglyph><style></math><img src onerror=alert(1)>',
    '<svg></p><style><a id="</style><img src=1 onerror=alert(1)>">',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  ];
  for (const carga of cargas) {
    it(`neutraliza ${carga.slice(0, 50)}…`, () => {
      const final = parsear(documentoAislado(carga, opciones));
      const metas = [...final.querySelectorAll('meta[http-equiv]')];
      expect(metas.map((m) => m.getAttribute('http-equiv'))).toEqual(['Content-Security-Policy']);
      expect(final.querySelectorAll('base').length).toBe(0);
      expect(
        [...final.querySelectorAll('script')].every((s) => s.getAttribute('nonce') === 'n0nce'),
      ).toBe(true);
      expect(
        [...final.querySelectorAll('*')].some((el) =>
          [...el.attributes].some((a) => a.name.toLowerCase().startsWith('on')),
        ),
      ).toBe(false);
    });
  }
});
