import { ChangeDetectionStrategy, Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BlockService } from '@core/block/block.service';
import { ROUTES } from '@core/constants/routes';

import { Button } from '@shared/components/button/button';
import { EmptyState } from '@shared/components/empty-state/empty-state';

import { ProfileCard } from '@features/profile/components/profile-card/profile-card';

@Component({
  selector: 'app-blocked',
  imports: [Button, ProfileCard, EmptyState, RouterLink],
  templateUrl: './blocked.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class Blocked implements OnInit {
  private readonly blocks = inject(BlockService);

  protected readonly isLoading = this.blocks.isLoading;
  protected readonly hasError = this.blocks.error;
  protected readonly visibleProfiles = computed(() =>
    this.blocks.profiles().filter((p) => this.blocks.blockedIds().has(p.id))
  );

  protected readonly exploreLink = ROUTES.EXPLORE;

  ngOnInit(): void {
    void this.blocks.refresh();
  }

  protected retry(): void {
    void this.blocks.refresh();
  }
}
