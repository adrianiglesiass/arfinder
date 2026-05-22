import { HttpErrorResponse } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

import type {
  ProfileCreate,
  ProfilePhotoResponse,
  ProfileResponse,
  ProfileUpdate,
} from '@core/api/api.models';
import { ROUTES } from '@core/constants/routes';
import { STORAGE_KEYS } from '@core/constants/storage-keys';

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_KEY_BY_ID = STORAGE_KEYS.profile.byId;
const STORAGE_KEY_ME = STORAGE_KEYS.profile.me;

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function readSession<T>(key: string): T | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function writeSession<T>(key: string, data: T): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // ignore quota errors
  }
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly authApi = inject(ProfileApiService);
  private readonly router = inject(Router);

  currentProfile = signal<ProfileResponse | null>(readSession<ProfileResponse>(STORAGE_KEY_ME));
  profilePhotoUrl = computed(() => {
    const profile = this.currentProfile();
    if (profile?.photos && profile.photos.length > 0) {
      return profile.photos[0].photo_url;
    }
    return null;
  });

  private readonly profilesById = signal<Map<number, ProfileResponse>>(
    new Map(readSession<[number, ProfileResponse][]>(STORAGE_KEY_BY_ID) ?? [])
  );

  constructor() {
    effect(() => {
      const me = this.currentProfile();
      if (me) writeSession(STORAGE_KEY_ME, me);
      else if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(STORAGE_KEY_ME);
    });
    effect(() => {
      const map = this.profilesById();
      writeSession(STORAGE_KEY_BY_ID, Array.from(map.entries()));
    });
  }

  clearCache(): void {
    this.currentProfile.set(null);
    this.profilesById.set(new Map());
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY_ME);
      sessionStorage.removeItem(STORAGE_KEY_BY_ID);
    }
  }

  private ensurePromise: Promise<ProfileResponse> | null = null;

  private readonly inflight = new Map<number, Promise<ProfileResponse>>();

  private readonly MAX_CONCURRENT_PREFETCH = 3;
  private prefetchInflightCount = 0;

  ensureProfile(): Promise<ProfileResponse | null> {
    const cached = this.currentProfile();
    if (cached) {
      if (!this.ensurePromise) {
        this.ensurePromise = this.authApi
          .getMyProfile()
          .then((profile) => {
            this.currentProfile.set(profile);
            return profile;
          })
          .catch((error) => {
            if (error instanceof HttpErrorResponse && error.status === 404) {
              this.currentProfile.set(null);
              this.router.navigate([ROUTES.WELCOME]);
            }
            return cached;
          })
          .finally(() => {
            this.ensurePromise = null;
          }) as Promise<ProfileResponse>;
      }
      return Promise.resolve(cached);
    }
    if (this.ensurePromise) return this.ensurePromise.catch(() => null);

    this.ensurePromise = (async () => {
      try {
        const profile = await this.authApi.getMyProfile();
        this.currentProfile.set(profile);
        return profile;
      } catch (error) {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          await this.router.navigate([ROUTES.WELCOME]);
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

  async updateProfile(data: ProfileUpdate): Promise<ProfileResponse> {
    const response = await this.authApi.updateProfile(data);
    this.currentProfile.set(response);
    this.profilesById.update((map) => {
      const next = new Map(map);
      next.set(response.id, response);
      return next;
    });
    return response;
  }

  async deletePhoto(photoId: number): Promise<void> {
    await this.authApi.deletePhoto(photoId);
    const me = this.currentProfile();
    if (me) {
      this.currentProfile.set({
        ...me,
        photos: me.photos.filter((p) => p.id !== photoId),
      });
    }
  }

  async reorderPhotos(photoIds: number[]): Promise<ProfilePhotoResponse[]> {
    const updated = await this.authApi.reorderPhotos(photoIds);
    const sorted = [...updated].sort((a, b) => a.order - b.order);
    const me = this.currentProfile();
    if (me) {
      this.currentProfile.set({ ...me, photos: sorted });
    }
    return sorted;
  }
}
