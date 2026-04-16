import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
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
import { ProfileService } from '@core/profile/profile.service';

import {
  applyStoredOrder,
  CombinedPhoto,
  getPhotoKey,
  isLocalPhoto,
  LocalPhoto,
  validateFile,
} from './photo.utils';
import { PhotoStorageService } from './services/photo-storage.service';
import { PhotoUploadService } from './services/photo-upload.service';

@Component({
  selector: 'app-step-photos',
  imports: [ToastModule, DragDropModule],
  providers: [MessageService, PhotoUploadService, PhotoStorageService],
  templateUrl: './step-photos.html',
})
export class StepPhotos implements AfterViewInit {
  private readonly profileService = inject(ProfileService);
  private readonly messageService = inject(MessageService);
  private readonly photoUploadService = inject(PhotoUploadService);
  private readonly photoStorageService = inject(PhotoStorageService);

  fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInputRef');

  photos = input<ProfilePhotoResponse[]>([]);
  uploadedPhotos = signal<ProfilePhotoResponse[]>([]);
  localPhotos = signal<LocalPhoto[]>([]);
  isLoading = signal(false);
  isReordering = signal(false);
  private storedOrder = signal<string[]>([]);
  private isUploadingFinal = signal(false);

  displayPhotos = signal<CombinedPhoto[]>([]);

  readonly allPhotos = computed(() => {
    const combined = [...this.localPhotos(), ...this.uploadedPhotos()];
    return applyStoredOrder(combined, this.storedOrder());
  });

  async ngAfterViewInit() {
    await this.restoreFromStorage();
    await this.loadPhotos();
  }

  async loadPhotos() {
    const photos = await this.photoUploadService.getPhotos();
    this.uploadedPhotos.set(photos);
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

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.openFileInput();
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);

      for (const file of files) {
        const validation = validateFile(file);
        if (!validation.valid) {
          this.toast(validation.error || 'Archivo inválido', 'error');
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          const localPhoto: LocalPhoto = {
            id: `local-${Date.now()}-${Math.random()}`,
            file,
            preview,
          };
          this.localPhotos.set([...this.localPhotos(), localPhoto]);
          this.persistLocalPhotos();
          this.toast('Foto cargada (se subirá al crear tu perfil)', 'info');
        };
        reader.readAsDataURL(file);
      }

      input.value = '';
    }
  }

  deleteLocalPhoto(photoId: string) {
    const photo = this.localPhotos().find((p) => p.id === photoId);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    this.localPhotos.set(this.localPhotos().filter((p) => p.id !== photoId));
    this.persistLocalPhotos();
    this.toast('Foto removida', 'info');
  }

  async deletePhoto(photoId: number) {
    try {
      await this.photoUploadService.deletePhoto(photoId);
      this.uploadedPhotos.set(this.uploadedPhotos().filter((p) => p.id !== photoId));
    } catch {
      // Error already shown in service
    }
  }

  deletePhotoItem(photo: CombinedPhoto) {
    if (isLocalPhoto(photo)) {
      this.deleteLocalPhoto(photo.id);
    } else {
      this.deletePhoto((photo as ProfilePhotoResponse).id);
    }
  }

  async uploadPendingPhotos() {
    if (this.localPhotos().length === 0) return;

    this.isLoading.set(true);
    this.isUploadingFinal.set(true);
    const photos = [...this.localPhotos()];
    const uploadedResults: ProfilePhotoResponse[] = [];

    for (const localPhoto of photos) {
      try {
        const response = await this.profileService.addPhoto(localPhoto.file);
        uploadedResults.push(response);
        URL.revokeObjectURL(localPhoto.preview);
      } catch (err) {
        console.error('Error uploading photo', err);
        this.toast('Error al subir una foto', 'error');
      }
    }

    this.localPhotos.set([]);
    this.uploadedPhotos.set([...this.uploadedPhotos(), ...uploadedResults]);
    this.persistLocalPhotos();
    this.persistOrder();

    this.isLoading.set(false);
    this.isUploadingFinal.set(false);
  }

  async reorderPhotos() {
    const photoIds = this.uploadedPhotos().map((p) => p.id);

    if (photoIds.length === 0) return;

    this.isReordering.set(true);
    try {
      await this.photoUploadService.reorderPhotos(photoIds);
    } catch {
      // Error already shown in service
    } finally {
      this.isReordering.set(false);
    }
  }

  onPhotosReordered(event: CdkDragDrop<CombinedPhoto[]>) {
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
