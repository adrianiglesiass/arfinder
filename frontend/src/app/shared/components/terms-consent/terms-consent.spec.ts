import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ROUTES } from '@core/constants/routes';

import { TermsConsent } from './terms-consent';

describe('TermsConsent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TermsConsent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  function render(accepted: boolean, showError: boolean) {
    const fixture = TestBed.createComponent(TermsConsent);
    fixture.componentRef.setInput('accepted', accepted);
    fixture.componentRef.setInput('showError', showError);
    fixture.detectChanges();
    return fixture;
  }

  it('links to the legal pages in a new tab', () => {
    const element: HTMLElement = render(false, false).nativeElement;
    const links = Array.from(element.querySelectorAll('a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([ROUTES.TERMS, ROUTES.PRIVACY]);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
    }
    expect(element.textContent).toContain('Confirmo que soy mayor de 18 años');
  });

  it('shows the required error only when errors are visible and not accepted', () => {
    expect(render(false, true).nativeElement.textContent).toContain('Debes aceptar para continuar');
    expect(render(true, true).nativeElement.textContent).not.toContain(
      'Debes aceptar para continuar'
    );
    expect(render(false, false).nativeElement.textContent).not.toContain(
      'Debes aceptar para continuar'
    );
  });

  it('marks the checkbox invalid and links it to the error message', () => {
    const invalid: HTMLElement = render(false, true).nativeElement;
    const invalidInput = invalid.querySelector('#termsConsent');
    const describedBy = invalidInput?.getAttribute('aria-describedby');

    expect(invalidInput?.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy).toBeTruthy();
    expect(invalid.querySelector(`#${describedBy}`)?.textContent).toContain(
      'Debes aceptar para continuar'
    );

    const valid: HTMLElement = render(true, true).nativeElement;
    const validInput = valid.querySelector('#termsConsent');
    expect(validInput?.getAttribute('aria-invalid')).toBe('false');
    expect(validInput?.hasAttribute('aria-describedby')).toBe(false);
  });

  it('emits the new value when the checkbox is toggled', () => {
    const fixture = render(false, false);
    const emitted: boolean[] = [];
    fixture.componentInstance.acceptedChange.subscribe((value) => emitted.push(value));

    const input: HTMLInputElement = fixture.nativeElement.querySelector('#termsConsent');
    input.click();
    fixture.detectChanges();

    expect(emitted).toEqual([true]);
  });
});
