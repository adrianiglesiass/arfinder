import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { NavbarLinks } from '@layout/navbar/navbar-links/navbar-links';
import { NavbarUserMenu } from '@layout/navbar/navbar-user-menu/navbar-user-menu';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';

@Component({
  selector: 'app-navbar',
  imports: [ArfinderLogo, RouterLink, NavbarLinks, NavbarUserMenu],
  templateUrl: './navbar.html',
})
export class Navbar {}
