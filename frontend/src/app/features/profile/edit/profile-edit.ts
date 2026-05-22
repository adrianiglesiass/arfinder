import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import {
  ProfileCreate,
  ProfileResponse,
  ProfileUpdate,
  ScheduleEnum,
  TypeEnum,
} from '@core/api/api.models';
import { ROUTES } from '@core/constants/routes';
import { ErrorService } from '@core/errors';
import { ProfileService } from '@core/profile/profile.service';

import { Button } from '@shared/components/button/button';
import { MobileActionBar } from '@shared/components/mobile-action-bar/mobile-action-bar';
import { StepLifestyle } from '@shared/components/profile-form/step-lifestyle/step-lifestyle';
import { StepObjective } from '@shared/components/profile-form/step-objective/step-objective';
import { StepProfile } from '@shared/components/profile-form/step-profile/step-profile';

import { DangerZone } from '@features/profile/edit/danger-zone/danger-zone';
import { EditSection } from '@features/profile/edit/edit-section/edit-section';
import { PhotosEditor } from '@features/profile/edit/photos-editor/photos-editor';

type EditableField =
  | 'name'
  | 'age'
  | 'city'
  | 'bio'
  | 'gender'
  | 'available_from'
  | 'type'
  | 'max_budget'
  | 'room_description'
  | 'schedule'
  | 'has_pets'
  | 'is_smoker';

type FormState = Pick<ProfileResponse, EditableField>;

interface Section {
  id: 'photos' | 'profile' | 'objective' | 'lifestyle' | 'danger';
  label: string;
  icon: string;
}

@Component({
  selector: 'app-profile-edit',
  imports: [
    CommonModule,
    ToastModule,
    Button,
    MobileActionBar,
    StepProfile,
    StepObjective,
    StepLifestyle,
    PhotosEditor,
    DangerZone,
    EditSection,
  ],
  providers: [MessageService],
  templateUrl: './profile-edit.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class ProfileEdit implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly showErrors = signal(false);
  readonly activeSection = signal<Section['id']>('photos');

  readonly profile = this.profileService.currentProfile;

  readonly sections: Section[] = [
    { id: 'photos', label: 'Fotos', icon: 'pi pi-images' },
    { id: 'profile', label: 'Información', icon: 'pi pi-user' },
    { id: 'objective', label: 'Objetivo', icon: 'pi pi-compass' },
    { id: 'lifestyle', label: 'Estilo', icon: 'pi pi-heart' },
    { id: 'danger', label: 'Cuenta', icon: 'pi pi-shield' },
  ];

  private readonly initialState = signal<FormState | null>(null);
  readonly form = signal<FormState | null>(null);

  readonly safeForm = computed(() => {
    const f = this.form();
    return {
      name: f?.name ?? '',
      age: f?.age ?? 0,
      city: f?.city ?? '',
      bio: f?.bio ?? '',
      gender: f?.gender ?? '',
      available_from: f?.available_from ?? '',
      max_budget: f?.max_budget ?? 700,
      has_pets: f?.has_pets ?? false,
      is_smoker: f?.is_smoker ?? false,
      schedule: (f?.schedule ?? 'flexible') as ScheduleEnum,
      type: (f?.type ?? 'looking_for_flat') as TypeEnum,
      room_description: f?.room_description ?? '',
    };
  });

  readonly isDirty = computed(() => {
    const a = this.form();
    const b = this.initialState();
    if (!a || !b) return false;
    return (Object.keys(a) as EditableField[]).some((k) => (a[k] ?? null) !== (b[k] ?? null));
  });

  readonly isValid = computed(() => {
    const f = this.form();
    if (!f) return false;
    return !!(f.name?.trim() && f.age && f.city?.trim());
  });

  readonly canSave = computed(() => this.isDirty() && this.isValid() && !this.isSaving());

  constructor() {
    effect(() => {
      const p = this.profile();
      if (!p) return;
      if (this.form()) return;
      const snapshot = this.snapshotFrom(p);
      this.form.set(snapshot);
      this.initialState.set(snapshot);
      this.isLoading.set(false);
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      const existing = this.profile();
      if (!existing) {
        await this.profileService.ensureProfile();
      }
    } finally {
      if (this.profile()) this.isLoading.set(false);
    }
  }

  private snapshotFrom(p: ProfileResponse): FormState {
    return {
      name: p.name,
      age: p.age,
      city: p.city,
      bio: p.bio ?? null,
      gender: p.gender ?? null,
      available_from: p.available_from ?? null,
      type: p.type,
      max_budget: p.max_budget ?? null,
      room_description: p.room_description ?? null,
      schedule: p.schedule ?? null,
      has_pets: p.has_pets,
      is_smoker: p.is_smoker,
    };
  }

  updateForm(patch: Partial<ProfileCreate>): void {
    this.form.update((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch } as FormState;
      if (next.type === 'looking_for_flat') next.room_description = null;
      if (patch.bio === '') next.bio = null;
      if (patch.gender === '') next.gender = null;
      if (patch.available_from === '') next.available_from = null;
      if (patch.room_description === '') next.room_description = null;
      return next;
    });
  }

  scrollTo(id: Section['id']): void {
    this.activeSection.set(id);
    if (typeof document === 'undefined') return;
    const el = document.getElementById(`section-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      if (!this.isValid()) {
        this.showErrors.set(true);
        this.scrollTo('profile');
      }
      return;
    }

    const f = this.form();
    const initial = this.initialState();
    if (!f || !initial) return;

    const patch: ProfileUpdate = {};
    (Object.keys(f) as EditableField[]).forEach((k) => {
      if ((f[k] ?? null) !== (initial[k] ?? null)) {
        (patch as Record<string, unknown>)[k] = f[k];
      }
    });

    if (Object.keys(patch).length === 0) return;

    this.isSaving.set(true);
    try {
      const updated = await this.profileService.updateProfile(patch);
      const snap = this.snapshotFrom(updated);
      this.form.set(snap);
      this.initialState.set(snap);
      this.showErrors.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Perfil actualizado',
        detail: 'Tus cambios se han guardado correctamente.',
        life: 3000,
      });
    } catch (err) {
      const { general } = this.errorService.processError(err as HttpErrorResponse);
      this.messageService.add({
        severity: 'error',
        summary: 'No se pudo guardar',
        detail: general || 'Ocurrió un error al actualizar tu perfil.',
        life: 5000,
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  discard(): void {
    const initial = this.initialState();
    if (!initial) return;
    this.form.set({ ...initial });
    this.showErrors.set(false);
    this.messageService.add({
      severity: 'info',
      summary: 'Cambios descartados',
      life: 2000,
    });
  }

  goBack(): void {
    this.router.navigate([ROUTES.EXPLORE]);
  }
}
