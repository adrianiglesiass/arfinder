import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import type { ProfileResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ROUTES } from '@core/constants/routes';
import { ProfileService } from '@core/profile/profile.service';

import { Button } from '@shared/components/button/button';
import { Skeleton } from '@shared/components/skeleton/skeleton';

import { PhotoGallery } from '@features/profile/components/photo-gallery/photo-gallery';
import { ProfileInfoBlock } from '@features/profile/components/profile-info-block/profile-info-block';

@Component({
  selector: 'app-profile-detail',
  imports: [RouterLink, Button, Skeleton, PhotoGallery, ProfileInfoBlock],
  templateUrl: './profile-detail.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleKeydown($event)',
  },
})
export default class ProfileDetail {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  readonly id = input.required<string>();

  profile = signal<ProfileResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activePhotoIndex = signal(0);
  sendingMessage = signal(false);

  protected readonly exploreRoute = ROUTES.EXPLORE;

  private touchStartX: number | null = null;
  private touchStartY: number | null = null;

  constructor() {
    effect(() => {
      const profileId = Number(this.id());
      if (Number.isNaN(profileId)) {
        this.router.navigate([ROUTES.EXPLORE]);
        return;
      }
      this.loadProfile(profileId);
    });
  }

  async loadProfile(id: number): Promise<void> {
    const cached = this.profileService.peekProfileById(id);
    if (cached) {
      this.profile.set(cached);
      this.isLoading.set(false);
    }

    try {
      const data = await this.profileService.fetchProfileById(id);
      this.profile.set(data);
    } catch (err) {
      if (cached) return;
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.error.set('Perfil no encontrado');
      } else {
        this.error.set('Error al cargar el perfil');
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async sendMessage(): Promise<void> {
    if (this.sendingMessage()) return;
    const p = this.profile();
    const currentUser = this.authService.currentUser();

    if (!currentUser) {
      this.router.navigate([ROUTES.LOGIN], {
        queryParams: { redirect: `${ROUTES.PROFILE_DETAIL}/${p?.id}` },
      });
      return;
    }

    if (!p) return;

    if (p.user_id === currentUser.id) {
      this.error.set('No puedes enviarte mensajes a ti mismo');
      return;
    }

    this.sendingMessage.set(true);
    const mainPhoto = p.photos?.find((photo) => photo.is_main) ?? p.photos?.[0] ?? null;
    try {
      await this.router.navigate([ROUTES.MESSAGES], {
        queryParams: { recipient: p.user_id },
        state: {
          recipient: {
            user_id: p.user_id,
            profile_id: p.id,
            name: p.name,
            photo_url: mainPhoto?.photo_url ?? null,
          },
        },
      });
    } finally {
      this.sendingMessage.set(false);
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    if (!this.hasMultiplePhotos()) return;
    const target = event.target as HTMLElement | null;
    if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
    if (event.key === 'ArrowLeft') this.prevPhoto(event);
    else if (event.key === 'ArrowRight') this.nextPhoto(event);
  }

  onTouchStart(event: TouchEvent): void {
    const t = event.touches[0];
    this.touchStartX = t.clientX;
    this.touchStartY = t.clientY;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.touchStartX === null || this.touchStartY === null) return;
    const t = event.changedTouches[0];
    const dx = t.clientX - this.touchStartX;
    const dy = t.clientY - this.touchStartY;
    this.touchStartX = null;
    this.touchStartY = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    if (!this.hasMultiplePhotos()) return;
    const total = this.photos().length;
    if (dx > 0) this.activePhotoIndex.update((i) => (i - 1 + total) % total);
    else this.activePhotoIndex.update((i) => (i + 1) % total);
  }

  readonly isOwnProfile = computed(() => {
    const p = this.profile();
    const currentUser = this.authService.currentUser();
    if (!p || !currentUser?.id) return false;
    return p.user_id === currentUser.id;
  });

  readonly showSendMessageButton = computed(() => {
    return !this.isOwnProfile();
  });

  readonly photos = computed(() => this.profile()?.photos ?? []);
  readonly hasPhotos = computed(() => this.photos().length > 0);
  readonly hasMultiplePhotos = computed(() => this.photos().length > 1);
  readonly currentPhotoUrl = computed(() => {
    const photos = this.photos();
    if (photos.length === 0) return null;
    return photos[this.activePhotoIndex()]?.photo_url ?? photos[0]?.photo_url;
  });

  prevPhoto(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const total = this.photos().length;
    if (total <= 1) return;
    this.activePhotoIndex.update((i) => (i - 1 + total) % total);
  }

  nextPhoto(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const total = this.photos().length;
    if (total <= 1) return;
    this.activePhotoIndex.update((i) => (i + 1) % total);
  }

  goToPhoto(index: number, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.activePhotoIndex.set(index);
  }
}
