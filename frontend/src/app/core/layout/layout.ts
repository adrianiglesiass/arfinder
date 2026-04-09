import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Navbar } from '@shared/components/navbar/navbar';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, Navbar],
  templateUrl: './layout.html',
})
export class Layout {}
