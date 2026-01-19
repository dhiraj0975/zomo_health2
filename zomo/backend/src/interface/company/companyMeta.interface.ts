export interface CompanyMetaInterface {
  id: number;
  org_id: number;
  custom_text?: string;
  website?: string;
  information?: string;
  agreement_text?: string;
  due_date_text?: string;
  a_popup_title?: string;
  a_popup_text?: string;
  a_popup_status: number;
  a_popup_default_status: number;
  a_popup_require: number;
  a_popup_logo_status: number;
  sso_dtext?: string;
  sso_dlink?: string;
  enable_widget?: string;
  user_popup_title?: string;
  plan_label?: string;
  zip_report_password?: string;
  title?: string;
  setting_dic?: string;
  newsletterthemecolors?: string;
  selectedweeks?: string;
  selectedmonths?: string;
  created_by: number;
  updated_by: number;
  created: string; // or `Date` if converted
  updated: string; // or `Date` if converted
  emailattachment?: string;
}
