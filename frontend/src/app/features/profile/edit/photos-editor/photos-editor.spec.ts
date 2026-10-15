import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import type { ProfilePhotoResponse } from '@core/api/api.models';
import { ProfileService } from '@core/profile/profile.service';

import { PhotosEditor } from './photos-editor';

const PHOTO = { id: 7, photo_url: 'https://example.com/a.jpg', order: 0 } as ProfilePhotoResponse;

describe('PhotosEditor', () => {
  let fixture: ComponentFixture<PhotosEditor>;
  let component: PhotosEditor;
  let deletePhoto: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    deletePhoto = vi.fn(() => Promise.resolve());
    TestBed.configureTestingModule({
      providers: [MessageService, { provide: ProfileService, useValue: { deletePhoto } }],
    });
    fixture = TestBed.createComponent(PhotosEditor);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('photos', [PHOTO]);
    fixture.detectChanges();
  });

  const trash = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[aria-label="Eliminar esta foto"]');

  it('asks for confirmation instead of deleting right away', () => {
    trash().click();
    fixture.detectChanges();

    expect(deletePhoto).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('¿Eliminar esta foto?');
  });

  it('keeps the photo when the user cancels', () => {
    trash().click();
    component.cancelDelete();
    fixture.detectChanges();

    expect(deletePhoto).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('¿Eliminar esta foto?');
  });

  it('deletes the photo once confirmed', async () => {
    trash().click();
    await component.confirmDelete();

    expect(deletePhoto).toHaveBeenCalledWith(PHOTO.id);
    expect(component.pendingDelete()).toBeNull();
  });
});
