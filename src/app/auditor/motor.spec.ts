import { TestBed } from '@angular/core/testing';
import { MotorService, SesionAislada } from './motor.service';

// El token de sesión que el corredor recibe en su <script data-sesion> (se lee del srcdoc).
function tokenDe(iframe: HTMLIFrameElement): string | undefined {
  return iframe.getAttribute('srcdoc')?.match(/data-sesion="([^"]+)"/)?.[1];
}

// jsdom no ejecuta los scripts del iframe: se simula el corredor respondiendo a los mensajes.
function simularCorredor(
  iframe: HTMLIFrameElement,
  responder: (m: { tipo: string; id?: number }) => object | null,
) {
  const ventana = iframe.contentWindow!;
  const enviar = (datos: object) =>
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { sesion: tokenDe(iframe), ...datos },
        source: ventana as unknown as Window,
      }),
    );
  vi.spyOn(ventana, 'postMessage').mockImplementation(((m: { tipo: string; id?: number }) => {
    const respuesta = responder(m);
    if (respuesta) queueMicrotask(() => enviar(respuesta));
  }) as never);
  return enviar;
}

const violacion = {
  id: 'image-alt',
  impact: 'critical',
  help: 'Images must have alternate text',
  helpUrl: 'https://x',
  tags: ['wcag2a', 'wcag111'],
  nodes: [{ target: ['img'], html: '<img src="a.png">' }],
};

async function abrir(
  responder = (m: { tipo: string; id?: number }) =>
    m.tipo === 'auditar'
      ? { tipo: 'resultado', id: m.id, violaciones: [violacion], aprobadas: 12 }
      : null,
) {
  const motor = TestBed.inject(MotorService);
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  const enviar = simularCorredor(iframe, responder);
  const abriendo = motor.abrir(iframe, '<main><img src="a.png"></main>');
  enviar({ tipo: 'listo' });
  return { sesion: await abriendo, iframe, enviar };
}

describe('MotorService', () => {
  afterEach(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));

  it('el iframe tiene exactamente sandbox="allow-scripts"', async () => {
    const { iframe } = await abrir();
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    // jsdom no implementa iframe.sandbox: se revisan los tokens del atributo.
    const permisos = iframe.getAttribute('sandbox')!.trim().split(/\s+/);
    expect(permisos).toEqual(['allow-scripts']);
    for (const prohibido of [
      'allow-same-origin',
      'allow-forms',
      'allow-popups',
      'allow-top-navigation',
      'allow-modals',
    ]) {
      expect(permisos).not.toContain(prohibido);
    }
  });

  it('el documento aislado lleva la CSP, el nonce y no conserva meta refresh', async () => {
    const motor = TestBed.inject(MotorService);
    const iframe = document.createElement('iframe');
    document.body.append(iframe);
    simularCorredor(iframe, () => null);
    void motor
      .abrir(iframe, '<meta http-equiv="refresh" content="0;url=https://malo.example"><p>x</p>')
      .catch(() => {});
    const srcdoc = iframe.getAttribute('srcdoc') ?? '';
    const nonce = srcdoc.match(/nonce-([A-Za-z0-9_-]+)/)?.[1];
    expect(nonce).toBeTruthy();
    expect(srcdoc).toContain(`nonce="${nonce}"`);
    expect(srcdoc).not.toContain('refresh');
  });

  it('auditar devuelve los problemas ya convertidos', async () => {
    const { sesion } = await abrir();
    const r = await sesion.auditar();
    expect(r.problemas[0]).toMatchObject({ regla: 'image-alt', gravedad: 'critico' });
    expect(r.reglasAprobadas).toBe(12);
  });

  it('ignora mensajes que no vienen de su iframe', async () => {
    const { sesion } = await abrir(() => null);
    const auditando = sesion.auditar(50);
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { tipo: 'resultado', id: 1, violaciones: [], aprobadas: 0 },
        source: window,
      }),
    );
    await expect(auditando).rejects.toThrow(/tardó demasiado/);
  });

  it('ignora mensajes de su propio iframe sin el token de la sesión (la página navegó)', async () => {
    const { sesion, enviar } = await abrir(() => null);
    const auditando = sesion.auditar(50);
    enviar({ tipo: 'resultado', id: 1, violaciones: [], aprobadas: 99, sesion: 'falso' });
    enviar({ tipo: 'resultado', id: 1, violaciones: [], aprobadas: 99, sesion: undefined });
    await expect(auditando).rejects.toThrow(/tardó demasiado/);
  });

  it('cada sesión tiene un token distinto del nonce', async () => {
    const { iframe } = await abrir();
    const srcdoc = iframe.getAttribute('srcdoc')!;
    const token = tokenDe(iframe);
    expect(token).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(srcdoc).not.toContain(`nonce-${token}`);
  });

  it('avisa los clics en elementos de la vista previa', async () => {
    const { sesion, enviar } = await abrir();
    const clics: string[] = [];
    sesion.alClic((s) => clics.push(s));
    enviar({ tipo: 'clic', selector: 'main > img' });
    expect(clics).toEqual(['main > img']);
  });

  it('auditarHtml usa un iframe oculto que se elimina al terminar', async () => {
    const motor = TestBed.inject(MotorService);
    const original = motor.abrir.bind(motor);
    vi.spyOn(motor, 'abrir').mockImplementation(async (iframe, html) => {
      simularCorredor(iframe, (m) =>
        m.tipo === 'auditar'
          ? { tipo: 'resultado', id: m.id, violaciones: [], aprobadas: 3 }
          : null,
      );
      const p = original(iframe, html);
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { tipo: 'listo', sesion: tokenDe(iframe) },
          source: iframe.contentWindow as unknown as Window,
        }),
      );
      return p as Promise<SesionAislada>;
    });
    const r = await motor.auditarHtml('<p>x</p>');
    expect(r.problemas).toEqual([]);
    expect(document.querySelectorAll('iframe').length).toBe(0);
  });
});
