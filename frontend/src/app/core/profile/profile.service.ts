import { computed, inject, Injectable, signal } from '@angular/core';

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
  profilePhotoUrl = computed(() => {
    const profile = this.currentProfile();
    if (profile?.photos && profile.photos.length > 0) {
      return profile.photos[0].photo_url;
    }
    return null;
  });

  async loadProfile(): Promise<ProfileResponse> {
    const profile = await this.authApi.getMyProfile();
    this.currentProfile.set(profile);
    return profile;
  }

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
