import { inject, Injectable, signal } from '@angular/core';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

import type {
  ProfileCreate,
  ProfilePhotoResponse,
  ProfileResponse,
  ProfileUpdate,
} from '@core/api/api.models';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly authApi = inject(ProfileApiService);

  currentProfile = signal<ProfileResponse | null>(null);

  async saveOnboarding(data: ProfileCreate): Promise<void> {
    try {
      const response = await this.authApi.createProfile(data);
      this.currentProfile.set(response);
    } catch (error) {
      if (this.isProfileAlreadyExists(error)) {
        const response = await this.authApi.updateProfile(data as ProfileUpdate);
        this.currentProfile.set(response);
        return;
      }
      throw error;
    }
  }

  private isProfileAlreadyExists(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const err = error as { error?: { code?: string } };
    return err.error?.code === 'PROFILE_ALREADY_EXISTS';
  }

  async addPhoto(file: File): Promise<ProfilePhotoResponse> {
    return await this.authApi.uploadPhoto(file);
  }
}
