

export interface ReCreateFormInterface {
  id: number;
  title: string;
  org_id: number;
  activity_id: number;
  activity_date: string; // or `Date` if parsed
  attachments: number;
  attachment_req: number;
  multiple_selection: number;
  description: string;
  approval_type: number;
  created_by: number;
  status: number;
  deleted: number;
  added_date: string; // or `Date` if parsed
  updated_date: string; // or `Date` if parsed
}
