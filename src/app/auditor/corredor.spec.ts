// El corredor (public/auditor/corredor.js) es JavaScript suelto que corre dentro del iframe. Aquí
// se ejecuta sobre el documento de jsdom con un axe y un IntersectionObserver simulados.

interface Mensaje {
  tipo: string;
  sesion?: string;
  violaciones?: { nodes: { ruta: number[] | null; etiqueta: string; resumen: string }[] }[];
  selectores?: string[];
}

let fuente = '';
// Oyentes que registró cada corredor cargado: se quitan al terminar cada prueba.
let oyentes: [string, EventListener][] = [];
let observados: Element[] = [];
let avisar: ((entradas: { target: Element; isIntersecting: boolean }[]) => void) | null = null;

class ObservadorFalso {
  constructor(cb: typeof avisar) {
    avisar = cb;
  }
  observe(el: Element) {
    observados.push(el);
  }
  unobserve(el: Element) {
    observados = observados.filter((o) => o !== el);
  }
  disconnect() {
    observados = [];
  }
}

beforeAll(async () => {
  const modulo = 'node:' + 'fs';
  const fs = (await import(/* @vite-ignore */ modulo)) as {
    readFileSync(p: string, c: string): string;
  };
  fuente = fs.readFileSync('public/auditor/corredor.js', 'utf8');
});

function cargar(cuerpo: string, violaciones: (doc: Document) => object[]) {
  document.head.innerHTML =
    '<meta http-equiv="Content-Security-Policy" content="x"><base href="https://ejemplo.org/">';
  document.body.innerHTML = cuerpo;
  const script = document.createElement('script');
  script.dataset['sesion'] = 'token';
  script.dataset['fragmento'] = 'no';
  document.body.append(script);
  Object.defineProperty(document, 'currentScript', { value: script, configurable: true });
  const enviados: Mensaje[] = [];
  vi.spyOn(window, 'postMessage').mockImplementation(((m: Mensaje) => enviados.push(m)) as never);
  (window as unknown as Record<string, unknown>)['axe'] = {
    run: async () => ({ violations: violaciones(document), passes: [] }),
  };
  (window as unknown as Record<string, unknown>)['IntersectionObserver'] = ObservadorFalso;
  const agregar = window.addEventListener.bind(window);
  vi.spyOn(window, 'addEventListener').mockImplementation(((
    tipo: string,
    oyente: EventListener,
    opciones?: boolean,
  ) => {
    oyentes.push([tipo, oyente]);
    agregar(tipo, oyente, opciones);
  }) as never);
  new Function(fuente)();
  const recibir = (data: object) =>
    window.dispatchEvent(new MessageEvent('message', { data, source: window }));
  return { enviados, recibir };
}

const esperar = () => new Promise((r) => setTimeout(r, 0));

describe('corredor', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [tipo, oyente] of oyentes) window.removeEventListener(tipo, oyente);
    oyentes = [];
    observados = [];
    avisar = null;
  });

  it('envía la ruta, la etiqueta y el resumen de cada nodo, sin contar los nodos de a11Lens', async () => {
    const { enviados, recibir } = cargar(
      '<header><a href="/">Inicio</a></header><main><p>Hola</p><img src="a.png"></main>',
      (doc) => [
        {
          id: 'image-alt',
          impact: 'critical',
          help: 'h',
          helpUrl: 'u',
          tags: [],
          nodes: [
            {
              target: ['main > img'],
              html: '<img src="a.png">',
              element: doc.querySelector('img'),
              failureSummary: 'Fix any of the following:\n  Element does not have an alt attribute',
            },
          ],
        },
      ],
    );
    recibir({ tipo: 'auditar', id: 1 });
    await esperar();
    const resultado = enviados.find((m) => m.tipo === 'resultado')!;
    // <html> → body (1; el head tiene meta y base de a11Lens, que no cuentan) → main (1) → img (1)
    expect(resultado.violaciones![0].nodes[0]).toMatchObject({
      ruta: [1, 1, 1],
      etiqueta: 'img',
      resumen: 'Fix any of the following:\n  Element does not have an alt attribute',
    });
    expect(resultado.sesion).toBe('token');
  });

  it('en shadow DOM o sin elemento, la ruta es null', async () => {
    const { enviados, recibir } = cargar('<main></main>', () => [
      {
        id: 'x',
        impact: 'minor',
        help: 'h',
        helpUrl: 'u',
        tags: [],
        nodes: [{ target: [['#host', 'button']], html: '<button>', element: undefined }],
      },
    ]);
    recibir({ tipo: 'auditar', id: 2 });
    await esperar();
    const nodo = enviados.find((m) => m.tipo === 'resultado')!.violaciones![0].nodes[0];
    expect(nodo.ruta).toBeNull();
  });

  it('avisa qué elementos resaltados están a la vista', async () => {
    const { enviados, recibir } = cargar(
      '<main><img id="a" src="a"><img id="b" src="b"></main>',
      () => [],
    );
    recibir({ tipo: 'resaltar', selectores: ['#a', '#b'], seleccionado: null });
    expect(observados.map((el) => el.id)).toEqual(['a', 'b']);
    avisar!([
      { target: document.getElementById('a')!, isIntersecting: true },
      { target: document.getElementById('b')!, isIntersecting: false },
    ]);
    await new Promise((r) => requestAnimationFrame(r));
    expect(enviados.filter((m) => m.tipo === 'visibles').at(-1)).toMatchObject({
      selectores: ['#a'],
      sesion: 'token',
    });
  });
});
