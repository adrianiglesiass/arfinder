import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { vi } from 'vitest';

import type { ProfilePhotoResponse, ProfileResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

import { ProfileService } from './profile.service';

const photo = (id: number, order: number): ProfilePhotoResponse =>
  ({ id, photo_url: `https://cdn/${id}.jpg`, order, is_main: order === 0 }) as ProfilePhotoResponse;

describe('ProfileService.addPhoto', () => {
  it('añade la foto subida al perfil actual sin recargar', async () => {
    const uploadPhoto = vi.fn(() => Promise.resolve(photo(3, 2)));
    TestBed.configureTestingModule({
      providers: [
        { provide: ProfileApiService, useValue: { uploadPhoto } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: AuthService, useValue: { currentUser: signal({ id: 1 }) } },
      ],
    });
    const service = TestBed.inject(ProfileService);
    service.currentProfile.set({
      id: 10,
      user_id: 1,
      name: 'Yo',
      photos: [photo(1, 0), photo(2, 1)],
    } as unknown as ProfileResponse);

    await service.addPhoto(new File(['x'], 'foto.png', { type: 'image/png' }));

    expect(service.currentProfile()?.photos.map((p) => p.id)).toEqual([1, 2, 3]);
    expect(service.peekProfileById(10)?.photos.map((p) => p.id)).toEqual([1, 2, 3]);
  });
});
