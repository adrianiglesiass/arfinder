import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { vi } from 'vitest';

import type { ProfileResponse, UserResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ProfileService } from '@core/profile/profile.service';

import ProfileEdit from './profile-edit';

const PROFILE = {
  id: 1,
  user_id: 10,
  name: 'Alex',
  age: 26,
  city: 'Madrid',
  type: 'looking_for_flat',
  has_pets: false,
  is_smoker: false,
  photos: [],
} as unknown as ProfileResponse;

describe('ProfileEdit', () => {
  let fixture: ComponentFixture<ProfileEdit>;
  let component: ProfileEdit;
  let updateProfile: ReturnType<typeof vi.fn>;
  let currentUser: ReturnType<typeof signal<UserResponse | null>>;

  beforeEach(async () => {
    // jsdom does not implement scrolling; `save()` scrolls to the section with errors.
    Element.prototype.scrollIntoView = vi.fn();
    updateProfile = vi.fn();
    currentUser = signal<UserResponse | null>({ id: 10 } as UserResponse);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ProfileService,
          useValue: {
            currentProfile: signal<ProfileResponse | null>(PROFILE),
            loadProfile: vi.fn(() => Promise.resolve(PROFILE)),
            updateProfile,
          },
        },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    fixture = TestBed.createComponent(ProfileEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const saveButtons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button')).filter((b) =>
      (b as HTMLButtonElement).textContent?.includes('Guardar')
    ) as HTMLButtonElement[];

  it('keeps Guardar enabled with invalid changes and shows the errors instead of saving', async () => {
    component.updateForm({ name: '' });
    fixture.detectChanges();

    expect(saveButtons()[0].disabled).toBe(false);

    await component.save();
    fixture.detectChanges();

    expect(updateProfile).not.toHaveBeenCalled();
    expect(component.showErrors()).toBe(true);
    expect(fixture.nativeElement.querySelector('#fullName-error')?.textContent).toContain(
      'Campo obligatorio'
    );
  });

  it('moves focus to the first invalid field when saving fails validation', async () => {
    document.body.appendChild(fixture.nativeElement);
    component.updateForm({ name: '' });
    await component.save();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement?.id).toBe('fullName');
    fixture.nativeElement.remove();
  });

  it('does not ask before leaving while a save is in flight', () => {
    updateProfile.mockReturnValue(new Promise(() => undefined));
    component.updateForm({ city: 'Sevilla' });
    void component.save();

    expect(component.canLeave()).toBe(true);
  });

  it('rejects an age outside 18–120', async () => {
    component.updateForm({ age: 17 });
    await component.save();
    fixture.detectChanges();

    expect(updateProfile).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('#age-error')?.textContent).toContain(
      'entre 18 y 120'
    );
  });

  it('limits name and city to 100 characters', () => {
    expect(fixture.nativeElement.querySelector('#fullName').getAttribute('maxlength')).toBe('100');
    expect(fixture.nativeElement.querySelector('#city').getAttribute('maxlength')).toBe('100');
  });

  it('lets the user leave without asking when nothing changed', () => {
    expect(component.canLeave()).toBe(true);
  });

  it('asks before leaving with unsaved changes and stays on cancel', async () => {
    component.updateForm({ city: 'Sevilla' });

    const leave = component.canLeave() as Promise<boolean>;
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¿Salir sin guardar?');

    component.stay();
    expect(await leave).toBe(false);
    expect(component.showLeaveConfirm()).toBe(false);
  });

  it('leaves when the user confirms losing the changes', async () => {
    component.updateForm({ city: 'Sevilla' });

    const leave = component.canLeave() as Promise<boolean>;
    component.leaveWithoutSaving();

    expect(await leave).toBe(true);
  });

  it('settles a pending question as stay when a new navigation asks again', async () => {
    component.updateForm({ city: 'Sevilla' });

    const first = component.canLeave() as Promise<boolean>;
    const second = component.canLeave() as Promise<boolean>;
    component.leaveWithoutSaving();

    expect(await first).toBe(false);
    expect(await second).toBe(true);
  });

  it('does not ask once the session is gone', () => {
    component.updateForm({ city: 'Sevilla' });
    currentUser.set(null);

    expect(component.canLeave()).toBe(true);
  });

  it('warns the browser before unloading with unsaved changes', () => {
    const clean = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);

    component.updateForm({ city: 'Sevilla' });
    const dirty = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});
