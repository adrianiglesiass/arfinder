import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { MessageService } from 'primeng/api';

import { ProfilePhotoResponse } from '@core/api/api.models';
import { ErrorService } from '@core/errors';
import { ProfileService } from '@core/profile/profile.service';

import { PhotoCard } from '@shared/components/profile-form/photo-card/photo-card';
import {
  CombinedPhoto,
  fileSignature,
  isLocalPhoto,
  validateFile,
} from '@shared/utils/photo.utils';

@Component({
  selector: 'app-photos-editor',
  imports: [DragDropModule, PhotoCard],
  templateUrl: './photos-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhotosEditor {
  private readonly profileService = inject(ProfileService);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);

  readonly photos = input<ProfilePhotoResponse[]>([]);

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInputRef');

  readonly MAX_PHOTOS = 6;
  readonly busy = signal(false);

  private readonly orderedPhotos = signal<ProfilePhotoResponse[] | null>(null);

  readonly displayPhotos = computed(() => this.orderedPhotos() ?? this.photos());

  readonly photoSlots = computed(() => {
    const list = this.displayPhotos();
    return Array.from({ length: this.MAX_PHOTOS }, (_, i) => list[i] ?? null);
  });

  openFileInput(): void {
    if (this.busy()) return;
    this.fileInputRef()?.nativeElement.click();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (this.busy()) return;
    if (!input.files || input.files.length === 0) return;

    this.busy.set(true);
    try {
      const available = this.MAX_PHOTOS - this.displayPhotos().length;
      if (available <= 0) {
        this.toast(`Ya has alcanzado el límite de ${this.MAX_PHOTOS} fotos`, 'error');
        return;
      }

      const seenSignatures = new Set<string>();
      const validFiles: File[] = [];
      for (const file of Array.from(input.files)) {
        const signature = fileSignature(file);
        if (seenSignatures.has(signature)) continue;
        const validation = validateFile(file);
        if (!validation.valid) {
          this.toast(validation.error || 'Archivo inválido', 'error');
          continue;
        }
        seenSignatures.add(signature);
        validFiles.push(file);
      }

      const files = validFiles.slice(0, available);
      if (validFiles.length > available) {
        this.toast(`Solo se pueden añadir ${available} fotos más`, 'warning');
      }
      if (files.length === 0) return;

      for (const file of files) {
        try {
          await this.profileService.addPhoto(file);
        } catch (err) {
          const { general } = this.errorService.processError(err as HttpErrorResponse);
          this.toast(general || 'Error al subir la foto', 'error');
        }
      }
      this.orderedPhotos.set(null);
      this.toast('Fotos actualizadas', 'success');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  async onPhotoDeleted(photo: CombinedPhoto): Promise<void> {
    if (isLocalPhoto(photo)) return;
    const id = (photo as ProfilePhotoResponse).id;
    this.busy.set(true);
    try {
      await this.profileService.deletePhoto(id);
      const ordered = this.orderedPhotos();
      if (ordered) this.orderedPhotos.set(ordered.filter((p) => p.id !== id));
      this.toast('Foto eliminada', 'success');
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.toast(general || 'Error al eliminar la foto', 'error');
    } finally {
      this.busy.set(false);
    }
  }

  async onReordered(event: CdkDragDrop<unknown[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;
    const list = [...this.displayPhotos()];
    if (event.previousIndex >= list.length || event.currentIndex >= list.length) return;

    moveItemInArray(list, event.previousIndex, event.currentIndex);
    this.orderedPhotos.set(list);

    this.busy.set(true);
    try {
      const ids = list.map((p) => p.id);
      const sorted = await this.profileService.reorderPhotos(ids);
      this.orderedPhotos.set(sorted);
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.toast(general || 'Error al reordenar las fotos', 'error');
      this.orderedPhotos.set(null);
    } finally {
      this.busy.set(false);
    }
  }

  private toast(
    message: string,
    severity: 'info' | 'success' | 'warning' | 'error' = 'info'
  ): void {
    this.messageService.add({ severity, summary: message, life: 3000 });
  }
}
