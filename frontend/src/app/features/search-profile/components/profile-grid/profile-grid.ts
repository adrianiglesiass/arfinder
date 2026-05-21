import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';

import { ProfileSearchService } from '@core/profile-search/profile-search.service';

import { Button } from '@shared/components/button/button';
import { EmptyState } from '@shared/components/empty-state/empty-state';
import { Spinner } from '@shared/components/spinner/spinner';

import { ProfileCard } from '@features/profile/components/profile-card/profile-card';

@Component({
  selector: 'app-profile-grid',
  imports: [ProfileCard, Button, EmptyState, Spinner],
  templateUrl: './profile-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileGrid implements OnDestroy {
  private readonly search = inject(ProfileSearchService);

  protected readonly profiles = this.search.profiles;
  protected readonly isLoading = this.search.isLoading;
  protected readonly isLoadingMore = this.search.isLoadingMore;
  protected readonly hasMore = this.search.hasMore;
  protected readonly error = this.search.error;
  protected readonly hasActiveFilters = this.search.hasActiveFilters;

  protected readonly skeletons = Array.from({ length: 8 });

  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');
  private observer: IntersectionObserver | null = null;

  constructor() {
    effect((onCleanup) => {
      const el = this.sentinel()?.nativeElement;
      if (!el || typeof IntersectionObserver === 'undefined') return;

      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) void this.search.loadMore();
        },
        { rootMargin: '600px 0px' }
      );
      observer.observe(el);
      this.observer = observer;
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  protected retry(): void {
    this.search.retry();
  }

  protected reset(): void {
    this.search.reset();
  }
}
