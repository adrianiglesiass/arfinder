export const STORAGE_KEYS = {
  auth: {
    refreshToken: 'arfinder.auth.refresh.v1',
    accessToken: 'arfinder.auth.access.v1',
    pendingEmail: 'arfinder_pending_email',
  },
  profile: {
    byId: 'arfinder.profiles.byId.v1',
    me: 'arfinder.profiles.me.v1',
  },
  onboarding: {
    form: 'arfinder_onboarding_form',
    currentStep: 'arfinder_current_step',
    pendingPhotos: 'arfinder_pending_photos',
    pendingPhotosOrder: 'arfinder_pending_photos_order',
    lastUserId: 'arfinder_onboarding_user_id',
  },
} as const;
