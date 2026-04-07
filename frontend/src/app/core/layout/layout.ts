import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ArfinderLogo } from '@shared/components/arfinder-logo/arfinder-logo';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, ArfinderLogo],
  templateUrl: './layout.html',
})
export class Layout {}
