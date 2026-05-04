import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, OnInit, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { MessageService } from 'primeng/api';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';

import { ProfileCreate, ProfilePhotoResponse, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { AuthService } from '@core/auth/auth.service';
import { ErrorService } from '@core/errors';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';
import { ProfileService } from '@core/profile/profile.service';

import { Button } from '@shared/components/button/button';

import { StepLifestyle } from '@features/onboarding/components/step-lifestyle/step-lifestyle';
import { StepObjective } from '@features/onboarding/components/step-objective/step-objective';
import { isLocalPhoto } from '@features/onboarding/components/step-photos/photo.utils';
import { StepPhotos } from '@features/onboarding/components/step-photos/step-photos';
import { StepProfile } from '@features/onboarding/components/step-profile/step-profile';

@Component({
  selector: 'app-onboarding',
  imports: [
    ProgressBarModule,
    ToastModule,
    StepProfile,
    StepObjective,
    StepLifestyle,
    StepPhotos,
    DecimalPipe,
    Button,
  ],
  providers: [MessageService],
  templateUrl: './onboarding.html',
})
export default class Onboarding implements OnInit {
  protected readonly profileService = inject(ProfileService);
  protected readonly authService = inject(AuthService);
  protected readonly router = inject(Router);
  private readonly persistenceService = inject(OnboardingPersistenceService);
  private readonly messageService = inject(MessageService);
  private readonly errorService = inject(ErrorService);

  stepPhotos = viewChild(StepPhotos);

  currentStep = signal(1);
  direction = signal<'forward' | 'backward'>('forward');
  showErrors = signal(false);
  isReady = signal(false);
  totalSteps = 4;

  form = signal<Partial<ProfileCreate>>({
    name: '',
    age: undefined,
    city: '',
    bio: '',
    type: 'looking_for_flat' as TypeEnum,
    max_budget: 700,
    schedule: 'morning' as ScheduleEnum,
    has_pets: false,
    is_smoker: false,
  });

  constructor() {
    effect(() => {
      const currentForm = this.form();
      this.persistenceService.saveForm(currentForm);
    });

    effect(() => {
      this.persistenceService.saveCurrentStep(this.currentStep());
    });
  }

  ngOnInit(): void {
    const savedForm = this.persistenceService.loadForm();
    if (savedForm) {
      this.form.set({ ...this.form(), ...savedForm });
    }
    const savedStep = this.persistenceService.loadCurrentStep();
    if (savedStep > 1) {
      this.currentStep.set(savedStep);
    }

    this.isReady.set(true);

    (async () => {
      try {
        await this.authService.init();
        await this.profileService.loadProfile();
      } catch {
        /* empty */
      }
    })();
  }

  progress = computed(() => (this.currentStep() / this.totalSteps) * 100);

  safeForm = computed(() => ({
    name: this.form().name ?? '',
    city: this.form().city ?? '',
    bio: this.form().bio ?? '',
    max_budget: this.form().max_budget ?? 700,
    has_pets: this.form().has_pets ?? false,
    is_smoker: this.form().is_smoker ?? false,
    age: this.form().age,
  }));

  stepTitle = computed(() => {
    const titles = ['Perfil', 'Objetivo', 'Estilo', 'Fotos'];
    return titles[this.currentStep() - 1];
  });

  isFirstStep = computed(() => this.currentStep() === 1);
  isLastStep = computed(() => this.currentStep() === this.totalSteps);

  isStep1Valid = computed(() => {
    const f = this.form();
    return !!(f.name?.trim() && f.age && f.city?.trim());
  });

  isCurrentStepValid = computed(() => {
    if (this.currentStep() === 1) return this.isStep1Valid();
    return true;
  });

  submitLabel = computed(() => (this.isLastStep() ? 'Ir a explorar' : 'Continuar'));

  updateForm(newData: Partial<ProfileCreate>) {
    this.form.update((prev) => ({ ...prev, ...newData }));
  }

  async nextStep() {
    if (!this.isCurrentStepValid()) {
      this.showErrors.set(true);
      return;
    }

    this.showErrors.set(false);

    if (this.currentStep() < this.totalSteps) {
      this.direction.set('forward');
      this.currentStep.update((step) => step + 1);
    } else {
      try {
        await this.profileService.saveOnboarding(this.form() as ProfileCreate);

        this.persistenceService.clearAll();

        const photos = this.stepPhotos();
        if (photos) {
          const uploaded = await photos.uploadPendingPhotos();

          if (uploaded && Array.isArray(uploaded) && uploaded.length > 0) {
            const allCombined = photos.allPhotos();

            const orderedIds = allCombined
              .filter((p) => !isLocalPhoto(p))
              .map((p) => (p as ProfilePhotoResponse).id)
              .filter(Boolean) as number[];

            if (orderedIds.length > 0) {
              try {
                await photos.reorderPhotos(orderedIds);
              } catch (err) {
                console.error('Failed to reorder after upload', err);
              }
            }
          }
        }

        this.router.navigate(['']);
      } catch (error: unknown) {
        console.error('Error in onboarding:', error);
        const { general } = this.errorService.processError(error as HttpErrorResponse);
        this.messageService.add({
          severity: 'error',
          summary: 'Error al crear el perfil',
          detail: general || 'Ocurrió un error inesperado al guardar tus datos.',
          life: 5000,
        });
      }
    }
  }

  prevStep() {
    this.showErrors.set(false);
    if (this.currentStep() > 1) {
      this.direction.set('backward');
      this.currentStep.update((s) => s - 1);
    }
  }
}
