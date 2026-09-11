import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { vi } from 'vitest';

import { AuthService } from '@core/auth/auth.service';
import { FavoritesService } from '@core/favorites/favorites.service';

import { FavoriteButton } from './favorite-button';

describe('FavoriteButton', () => {
  let favorites: {
    favoriteIds: ReturnType<typeof signal<ReadonlySet<number>>>;
    toggle: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn>; url: string };
  let currentUser: ReturnType<typeof signal<{ id: number } | null>>;

  const render = async () => {
    const fixture = TestBed.createComponent(FavoriteButton);
    fixture.componentRef.setInput('profileId', 42);
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  };

  beforeEach(async () => {
    favorites = { favoriteIds: signal<ReadonlySet<number>>(new Set()), toggle: vi.fn() };
    router = { navigate: vi.fn(() => Promise.resolve(true)), url: '/perfil/42' };
    currentUser = signal<{ id: number } | null>({ id: 1 });

    await TestBed.configureTestingModule({
      imports: [FavoriteButton],
      providers: [
        { provide: FavoritesService, useValue: favorites as unknown as FavoritesService },
        { provide: Router, useValue: router as unknown as Router },
        { provide: AuthService, useValue: { currentUser } as unknown as AuthService },
      ],
    }).compileComponents();
  });

  it('con sesión alterna el favorito', async () => {
    const button = await render();
    button.click();

    expect(favorites.toggle).toHaveBeenCalledWith(42);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('sin sesión lleva a login y no toca favoritos', async () => {
    currentUser.set(null);
    const button = await render();
    button.click();

    expect(favorites.toggle).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/perfil/42' },
    });
  });

  it('no deja que pointerdown llegue al contenedor', async () => {
    const button = await render();
    const parentListener = vi.fn();
    button.parentElement?.addEventListener('pointerdown', parentListener);

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(parentListener).not.toHaveBeenCalled();
  });
});
