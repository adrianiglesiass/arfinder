import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { ProfilePhotoResponse } from '@core/api/api.models';
import { ErrorService } from '@core/errors';
import { ProfileService } from '@core/profile/profile.service';

import { PhotoCard } from '@shared/components/profile-form/photo-card/photo-card';
import {
  applyStoredOrder,
  CombinedPhoto,
  fileSignature,
  getPhotoKey,
  isLocalPhoto,
  LocalPhoto,
  readFileAsDataUrl,
  validateFile,
} from '@shared/utils/photo.utils';

import { PhotoStorageService } from '@features/onboarding/components/step-photos/services/photo-storage.service';
import { PhotoUploadService } from '@features/onboarding/components/step-photos/services/photo-upload.service';

@Component({
  selector: 'app-step-photos',
  imports: [ToastModule, DragDropModule, PhotoCard],
  providers: [PhotoUploadService, PhotoStorageService],
  templateUrl: './step-photos.html',
})
export class StepPhotos implements AfterViewInit {
  private readonly profileService = inject(ProfileService);
  private readonly messageService = inject(MessageService);
  private readonly photoUploadService = inject(PhotoUploadService);
  private readonly photoStorageService = inject(PhotoStorageService);
  private readonly errorService = inject(ErrorService);

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInputRef');

  photos = input<ProfilePhotoResponse[]>([]);
  uploadedPhotos = signal<ProfilePhotoResponse[]>([]);
  localPhotos = signal<LocalPhoto[]>([]);
  isLoading = signal(false);
  isReordering = signal(false);
  private isSelecting = signal(false);
  private storedOrder = signal<string[]>([]);
  private isUploadingFinal = signal(false);

  displayPhotos = signal<CombinedPhoto[]>([]);

  readonly MAX_PHOTOS = 6;
  hasPhotos = computed(() => this.localPhotos().length > 0 || this.uploadedPhotos().length > 0);

  readonly allPhotos = computed(() => {
    const combined = [...this.localPhotos(), ...this.uploadedPhotos()];
    return applyStoredOrder(combined, this.storedOrder());
  });

  readonly photoSlots = computed(() => {
    const photos = this.allPhotos();
    return Array.from({ length: this.MAX_PHOTOS }, (_, i) => photos[i] || null);
  });

  async ngAfterViewInit() {
    await this.restoreFromStorage();
    await this.loadPhotos();
  }

  async loadPhotos() {
    try {
      const photos = await this.photoUploadService.getPhotos();
      this.uploadedPhotos.set(photos);
    } catch (error) {
      console.error('Error loading photos:', error);
    }
  }

  private async restoreFromStorage() {
    this.storedOrder.set(this.photoStorageService.readStoredOrder());
    const stored = this.photoStorageService.readStoredLocalPhotos();
    if (stored.length === 0) return;

    const rebuilt = await Promise.all(
      stored.map(async (photo) => ({
        id: photo.id,
        preview: photo.preview,
        file: await this.photoStorageService.dataUrlToFile(
          photo.preview,
          photo.fileName,
          photo.fileType
        ),
      }))
    );

    this.localPhotos.set(rebuilt);
  }

  toast(message: string, severity: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.messageService.add({
      severity,
      summary: message,
      life: 3000,
    });
  }

  openFileInput() {
    const fileInput = this.fileInputRef();
    fileInput?.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (this.isSelecting() || this.isUploadingFinal() || this.isReordering()) return;
    if (!input.files || input.files.length === 0) return;

    this.isSelecting.set(true);
    try {
      const availableSlots = this.MAX_PHOTOS - this.allPhotos().length;
      if (availableSlots <= 0) {
        this.toast(`Ya has alcanzado el límite de ${this.MAX_PHOTOS} fotos`, 'error');
        return;
      }

      const existingSignatures = new Set(this.localPhotos().map((p) => fileSignature(p.file)));
      const selected = Array.from(input.files);
      const validFiles: File[] = [];
      for (const file of selected) {
        const signature = fileSignature(file);
        if (existingSignatures.has(signature)) continue;
        const validation = validateFile(file);
        if (!validation.valid) {
          this.toast(validation.error || 'Archivo inválido', 'error');
          continue;
        }
        existingSignatures.add(signature);
        validFiles.push(file);
      }

      const files = validFiles.slice(0, availableSlots);
      if (validFiles.length > availableSlots) {
        this.toast(`Solo se pueden añadir ${availableSlots} fotos más`, 'warning');
      }
      if (files.length === 0) return;

      const previewResults = await Promise.allSettled(
        files.map(async (file) => ({
          id: `local-${Date.now()}-${Math.random()}`,
          file,
          preview: await readFileAsDataUrl(file),
        }))
      );

      const newPhotos = previewResults
        .filter(
          (result): result is PromiseFulfilledResult<LocalPhoto> => result.status === 'fulfilled'
        )
        .map((result) => result.value);

      const failedCount = previewResults.filter((result) => result.status === 'rejected').length;
      if (failedCount > 0) {
        this.toast('Algunas fotos no pudieron procesarse', 'warning');
      }
      if (newPhotos.length === 0) return;

      this.localPhotos.set([...this.localPhotos(), ...newPhotos]);
      this.persistLocalPhotos();
      this.persistOrder();
      this.toast(
        newPhotos.length === 1
          ? 'Foto cargada (se subirá al crear tu perfil)'
          : 'Fotos cargadas (se subirán al crear tu perfil)',
        'info'
      );
    } finally {
      input.value = '';
      this.isSelecting.set(false);
    }
  }

  deleteLocalPhoto(photoId: string) {
    this.localPhotos.set(this.localPhotos().filter((p) => p.id !== photoId));
    this.persistLocalPhotos();
    this.persistOrder();
    this.toast('Foto eliminada', 'info');
  }

  async deletePhoto(photoId: number) {
    try {
      await this.photoUploadService.deletePhoto(photoId);
      this.uploadedPhotos.set(this.uploadedPhotos().filter((p) => p.id !== photoId));
      this.toast('Foto eliminada', 'success');
    } catch (error: unknown) {
      const { general } = this.errorService.processError(error as HttpErrorResponse);
      this.toast(general || 'Error al eliminar la foto', 'error');
    }
  }

  deletePhotoItem(photo: CombinedPhoto) {
    if (isLocalPhoto(photo)) {
      this.deleteLocalPhoto(photo.id);
    } else {
      this.deletePhoto((photo as ProfilePhotoResponse).id);
    }
  }

  async uploadPendingPhotos(): Promise<ProfilePhotoResponse[]> {
    const localsInUiOrder = this.allPhotos().filter(isLocalPhoto) as LocalPhoto[];
    if (localsInUiOrder.length === 0) return [];

    this.isLoading.set(true);
    this.isUploadingFinal.set(true);
    const uploadedResults: ProfilePhotoResponse[] = [];
    const localKeyToRemoteKey = new Map<string, string>();

    try {
      for (const localPhoto of localsInUiOrder) {
        try {
          const response = await this.profileService.addPhoto(localPhoto.file);
          uploadedResults.push(response);
          localKeyToRemoteKey.set(`local:${localPhoto.id}`, `remote:${response.id}`);
        } catch (err: unknown) {
          console.error('Error uploading photo', err);
          throw err;
        }
      }

      const newStoredOrder = this.storedOrder().map((k) => localKeyToRemoteKey.get(k) ?? k);
      this.storedOrder.set(newStoredOrder);
      this.photoStorageService.persistOrder(newStoredOrder);

      this.localPhotos.set([]);
      this.uploadedPhotos.set([...this.uploadedPhotos(), ...uploadedResults]);
      this.persistLocalPhotos();
      return uploadedResults;
    } finally {
      this.isLoading.set(false);
      this.isUploadingFinal.set(false);
    }
  }

  async reorderPhotos(orderedIds?: number[]) {
    const photoIds: number[] =
      orderedIds && orderedIds.length
        ? orderedIds
        : (this.allPhotos()
            .filter((p) => !isLocalPhoto(p))
            .map((p) => (p as ProfilePhotoResponse).id)
            .filter(Boolean) as number[]);

    if (photoIds.length === 0) return;

    this.isReordering.set(true);
    try {
      const updated = await this.photoUploadService.reorderPhotos(photoIds);
      if (updated && Array.isArray(updated)) {
        const sorted = updated.sort((a, b) => a.order - b.order);
        this.uploadedPhotos.set(sorted);

        const newOrderKeys = sorted.map((p) => getPhotoKey(p));
        this.storedOrder.set(newOrderKeys);
        this.photoStorageService.persistOrder(newOrderKeys);

        await new Promise((res) => setTimeout(res, 150));
        try {
          await this.profileService.loadProfile();
        } catch {
          /* empty */
        }
      }
      this.toast('Orden de fotos actualizado', 'success');
    } catch (error: unknown) {
      const { general } = this.errorService.processError(error as HttpErrorResponse);
      this.toast(general || 'Error al actualizar el orden de fotos', 'error');
    } finally {
      this.isReordering.set(false);
    }
    return this.uploadedPhotos();
  }

  onPhotosReordered(event: CdkDragDrop<CombinedPhoto[]>) {
    if (this.isReordering() || this.isUploadingFinal()) return;
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    const reorderedPhotos = [...this.allPhotos()];
    moveItemInArray(reorderedPhotos, event.previousIndex, event.currentIndex);

    const newOrder = reorderedPhotos.map((photo) => getPhotoKey(photo));
    this.storedOrder.set(newOrder);
    this.persistOrder();

    const uploadedPhotoIds = reorderedPhotos
      .filter((photo) => !isLocalPhoto(photo))
      .map((photo) => (photo as ProfilePhotoResponse).id);

    if (uploadedPhotoIds.length > 0) {
      this.reorderPhotos();
    }
  }

  private persistLocalPhotos() {
    const payload = this.localPhotos().map((photo) => ({
      id: photo.id,
      preview: photo.preview,
      fileName: photo.file.name,
      fileType: photo.file.type,
    }));
    this.photoStorageService.persistLocalPhotos(payload);
  }

  private persistOrder() {
    const order = this.allPhotos().map((photo) => getPhotoKey(photo));
    this.storedOrder.set(order);
    this.photoStorageService.persistOrder(order);
  }
}
