import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-navbar-links',
  templateUrl: './navbar-links.html',
  imports: [RouterLink, RouterLinkActive, CommonModule],
})
export class NavbarLinks {}
