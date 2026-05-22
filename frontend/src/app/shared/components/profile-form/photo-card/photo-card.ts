import { Component, input, output } from '@angular/core';

import { CombinedPhoto } from '@shared/utils/photo.utils';

@Component({
  selector: 'app-photo-card',
  templateUrl: './photo-card.html',
})
export class PhotoCard {
  photo = input<CombinedPhoto | null>(null);
  index = input<number>(0);

  deleted = output<CombinedPhoto>();
  added = output<void>();

  getPhotoUrl(photo: CombinedPhoto): string {
    return 'file' in photo ? photo.preview : photo.photo_url;
  }

  handleDelete(event: Event) {
    event.stopPropagation();
    const photo = this.photo();
    if (photo) {
      this.deleted.emit(photo);
    }
  }

  handleAdd() {
    if (!this.photo()) {
      this.added.emit();
    }
  }

  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleAdd();
    }
  }
}
