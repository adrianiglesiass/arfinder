import { DecimalPipe } from '@angular/common';
import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { ProgressBarModule } from 'primeng/progressbar';

import { ProfileCreate, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { CitySearchService } from '@core/location/city-search.service';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';
import { ProfileService } from '@core/profile/profile.service';

import { StepLifestyle } from '@features/onboarding/components/step-lifestyle/step-lifestyle';
import { StepObjective } from '@features/onboarding/components/step-objective/step-objective';
import { StepPhotos } from '@features/onboarding/components/step-photos/step-photos';
import { StepProfile } from '@features/onboarding/components/step-profile/step-profile';

@Component({
  selector: 'app-onboarding',
  imports: [ProgressBarModule, StepProfile, StepObjective, StepLifestyle, StepPhotos, DecimalPipe],
  templateUrl: './onboarding.html',
})
export default class Onboarding {
  protected readonly profileService = inject(ProfileService);
  protected readonly router = inject(Router);
  private readonly persistenceService = inject(OnboardingPersistenceService);
  private readonly citySearchService = inject(CitySearchService);

  stepPhotos = viewChild(StepPhotos);

  currentStep = signal(1);
  direction = signal<'forward' | 'backward'>('forward');
  showErrors = signal(false);
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
    const savedForm = this.persistenceService.loadForm();
    if (savedForm) {
      this.form.set({ ...this.form(), ...savedForm });
    }
    const savedStep = this.persistenceService.loadCurrentStep();
    if (savedStep > 1) {
      this.currentStep.set(savedStep);
    }

    effect(() => {
      this.persistenceService.saveForm(this.form());
    });

    effect(() => {
      this.persistenceService.saveCurrentStep(this.currentStep());
    });
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
      await this.profileService.saveOnboarding(this.form() as ProfileCreate);

      this.persistenceService.clearAll();
      this.citySearchService.clearSelectedCity();

      const photos = this.stepPhotos();
      if (photos) {
        await photos.uploadPendingPhotos();
      }

      this.router.navigate(['']);
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
