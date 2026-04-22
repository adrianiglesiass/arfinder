import {
  AfterViewInit,
  Component,
  effect,
  inject,
  OnDestroy,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';

import { RightPanelService } from '@core/layout/right-panel.service';

import { Button } from '@shared/components/button/button';

import { SearchFilters } from '@features/search-profile/components/search-filters/search-filters';
import { SearchResults } from '@features/search-profile/components/search-results/search-results';

const DISMISS_THRESHOLD_PX = 120;

@Component({
  selector: 'app-search-profile',
  imports: [SearchFilters, SearchResults, Button],
  templateUrl: './search-profile.html',
})
export default class SearchProfile implements AfterViewInit, OnDestroy {
  private readonly rightPanel = inject(RightPanelService);

  protected readonly filtersOpen = signal(false);
  protected readonly filtersTpl = viewChild.required<TemplateRef<unknown>>('filtersTpl');

  protected readonly dragY = signal(0);
  protected readonly isDragging = signal(false);
  private dragStartY = 0;

  constructor() {
    effect(() => {
      document.body.style.overflow = this.filtersOpen() ? 'hidden' : '';
    });
  }

  ngAfterViewInit(): void {
    this.rightPanel.set(this.filtersTpl());
  }

  ngOnDestroy(): void {
    this.rightPanel.clear();
    document.body.style.overflow = '';
  }

  toggleFilters() {
    this.filtersOpen.update((v) => !v);
  }

  closeFilters() {
    this.filtersOpen.set(false);
    this.dragY.set(0);
  }

  onDragStart(event: TouchEvent): void {
    this.dragStartY = event.touches[0].clientY;
    this.isDragging.set(true);
  }

  onDragMove(event: TouchEvent): void {
    if (!this.isDragging()) return;
    const delta = event.touches[0].clientY - this.dragStartY;
    this.dragY.set(Math.max(0, delta));
  }

  onDragEnd(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (this.dragY() > DISMISS_THRESHOLD_PX) {
      this.closeFilters();
    } else {
      this.dragY.set(0);
    }
  }
}
