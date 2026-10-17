import { TestBed } from '@angular/core/testing';
import { InsigniaAuditoria } from './insignia-auditoria';

function montar() {
  const fixture = TestBed.createComponent(InsigniaAuditoria);
  fixture.detectChanges();
  const raiz = fixture.nativeElement as HTMLElement;
  const boton = raiz.querySelector<HTMLButtonElement>('button.insignia')!;
  return { fixture, raiz, boton };
}

describe('app-insignia-auditoria', () => {
  it('es una insignia discreta con el resultado verificado de la app', () => {
    const { boton, raiz } = montar();
    expect(boton.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Esta app: 0 problemas WCAG 2.2 AA',
    );
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    const detalle = raiz.querySelector(`#${boton.getAttribute('aria-controls')}`)!;
    expect(detalle.hasAttribute('hidden')).toBe(true);
    expect(raiz.querySelector('app-auditoria')).toBeNull();
  });

  it('al hacer clic muestra el detalle y ejecuta la autoauditoría real', () => {
    const { fixture, raiz, boton } = montar();
    boton.click();
    fixture.detectChanges();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(raiz.querySelector('#detalle-autoauditoria')!.hasAttribute('hidden')).toBe(false);
    expect(raiz.querySelector('app-auditoria')).not.toBeNull();
  });

  it('el texto refleja el resultado de la autoauditoría en vivo', () => {
    const { fixture, raiz, boton } = montar();
    boton.click();
    fixture.detectChanges();
    fixture.componentInstance['contar'](2);
    fixture.detectChanges();
    expect(boton.textContent!.replace(/\s+/g, ' ').trim()).toBe(
      'Esta app: 2 problemas WCAG 2.2 AA',
    );
    fixture.componentInstance['contar'](1);
    fixture.detectChanges();
    expect(boton.textContent!.replace(/\s+/g, ' ').trim()).toBe('Esta app: 1 problema WCAG 2.2 AA');
    expect(raiz.querySelector('.insignia')!.getAttribute('data-limpia')).toBe('false');
  });
});
