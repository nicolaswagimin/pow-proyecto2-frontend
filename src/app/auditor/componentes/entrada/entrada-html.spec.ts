import { TestBed } from '@angular/core/testing';
import { EntradaHtml } from './entrada-html';

function montar() {
  const fixture = TestBed.createComponent(EntradaHtml);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  const pestana = (texto: string) =>
    [...raiz.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((b) =>
      b.textContent?.includes(texto),
    )!;
  return { fixture, raiz, pestana, c: fixture.componentInstance };
}

describe('ui-entrada-html', () => {
  it('tiene tres pestañas accesibles y empieza en Pegar', () => {
    const { raiz, pestana } = montar();
    expect([...raiz.querySelectorAll('[role="tab"]')].map((t) => t.textContent?.trim())).toEqual([
      'Pegar HTML',
      'Subir archivo',
      'URL',
    ]);
    expect(pestana('Pegar').getAttribute('aria-selected')).toBe('true');
    expect(raiz.querySelector('[role="tabpanel"]')?.getAttribute('aria-labelledby')).toBe(
      pestana('Pegar').id,
    );
  });

  it('auditar lo pegado emite el HTML y el nombre', () => {
    const { fixture, raiz, c } = montar();
    let emitido: { html: string; pagina: string } | undefined;
    c.pegado.subscribe((v) => (emitido = v));
    const area = raiz.querySelector('textarea')!;
    area.value = '<main>x</main>';
    area.dispatchEvent(new Event('input'));
    raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    expect(emitido).toEqual({ html: '<main>x</main>', pagina: '' });
  });

  it('la pestaña URL emite la dirección', () => {
    const { fixture, raiz, pestana, c } = montar();
    pestana('URL').click();
    fixture.detectChanges();
    let url: string | undefined;
    c.url.subscribe((v) => (url = v));
    const campo = raiz.querySelector<HTMLInputElement>('input[type="url"]')!;
    campo.value = 'https://ejemplo.org';
    campo.dispatchEvent(new Event('input'));
    raiz.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    expect(url).toBe('https://ejemplo.org');
  });

  it('las flechas mueven entre pestañas', () => {
    const { fixture, pestana } = montar();
    pestana('Pegar').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    fixture.detectChanges();
    expect(pestana('Subir').getAttribute('aria-selected')).toBe('true');
  });
});
