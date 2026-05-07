import { inject, Injectable } from '@angular/core';

import { ProfileApiService } from '@infrastructure/api/profile/profile.api.service';

import { ProfilePhotoResponse } from '@core/api/api.models';

@Injectable()
export class PhotoUploadService {
  private readonly profileApiService = inject(ProfileApiService);

  async reorderPhotos(photoIds: number[]): Promise<ProfilePhotoResponse[]> {
    if (photoIds.length === 0) return [];
    const updated = await this.profileApiService.reorderPhotos(photoIds);
    return updated;
  }

  async deletePhoto(photoId: number): Promise<void> {
    await this.profileApiService.deletePhoto(photoId);
  }

  async getPhotos(): Promise<ProfilePhotoResponse[]> {
    const photos = await this.profileApiService.getPhotos();
    return photos.sort((a, b) => a.order - b.order);
  }
}
