import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { MenuItem } from 'primeng/api';

import { BlockService } from '@core/block/block.service';

import { ProfileActionsMenu } from './profile-actions-menu';

describe('ProfileActionsMenu', () => {
  let blockedIds: ReturnType<typeof signal<ReadonlySet<number>>>;

  const create = async () => {
    const fixture = TestBed.createComponent(ProfileActionsMenu);
    fixture.componentRef.setInput('profileId', 42);
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const items = () => (component as unknown as { items: () => MenuItem[] }).items();
    return { component, items };
  };

  beforeEach(async () => {
    blockedIds = signal<ReadonlySet<number>>(new Set());

    await TestBed.configureTestingModule({
      imports: [ProfileActionsMenu],
      providers: [{ provide: BlockService, useValue: { blockedIds } as unknown as BlockService }],
    }).compileComponents();
  });

  it('ofrece bloquear y reportar si el perfil no está bloqueado', async () => {
    const { items } = await create();
    expect(items().map((i) => i.label)).toEqual(['Bloquear', 'Reportar']);
  });

  it('ofrece desbloquear si el perfil ya está bloqueado', async () => {
    blockedIds.set(new Set([42]));
    const { items } = await create();
    expect(items().map((i) => i.label)).toEqual(['Desbloquear', 'Reportar']);
  });

  it('emite la intención de cada entrada', async () => {
    const { component, items } = await create();
    const emitted: string[] = [];
    component.blockRequested.subscribe(() => emitted.push('block'));
    component.reportRequested.subscribe(() => emitted.push('report'));
    component.unblockRequested.subscribe(() => emitted.push('unblock'));

    items()[0].command?.({});
    items()[1].command?.({});
    blockedIds.set(new Set([42]));
    items()[0].command?.({});

    expect(emitted).toEqual(['block', 'report', 'unblock']);
  });
});
