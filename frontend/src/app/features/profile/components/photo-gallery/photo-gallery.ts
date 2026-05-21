import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import type { ProfilePhotoResponse, TypeEnum } from '@core/api/api.models';

import { TYPE_LABELS } from '@features/profile/profile-labels';

@Component({
  selector: 'app-photo-gallery',
  templateUrl: './photo-gallery.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgOptimizedImage],
})
export class PhotoGallery {
  readonly photos = input.required<ProfilePhotoResponse[]>();
  readonly activeIndex = input.required<number>();
  readonly name = input.required<string>();
  readonly type = input.required<TypeEnum>();

  readonly prev = output<Event>();
  readonly next = output<Event>();
  readonly goTo = output<{ index: number; event: Event }>();
  readonly touchStart = output<TouchEvent>();
  readonly touchEnd = output<TouchEvent>();

  protected readonly hasPhotos = computed(() => this.photos().length > 0);
  protected readonly hasMultiple = computed(() => this.photos().length > 1);
  protected readonly typeLabel = computed(() => TYPE_LABELS[this.type()]);

  onPrev(event: Event): void {
    this.prev.emit(event);
  }

  onNext(event: Event): void {
    this.next.emit(event);
  }

  onGoTo(index: number, event: Event): void {
    this.goTo.emit({ index, event });
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStart.emit(event);
  }

  onTouchEnd(event: TouchEvent): void {
    this.touchEnd.emit(event);
  }
}
