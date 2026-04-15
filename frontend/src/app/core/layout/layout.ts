import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MobileNav } from '@shared/components/navbar/mobile-nav/mobile-nav';
import { Navbar } from '@shared/components/navbar/navbar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Navbar, MobileNav],
  templateUrl: './layout.html',
})
export class Layout {}
