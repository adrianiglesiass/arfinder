import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';

import { ProfileSearchService } from '@core/profileSearch/profile-search.service';

import { Button } from '@shared/components/button/button';
import { ProfileCard } from '@shared/components/profile-card/profile-card';
import { Spinner } from '@shared/components/spinner/spinner';

@Component({
  selector: 'app-search-results',
  imports: [ProfileCard, Button, Spinner],
  templateUrl: './search-results.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchResults implements OnDestroy {
  private readonly searchService = inject(ProfileSearchService);

  readonly profiles = this.searchService.profiles;
  readonly isLoading = this.searchService.isLoading;
  readonly isLoadingMore = this.searchService.isLoadingMore;
  readonly hasMore = this.searchService.hasMore;
  readonly error = this.searchService.error;
  readonly hasActiveFilters = this.searchService.hasActiveFilters;

  protected readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  private observer: IntersectionObserver | null = null;
  private observedEl: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const el = this.sentinel()?.nativeElement ?? null;
      if (el === this.observedEl) return;

      if (this.observedEl && this.observer) {
        this.observer.unobserve(this.observedEl);
      }
      this.observedEl = el;

      if (!el) return;
      if (typeof IntersectionObserver === 'undefined') return;

      if (!this.observer) {
        this.observer = new IntersectionObserver(
          (entries) => {
            if (entries.some((e) => e.isIntersecting)) {
              void this.searchService.loadMore();
            }
          },
          { rootMargin: '600px 0px' }
        );
      }
      this.observer.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.observedEl = null;
  }

  retry() {
    this.searchService.retry();
  }

  resetFilters() {
    this.searchService.reset();
  }
}
