import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import type { ProfileResponse, ReportCreate } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockService } from '@core/block/block.service';
import { ROUTES } from '@core/constants/routes';
import { ProfileService } from '@core/profile/profile.service';
import { ReportService } from '@core/report/report.service';

import { BackLink } from '@shared/components/back-link/back-link';
import { Button } from '@shared/components/button/button';
import { ConfirmDestructiveDialog } from '@shared/components/confirm-destructive-dialog/confirm-destructive-dialog';
import { FavoriteButton } from '@shared/components/favorite-button/favorite-button';
import { MobileActionBar } from '@shared/components/mobile-action-bar/mobile-action-bar';
import { ReportDialog } from '@shared/components/report-dialog/report-dialog';
import { Skeleton } from '@shared/components/skeleton/skeleton';

import { PhotoGallery } from '@features/profile/components/photo-gallery/photo-gallery';
import { ProfileActionsMenu } from '@features/profile/components/profile-actions-menu/profile-actions-menu';
import { ProfileInfoBlock } from '@features/profile/components/profile-info-block/profile-info-block';

@Component({
  selector: 'app-profile-detail',
  imports: [
    ToastModule,
    BackLink,
    Button,
    ConfirmDestructiveDialog,
    FavoriteButton,
    ReportDialog,
    MobileActionBar,
    Skeleton,
    PhotoGallery,
    ProfileInfoBlock,
    ProfileActionsMenu,
  ],
  providers: [MessageService],
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
  private readonly blocks = inject(BlockService);
  private readonly reports = inject(ReportService);
  private readonly messageService = inject(MessageService);

  readonly id = input.required<string>();

  profile = signal<ProfileResponse | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  activePhotoIndex = signal(0);
  sendingMessage = signal(false);
  readonly activeDialog = signal<'block' | 'report' | null>(null);
  readonly safetyBusy = signal(false);

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
      untracked(() => {
        this.activeDialog.set(null);
        this.activePhotoIndex.set(0);
        this.error.set(null);
        if (this.profile()?.id !== profileId) {
          this.profile.set(null);
          this.isLoading.set(true);
        }
        void this.loadProfile(profileId);
      });
    });
  }

  private isCurrentProfile(id: number): boolean {
    return Number(this.id()) === id;
  }

  async loadProfile(id: number): Promise<void> {
    const cached = this.profileService.peekProfileById(id);
    if (cached) {
      this.profile.set(cached);
      this.isLoading.set(false);
    }

    try {
      const data = await this.profileService.fetchProfileById(id);
      if (!this.isCurrentProfile(id)) return;
      this.profile.set(data);
    } catch (err) {
      if (cached || !this.isCurrentProfile(id)) return;
      if (err instanceof HttpErrorResponse && err.status === 404) {
        this.error.set('Perfil no encontrado');
      } else {
        this.error.set('Error al cargar el perfil');
      }
    } finally {
      if (this.isCurrentProfile(id)) this.isLoading.set(false);
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

  readonly showSafetyActions = computed(() => {
    return this.authService.currentUser() !== null && !this.isOwnProfile();
  });

  openDialog(dialog: 'block' | 'report'): void {
    this.activeDialog.set(dialog);
  }

  closeDialog(): void {
    if (this.safetyBusy()) return;
    this.activeDialog.set(null);
  }

  async confirmBlock(): Promise<void> {
    const p = this.profile();
    if (!p || this.safetyBusy()) return;
    if (this.blocks.blockedIds().has(p.id)) {
      this.activeDialog.set(null);
      return;
    }

    const ok = await this.runExclusive(() => this.blocks.toggle(p.id));
    this.activeDialog.set(null);
    if (ok === null) return;

    this.messageService.add(
      ok
        ? {
            severity: 'success',
            summary: `Has bloqueado a ${p.name}`,
            detail: 'Ya no os veréis en las búsquedas ni en favoritos.',
            life: 5000,
          }
        : {
            severity: 'error',
            summary: 'No se pudo bloquear',
            detail: 'Inténtalo de nuevo en unos minutos.',
            life: 5000,
          }
    );
  }

  async unblock(): Promise<void> {
    const p = this.profile();
    if (!p || this.safetyBusy() || !this.blocks.blockedIds().has(p.id)) return;

    const ok = await this.runExclusive(() => this.blocks.toggle(p.id));
    if (ok === null) return;

    this.messageService.add(
      ok
        ? {
            severity: 'success',
            summary: `Has desbloqueado a ${p.name}`,
            detail: 'Volveréis a veros en las búsquedas.',
            life: 5000,
          }
        : {
            severity: 'error',
            summary: 'No se pudo desbloquear',
            detail: 'Inténtalo de nuevo en unos minutos.',
            life: 5000,
          }
    );
  }

  private async runExclusive<T>(action: () => Promise<T>): Promise<T | null> {
    this.safetyBusy.set(true);
    try {
      return await action();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Algo ha fallado',
        detail: 'Inténtalo de nuevo en unos minutos.',
        life: 5000,
      });
      return null;
    } finally {
      this.safetyBusy.set(false);
    }
  }

  async submitReport(payload: ReportCreate): Promise<void> {
    const p = this.profile();
    if (!p || this.safetyBusy()) return;

    const result = await this.runExclusive(() => this.reports.report(p.id, payload));
    if (result === null) return;

    if (result.ok) {
      this.activeDialog.set(null);
      this.messageService.add({
        severity: 'success',
        summary: 'Reporte enviado',
        detail: `Gracias por avisarnos. También hemos bloqueado a ${p.name}.`,
        life: 5000,
      });
      return;
    }

    this.messageService.add({
      severity: 'error',
      summary: 'No se pudo enviar el reporte',
      detail: result.message,
      life: 5000,
    });
  }

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
