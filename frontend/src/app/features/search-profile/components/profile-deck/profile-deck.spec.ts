import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { vi } from 'vitest';

import type { ProfileSummary } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { FavoritesService } from '@core/favorites/favorites.service';
import { ProfileSearchService } from '@core/profile-search/profile-search.service';
import { ProfileService } from '@core/profile/profile.service';

import { ProfileDeck } from './profile-deck';

const summary = (id: number): ProfileSummary =>
  ({
    id,
    name: `Perfil ${id}`,
    age: 30,
    city: 'Madrid',
    type: 'looking_for_flat',
    photo_urls: [],
  }) as unknown as ProfileSummary;

describe('ProfileDeck', () => {
  let fixture: ComponentFixture<ProfileDeck>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ProfileSearchService,
          useValue: {
            isLoading: signal(false),
            error: signal(null),
            hasActiveFilters: signal(false),
            profiles: signal([summary(1), summary(2), summary(3)]),
            deckIndex: signal(0),
            loadMoreError: signal(false),
            hasMore: signal(false),
            loadMore: vi.fn(),
          },
        },
        { provide: AuthService, useValue: { currentUser: signal(null) } },
        { provide: ProfileService, useValue: { prefetchProfileById: vi.fn() } },
        {
          provide: FavoritesService,
          useValue: { favoriteIds: signal(new Set<number>()), toggle: vi.fn() },
        },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ProfileDeck);
    fixture.detectChanges();
  });

  const cards = (): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll('article'));

  const tap = (target: Element) => {
    target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 10 }));
    target.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 10 }));
  };

  it('does not nest the card controls inside a button and hides the cards behind', () => {
    const [front, ...behind] = cards();
    expect(front.getAttribute('role')).toBeNull();
    expect(front.hasAttribute('inert')).toBe(false);
    expect(behind.length).toBeGreaterThan(0);
    for (const card of behind) expect(card.hasAttribute('inert')).toBe(true);
  });

  it('opens the profile with a tap on the card', () => {
    tap(cards()[0]);
    expect(navigate).toHaveBeenCalledWith(['/perfil', 1]);
  });

  it('does not open the profile on a right or middle click', () => {
    const card = cards()[0];
    for (const button of [1, 2]) {
      card.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button }));
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button }));
    }
    expect(navigate).not.toHaveBeenCalled();
  });

  it('opens the profile from the "Ver perfil completo" button, once', () => {
    const button = Array.from(cards()[0].querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Ver perfil completo')
    )!;
    tap(button);
    button.click();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores arrow keys typed in a form field but swipes with them elsewhere', () => {
    const deck = fixture.componentInstance as unknown as { flying: () => string | null };
    const input = document.createElement('input');
    document.body.appendChild(input);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(deck.flying()).toBeNull();

    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(deck.flying()).toBe('left');
    input.remove();
  });
});
