import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

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
  private readonly router = inject(Router);

  currentProfile = signal<ProfileResponse | null>(null);
  profilePhotoUrl = computed(() => {
    const profile = this.currentProfile();
    if (profile?.photos && profile.photos.length > 0) {
      return profile.photos[0].photo_url;
    }
    return null;
  });

  private readonly profilesById = signal<Map<number, ProfileResponse>>(new Map());

  private ensurePromise: Promise<ProfileResponse> | null = null;

  private readonly inflight = new Map<number, Promise<ProfileResponse>>();

  private readonly MAX_CONCURRENT_PREFETCH = 3;
  private prefetchInflightCount = 0;

  ensureProfile(): Promise<ProfileResponse | null> {
    const cached = this.currentProfile();
    if (cached) return Promise.resolve(cached);
    if (this.ensurePromise) return this.ensurePromise.catch(() => null);

    this.ensurePromise = (async () => {
      try {
        const profile = await this.authApi.getMyProfile();
        this.currentProfile.set(profile);
        return profile;
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          await this.router.navigate(['/onboarding']);
        }
        throw error;
      } finally {
        this.ensurePromise = null;
      }
    })();

    return this.ensurePromise.catch(() => null);
  }

  async loadProfile(): Promise<ProfileResponse> {
    const profile = await this.authApi.getMyProfile();
    this.currentProfile.set(profile);
    return profile;
  }

  peekProfileById(id: number): ProfileResponse | null {
    return this.profilesById().get(id) ?? null;
  }

  fetchProfileById(id: number): Promise<ProfileResponse> {
    const existing = this.inflight.get(id);
    if (existing) return existing;
    return this.startFetch(id);
  }

  prefetchProfileById(id: number): void {
    if (this.profilesById().has(id)) return;
    if (this.inflight.has(id)) return;
    if (this.prefetchInflightCount >= this.MAX_CONCURRENT_PREFETCH) return;

    this.prefetchInflightCount++;
    this.startFetch(id).finally(() => {
      this.prefetchInflightCount--;
    });
  }

  private startFetch(id: number): Promise<ProfileResponse> {
    const promise = this.authApi
      .getById(id)
      .then((profile) => {
        this.profilesById.update((map) => {
          const next = new Map(map);
          next.set(id, profile);
          return next;
        });
        return profile;
      })
      .finally(() => {
        this.inflight.delete(id);
      });
    this.inflight.set(id, promise);
    return promise;
  }

  hydrateProfiles(profiles: readonly ProfileResponse[]): void {
    if (profiles.length === 0) return;
    this.profilesById.update((map) => {
      const next = new Map(map);
      for (const p of profiles) next.set(p.id, p);
      return next;
    });
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
