import { ProfilePhotoResponse } from '@core/api/api.models';

export interface LocalPhoto {
  id: string;
  file: File;
  preview: string;
}

export type CombinedPhoto = LocalPhoto | ProfilePhotoResponse;

const PHOTO_VALIDATION = {
  MAX_SIZE: 10 * 1024 * 1024,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

export function validateFile(file: File): { valid: boolean; error?: string } {
  if (!PHOTO_VALIDATION.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Solo se permiten JPG, PNG o WEBP' };
  }

  if (file.size > PHOTO_VALIDATION.MAX_SIZE) {
    return { valid: false, error: 'La foto no debe exceder 5MB' };
  }

  return { valid: true };
}

export function getPhotoKey(photo: CombinedPhoto): string {
  if ('file' in photo) {
    return `local:${photo.id}`;
  }
  return `remote:${(photo as ProfilePhotoResponse).id}`;
}

export function isLocalPhoto(photo: CombinedPhoto): photo is LocalPhoto {
  return 'file' in photo && 'preview' in photo;
}

export function applyStoredOrder(photos: CombinedPhoto[], storedOrder: string[]): CombinedPhoto[] {
  if (storedOrder.length === 0) return photos;

  const map = new Map<string, CombinedPhoto>();
  for (const photo of photos) {
    map.set(getPhotoKey(photo), photo);
  }

  const ordered: CombinedPhoto[] = [];
  for (const key of storedOrder) {
    const item = map.get(key);
    if (item) {
      ordered.push(item);
      map.delete(key);
    }
  }

  for (const item of map.values()) {
    ordered.push(item);
  }

  return ordered;
}
