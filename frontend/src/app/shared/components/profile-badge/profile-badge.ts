import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-profile-badge',
  templateUrl: './profile-badge.html',
})
export class ProfileBadge {
  tooltip = input<string>();
  iconOnly = input(false);

  protected readonly classes = computed(() =>
    this.iconOnly()
      ? 'inline-flex items-center justify-center h-8 w-8 bg-gray-50 rounded-full text-primary cursor-default'
      : 'inline-flex items-center gap-1 h-8 px-3.5 bg-gray-50 rounded-full text-[12px] font-bold text-primary leading-none cursor-default'
  );
}
