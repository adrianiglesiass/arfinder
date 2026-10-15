import { TestBed } from '@angular/core/testing';

import type { ProfileResponse, TypeEnum } from '@core/api/api.models';

import { ProfileInfoBlock } from './profile-info-block';

describe('ProfileInfoBlock — importe según el tipo de perfil', () => {
  const render = (type: TypeEnum, max_budget: number | null): string => {
    const fixture = TestBed.createComponent(ProfileInfoBlock);
    fixture.componentRef.setInput('profile', {
      id: 1,
      name: 'Lucía',
      age: 29,
      city: 'Madrid',
      type,
      max_budget,
      has_pets: false,
      is_smoker: false,
    } as ProfileResponse);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ');
  };

  it('quien busca piso muestra su presupuesto máximo', () => {
    const text = render('looking_for_flat', 700);
    expect(text).toContain('Presupuesto máximo');
    expect(text).toContain('700 €');
  });

  it('quien ofrece habitación muestra el precio de la habitación', () => {
    const text = render('looking_for_roommate', 450);
    expect(text).toContain('Precio de la habitación');
    expect(text).toContain('450 €');
    expect(text).not.toContain('Presupuesto máximo');
  });

  it('sin importe, un presupuesto es "Sin límite" y un precio "Sin indicar"', () => {
    expect(render('looking_for_flat', null)).toContain('Sin límite');

    const room = render('looking_for_roommate', null);
    expect(room).toContain('Sin indicar');
    expect(room).not.toContain('Sin límite');
  });
});
