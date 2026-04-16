import { inject, Injectable } from '@angular/core';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';
import { MessageService } from 'primeng/api';

import { ProfilePhotoResponse } from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class PhotoUploadService {
  private readonly profileApiService = inject(ProfileApiService);
  private readonly messageService = inject(MessageService);

  toast(message: string, severity: 'info' | 'success' | 'warning' | 'error' = 'info') {
    this.messageService.add({
      severity,
      summary: message,
      life: 3000,
    });
  }

  async reorderPhotos(photoIds: number[]): Promise<void> {
    if (photoIds.length === 0) return;

    try {
      await this.profileApiService.reorderPhotos(photoIds);
      this.toast('Orden de fotos actualizado', 'success');
    } catch (err) {
      console.error('Error reordering photos', err);
      this.toast('Error al actualizar el orden de fotos', 'error');
      throw err;
    }
  }

  async deletePhoto(photoId: number): Promise<void> {
    try {
      await this.profileApiService.deletePhoto(photoId);
      this.toast('Foto eliminada', 'success');
    } catch (err) {
      console.error('Error deleting photo', err);
      this.toast('Error al eliminar la foto', 'error');
      throw err;
    }
  }

  async getPhotos(): Promise<ProfilePhotoResponse[]> {
    try {
      const photos = await this.profileApiService.getPhotos();
      return photos.sort((a, b) => a.order - b.order);
    } catch (err) {
      console.error('Error loading photos', err);
      return [];
    }
  }
}
