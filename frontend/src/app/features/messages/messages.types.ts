export interface DraftRecipient {
  user_id: number;
  profile_id: number | null;
  name: string | null;
  photo_url: string | null;
}

export interface ChatHeader {
  name: string;
  photo_url: string | null;
  profile_id: number | null;
}
