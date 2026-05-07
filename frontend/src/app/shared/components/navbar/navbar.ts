import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';
import { NavbarLinks } from '@shared/components/navbar/navbar-links/navbar-links';
import { NavbarUserMenu } from '@shared/components/navbar/navbar-user-menu/navbar-user-menu';

@Component({
  selector: 'app-navbar',
  imports: [ArfinderLogo, RouterLink, NavbarLinks, NavbarUserMenu],
  templateUrl: './navbar.html',
})
export class Navbar {}
