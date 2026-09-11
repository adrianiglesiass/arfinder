import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { MessageService } from 'primeng/api';
import { vi } from 'vitest';

import type { ProfileResponse } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { BlockService } from '@core/block/block.service';
import { FavoritesService } from '@core/favorites/favorites.service';
import { ProfileService } from '@core/profile/profile.service';
import { ReportService } from '@core/report/report.service';

import ProfileDetail from './profile-detail';

const makeProfile = (id: number, name: string): ProfileResponse =>
  ({
    id,
    user_id: id + 100,
    name,
    age: 30,
    city: 'Madrid',
    type: 'looking_for_flat',
    has_pets: false,
    is_smoker: false,
    photos: [],
  }) as unknown as ProfileResponse;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
}

const deferred = <T>(): Deferred<T> => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('ProfileDetail', () => {
  let fixture: ComponentFixture<ProfileDetail>;
  let component: ProfileDetail;
  let profiles: {
    peekProfileById: ReturnType<typeof vi.fn>;
    fetchProfileById: ReturnType<typeof vi.fn>;
  };
  let blocks: {
    blockedIds: ReturnType<typeof signal<ReadonlySet<number>>>;
    toggle: ReturnType<typeof vi.fn>;
  };
  let reports: { report: ReturnType<typeof vi.fn> };
  let toast: ReturnType<typeof vi.fn>;

  const open = async (id: string) => {
    fixture.componentRef.setInput('id', id);
    fixture.detectChanges();
    await fixture.whenStable();
  };

  beforeEach(async () => {
    profiles = {
      peekProfileById: vi.fn(() => null),
      fetchProfileById: vi.fn((id: number) => Promise.resolve(makeProfile(id, `Perfil ${id}`))),
    };
    blocks = {
      blockedIds: signal<ReadonlySet<number>>(new Set()),
      toggle: vi.fn(async (id: number) => {
        const next = new Set(blocks.blockedIds());
        if (next.has(id)) next.delete(id);
        else next.add(id);
        blocks.blockedIds.set(next);
        return true;
      }),
    };
    reports = { report: vi.fn(() => Promise.resolve({ ok: true })) };

    await TestBed.configureTestingModule({
      imports: [ProfileDetail],
      providers: [
        provideRouter([]),
        { provide: ProfileService, useValue: profiles as unknown as ProfileService },
        { provide: BlockService, useValue: blocks as unknown as BlockService },
        { provide: ReportService, useValue: reports as unknown as ReportService },
        {
          provide: FavoritesService,
          useValue: { favoriteIds: signal(new Set()), toggle: vi.fn() },
        },
        {
          provide: AuthService,
          useValue: { currentUser: signal({ id: 1, email: 'yo@test.com' }) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileDetail);
    component = fixture.componentInstance;
    toast = vi.spyOn(fixture.debugElement.injector.get(MessageService), 'add') as never;
    await open('8');
  });

  describe('bloqueo', () => {
    it('confirmar bloquea, cierra el diálogo y avisa con un toast de éxito', async () => {
      component.openDialog('block');
      await component.confirmBlock();

      expect(blocks.toggle).toHaveBeenCalledWith(8);
      expect(component.activeDialog()).toBeNull();
      expect(blocks.blockedIds().has(8)).toBe(true);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('cancelar no llama a la API', () => {
      component.openDialog('block');
      component.closeDialog();

      expect(component.activeDialog()).toBeNull();
      expect(blocks.toggle).not.toHaveBeenCalled();
    });

    it('un fallo de la API muestra un toast de error', async () => {
      blocks.toggle.mockResolvedValueOnce(false);
      component.openDialog('block');
      await component.confirmBlock();

      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('desbloquear avisa con un toast sin pedir confirmación', async () => {
      blocks.blockedIds.set(new Set([8]));
      await component.unblock();

      expect(blocks.toggle).toHaveBeenCalledWith(8);
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', summary: 'Has desbloqueado a Perfil 8' })
      );
    });

    it('safetyBusy vuelve a false aunque el servicio rechace', async () => {
      blocks.toggle.mockRejectedValueOnce(new Error('inesperado'));
      component.openDialog('block');
      await component.confirmBlock();

      expect(component.safetyBusy()).toBe(false);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  describe('reporte', () => {
    it('un éxito cierra el diálogo', async () => {
      component.openDialog('report');
      await component.submitReport({ reason: 'spam', detail: null });

      expect(reports.report).toHaveBeenCalledWith(8, { reason: 'spam', detail: null });
      expect(component.activeDialog()).toBeNull();
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
    });

    it('un fallo mantiene el diálogo abierto y avisa', async () => {
      reports.report.mockResolvedValueOnce({
        ok: false,
        message: 'Ya habías reportado a esta persona.',
      });
      component.openDialog('report');
      await component.submitReport({ reason: 'spam', detail: null });

      expect(component.activeDialog()).toBe('report');
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Ya habías reportado a esta persona.',
        })
      );
    });

    it('si el servicio rechaza, el diálogo se puede cerrar', async () => {
      reports.report.mockRejectedValueOnce(new Error('inesperado'));
      component.openDialog('report');
      await component.submitReport({ reason: 'spam', detail: null });

      expect(component.safetyBusy()).toBe(false);
      component.closeDialog();
      expect(component.activeDialog()).toBeNull();
    });
  });

  describe('cambio de perfil', () => {
    it('cierra el diálogo abierto al navegar a otro perfil', async () => {
      component.openDialog('report');
      await open('9');

      expect(component.activeDialog()).toBeNull();
      expect(component.profile()?.id).toBe(9);
    });

    it('no muestra el perfil anterior si el nuevo falla al cargar', async () => {
      profiles.fetchProfileById.mockRejectedValueOnce(new Error('red'));
      await open('9');

      expect(component.profile()).toBeNull();
      expect(component.error()).toBe('Error al cargar el perfil');
    });

    it('ignora una respuesta lenta del perfil anterior', async () => {
      const slow = deferred<ProfileResponse>();
      profiles.fetchProfileById.mockReturnValueOnce(slow.promise);
      fixture.componentRef.setInput('id', '10');
      fixture.detectChanges();
      await open('11');

      slow.resolve(makeProfile(10, 'Perfil 10'));
      await fixture.whenStable();

      expect(component.profile()?.id).toBe(11);
      expect(component.isLoading()).toBe(false);
    });
  });

  describe('estado intermedio y coherencia', () => {
    it('sin caché, muestra la carga y no el perfil anterior mientras llega el nuevo', async () => {
      const pending = deferred<ProfileResponse>();
      profiles.fetchProfileById.mockReturnValueOnce(pending.promise);

      fixture.componentRef.setInput('id', '12');
      fixture.detectChanges();

      expect(component.profile()).toBeNull();
      expect(component.isLoading()).toBe(true);

      pending.resolve(makeProfile(12, 'Perfil 12'));
      await fixture.whenStable();
      expect(component.profile()?.id).toBe(12);
      expect(component.isLoading()).toBe(false);
    });

    it('oculta el corazón mientras el perfil está bloqueado', async () => {
      const heart = () => fixture.nativeElement.querySelector('app-favorite-button');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(heart()).not.toBeNull();

      blocks.blockedIds.set(new Set([8]));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(heart()).toBeNull();
    });

    it('una acción lenta del perfil anterior no cierra el diálogo del perfil nuevo', async () => {
      const slow = deferred<boolean>();
      blocks.toggle.mockReturnValueOnce(slow.promise);
      component.openDialog('block');
      const pendingBlock = component.confirmBlock();

      await open('9');
      component.openDialog('report');
      slow.resolve(true);
      await pendingBlock;

      expect(component.activeDialog()).toBe('report');
    });
  });
});
