import type { components } from './api.types';

export type UserCreate = components['schemas']['UserCreate'];
export type UserResponse = components['schemas']['UserResponse'];
export type Token = components['schemas']['Token'];

export type ProfileCreate = components['schemas']['ProfileCreate'];
export type ProfileResponse = components['schemas']['ProfileResponse'];
export type ProfileUpdate = components['schemas']['ProfileUpdate'];
export type ProfileSummary = components['schemas']['ProfileSummary'];
export type ProfilePhotoResponse = components['schemas']['ProfilePhotoResponse'];

export type ConversationResponse = components['schemas']['ConversationResponse'];
export type ConversationCreate = components['schemas']['ConversationCreate'];
export type MessageResponse = components['schemas']['MessageResponse'];
export type LastMessageSummary = components['schemas']['LastMessageSummary'];
export type ParticipantSummary = components['schemas']['ParticipantSummary'];

export type PhotoReorder = components['schemas']['_PhotoReorder'];
export type PhotoUpdate = components['schemas']['_PhotoUpdate'];
export type UploadProfilePhoto =
  components['schemas']['Body_upload_profile_photo_profiles_me_photos_post'];

export type ScheduleEnum = components['schemas']['ScheduleEnum'];
export type TypeEnum = components['schemas']['TypeEnum'];

export type HTTPValidationError = components['schemas']['HTTPValidationError'];
export type ValidationError = components['schemas']['ValidationError'];

export type CitySearchResponse = string[];
