import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-navbar-user-menu',
  templateUrl: './navbar-user-menu.html',
  imports: [RouterLink],
})
export class NavbarUserMenu {
  avatarUrl = signal<string | null>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'
  );
}
