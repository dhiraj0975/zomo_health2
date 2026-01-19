export interface UserSettingsInterface {
  id: number;
  user_id: number;
  address?: string;
  address2?: string;
  city?: string;
  state?: string;
  country?: string;
  zip?: string;
  wphone?: string;
  cphone: string;
  hphone?: string;
  fax?: string;
  wmaddress?: string;
  jobtitle?: string;
  wphone_ext?: string;
  otp_key?: string;
  otp_created?: string; // Use `Date` if you're converting
  otp_generated_by?: number; // 0 = Super Admin, 1 = User
  num_otp_login: number;
  coach_type?: 'p' | 'f'; // 'p' => Part Time, 'f' => Full Time
  communication_type?: '1' | '2' | '3'; // '1' = Telephonic, '2' = Onsite, '3' = Video
  coach_area?: 0 | 1; // 0 = Global, 1 = Coordinator
  azure_objectid?: string;
  autouser: number;
  device_token?: string;
  popup_status: number;
  info_popup_status?: number;
  videofavoriteslist?: string;
  fitnessvideofavoriteslist?: string;
  is_pointsleaderboardpopup: number;
  email_update?: 0 | 1; // 0 = Not allowed, 1 = Allowed
  email_receiving?: 0 | 1;
  unsubscribe_reason?: string;
  receivetokens?: string;
  linkedin_link?: string;
  instagram_link?: string;
  twitter_link?: string;
  facebook_link?: string;
  status?: number;
  created: string; // or Date
  updated: string; // or Date
  avatar_gender?: number;
  avatar_icon?: number;
  avatar_skin_tone?: string;
  avatar_hair_color?: string;
  avatar_tshirt_color?: string;
  avatar_accessories_color?: string;
  avatar_background_color?: string;
}
