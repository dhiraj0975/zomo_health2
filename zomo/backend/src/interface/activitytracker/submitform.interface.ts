export interface SubmitFormInterface {
  id: number;
  user_id: number;
  org_id: number;
  form_id: number;
  activity_id: number;
  activity_date: string; // or `Date` if parsed
  company_name: string;
  attachments?: string;
  notes: string;
  decline_reason?: string;
  popup_status: number;
  approval_type: number;
  status: number;
  deleted: number;
  added_date: string; // or `Date` if parsed
  updated_date: string; // or `Date` if parsed
}
