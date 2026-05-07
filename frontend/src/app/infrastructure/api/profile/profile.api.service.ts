import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@env/environment';
import { firstValueFrom } from 'rxjs';

import {
  ProfileCreate,
  ProfilePhotoResponse,
  ProfileResponse,
  ProfileUpdate,
} from '@core/api/api.models';

@Injectable({
  providedIn: 'root',
})
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly APIURL = `${environment.APIURL}/profiles`;

  createProfile(profile: ProfileCreate): Promise<ProfileResponse> {
    return firstValueFrom(this.http.post<ProfileResponse>(`${this.APIURL}/me`, profile));
  }

  getMyProfile(): Promise<ProfileResponse> {
    return firstValueFrom(this.http.get<ProfileResponse>(`${this.APIURL}/me`));
  }

  getById(profileId: number): Promise<ProfileResponse> {
    return firstValueFrom(this.http.get<ProfileResponse>(`${this.APIURL}/${profileId}`));
  }

  updateProfile(profile: ProfileUpdate): Promise<ProfileResponse> {
    return firstValueFrom(this.http.patch<ProfileResponse>(`${this.APIURL}/me`, profile));
  }

  uploadPhoto(file: File): Promise<ProfilePhotoResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return firstValueFrom(
      this.http.post<ProfilePhotoResponse>(`${this.APIURL}/me/photos`, formData)
    );
  }

  getPhotos(): Promise<ProfilePhotoResponse[]> {
    return firstValueFrom(this.http.get<ProfilePhotoResponse[]>(`${this.APIURL}/me/photos`));
  }

  deletePhoto(photoId: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.APIURL}/me/photos/${photoId}`));
  }

  reorderPhotos(photoIds: number[]): Promise<ProfilePhotoResponse[]> {
    return firstValueFrom(
      this.http.patch<ProfilePhotoResponse[]>(`${this.APIURL}/me/photos/reorder`, {
        ordered_ids: photoIds,
      })
    );
  }
}
