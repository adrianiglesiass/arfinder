import { Injectable } from '@angular/core';

import { STORAGE_KEYS } from '@core/constants/storage-keys';

export interface StoredLocalPhoto {
  id: string;
  preview: string;
  fileName: string;
  fileType: string;
}

@Injectable()
export class PhotoStorageService {
  private readonly PENDING_PHOTOS_KEY = STORAGE_KEYS.onboarding.pendingPhotos;
  private readonly PHOTO_ORDER_KEY = STORAGE_KEYS.onboarding.pendingPhotosOrder;

  readStoredLocalPhotos(): StoredLocalPhoto[] {
    try {
      const raw = localStorage.getItem(this.PENDING_PHOTOS_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error reading pending photos', err);
      return [];
    }
  }

  readStoredOrder(): string[] {
    try {
      const raw = localStorage.getItem(this.PHOTO_ORDER_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Error reading photo order', err);
      return [];
    }
  }

  persistLocalPhotos(payload: StoredLocalPhoto[]): void {
    try {
      localStorage.setItem(this.PENDING_PHOTOS_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Error saving pending photos', err);
    }
  }

  persistOrder(order: string[]): void {
    try {
      localStorage.setItem(this.PHOTO_ORDER_KEY, JSON.stringify(order));
    } catch (err) {
      console.error('Error saving photo order', err);
    }
  }

  async dataUrlToFile(dataUrl: string, fileName: string, fileType: string): Promise<File> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return new File([blob], fileName, { type: fileType });
  }

  clear(): void {
    try {
      localStorage.removeItem(this.PENDING_PHOTOS_KEY);
      localStorage.removeItem(this.PHOTO_ORDER_KEY);
    } catch (err) {
      console.error('Error clearing storage', err);
    }
  }
}
