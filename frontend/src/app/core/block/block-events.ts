import { Injectable } from '@angular/core';

import { Subject } from 'rxjs';

export interface BlockChange {
  profileId: number;
  blocked: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class BlockEvents {
  private readonly changes = new Subject<BlockChange>();

  readonly changes$ = this.changes.asObservable();

  emit(change: BlockChange): void {
    this.changes.next(change);
  }
}
