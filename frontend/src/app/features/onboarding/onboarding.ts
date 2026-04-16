import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { CitySearchService } from '@infrastructure/services/city-search.service';
import { ProgressBarModule } from 'primeng/progressbar';

import { ProfileCreate, ScheduleEnum, TypeEnum } from '@core/api/api.models';
import { OnboardingPersistenceService } from '@core/profile/onboarding-persistence.service';
import { ProfileService } from '@core/profile/profile.service';

import { StepLifestyle } from '@features/onboarding/components/step-lifestyle/step-lifestyle';
import { StepObjective } from '@features/onboarding/components/step-objective/step-objective';
import { StepPhotos } from '@features/onboarding/components/step-photos/step-photos';
import { StepProfile } from '@features/onboarding/components/step-profile/step-profile';

@Component({
  selector: 'app-onboarding',
  imports: [ProgressBarModule, StepProfile, StepObjective, StepLifestyle, StepPhotos],
  templateUrl: './onboarding.html',
})
export default class Onboarding {
  protected readonly profileService = inject(ProfileService);
  protected readonly router = inject(Router);
  private readonly persistenceService = inject(OnboardingPersistenceService);
  private readonly citySearchService = inject(CitySearchService);

  stepPhotos = viewChild(StepPhotos);

  currentStep = signal(1);
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

  stepTitle = computed(() => {
    const titles = ['Perfil', 'Objetivo', 'Estilo', 'Fotos'];
    return titles[this.currentStep() - 1];
  });

  updateForm(newData: Partial<ProfileCreate>) {
    this.form.update((prev) => ({ ...prev, ...newData }));
  }

  async nextStep() {
    if (this.currentStep() < this.totalSteps) {
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
    if (this.currentStep() > 1) this.currentStep.update((s) => s - 1);
  }
}
