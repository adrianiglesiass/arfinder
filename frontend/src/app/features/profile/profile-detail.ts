import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

import type { ProfileResponse, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';

import { Button } from '@shared/components/button/button';

const TYPE_LABELS: Record<TypeEnum, string> = {
  looking_for_flat: 'Busca piso',
  looking_for_roommate: 'Busca compañero',
};

const SCHEDULE_LABELS: Record<ScheduleEnum, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  night: 'Noche',
  flexible: 'Flexible',
};

@Component({
  selector: 'app-profile-detail',
  imports: [CommonModule, RouterLink, Button],
  templateUrl: './profile-detail.html',
})
export default class ProfileDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApiService);
  private readonly authService = inject(AuthService);

  profile = signal<ProfileResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activePhotoIndex = signal(0);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/explore']);
      return;
    }

    const profileId = Number(id);
    if (isNaN(profileId)) {
      this.router.navigate(['/explore']);
      return;
    }

    this.loadProfile(profileId);
  }

  async loadProfile(id: number): Promise<void> {
    try {
      const data = await this.profileApi.getById(id);
      this.profile.set(data);
    } catch (err) {
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
    const p = this.profile();
    const currentUser = this.authService.currentUser();
    if (!p || !currentUser) return;

    if (p.user_id === currentUser.id) {
      this.error.set('No puedes enviarte mensajes a ti mismo');
      return;
    }

    const mainPhoto = p.photos?.find((photo) => photo.is_main) ?? p.photos?.[0] ?? null;
    await this.router.navigate(['/mensajes'], {
      queryParams: { recipient: p.user_id },
      state: {
        recipient: {
          user_id: p.user_id,
          name: p.name,
          photo_url: mainPhoto?.photo_url ?? null,
        },
      },
    });
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
  readonly typeLabel = computed(() => {
    const p = this.profile();
    return p ? TYPE_LABELS[p.type] : '';
  });
  readonly scheduleLabel = computed(() => {
    const p = this.profile();
    return p?.schedule ? SCHEDULE_LABELS[p.schedule] : null;
  });
  readonly isRoommate = computed(() => this.profile()?.type === 'looking_for_roommate');
  readonly formattedAvailableFrom = computed(() => {
    const p = this.profile();
    if (!p?.available_from) return null;
    const date = new Date(p.available_from);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  });
}
