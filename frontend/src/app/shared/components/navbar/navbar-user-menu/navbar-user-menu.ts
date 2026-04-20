import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProfileService } from '@core/profile/profile.service';

@Component({
  selector: 'app-navbar-user-menu',
  templateUrl: './navbar-user-menu.html',
  imports: [RouterLink],
})
export class NavbarUserMenu {
  private readonly profileService = inject(ProfileService);
  avatarUrl = this.profileService.profilePhotoUrl;
}
