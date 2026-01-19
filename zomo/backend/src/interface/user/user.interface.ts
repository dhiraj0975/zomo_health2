import { DepartmentInterface } from "@/interface/department";
import { CompanyInterface, CompanySettingsInterface } from "../company";
import { LocationInterface } from "../location";
import { UserSettingsInterface } from "./userSettings.interface";

export interface StepData {
  completed?: boolean;
  [key: string]: any;
}
export interface PreferredLanguage {
  id: number;
  title: string;
  native: string;
  alias: string;
}
export interface UserInterface {
  id: number;
  code: string;
  role_id: number;
  first_name: string;
  middle_name: string;
  last_name: string;
  gender: 'm' | 'f' | 'o';
  username: string;
  full_name: string;
  email: string;
  p_email?: string;
  dob?: string;
  date_of_hire?: Date;
  employeeid?: string;
  securitycode?: string;
  timezone: string;
  password: string;
  new_password?: string;
  docpassword?: string;
  ssoIdentifier?: string;
  profile_image?: string;
  activation_key?: string;
  on_insurance_plan: 'Yes' | 'No';
  insurance_plan_name?: string;
  location: number;
  department_id: number;
  physiciantype_id?: number;
  pname?: string;
  companytype_id: number;
  org_id: number;
  membership_code?: string;
  entered_code?: string;
  num_login: number;
  last_login?: Date | null;
  user_type: number;
  on_current_census: string;
  relationship_id?: string;
  status: number;
  updated_by: number;
  created_by: number;
  updated?: Date | null;
  created?: Date | null;
  refresh_token?: string;
  is_camp_eligible: number;
  api_key?: string;
  api_secret?: string;
  lastuniqid?: number;
  is_aro_build: number;
  azure_objectid?: string;
  settings?: UserSettingsInterface;
  Location?: LocationInterface;
  department?: DepartmentInterface;
  company?: CompanyInterface;
  company_settings?: CompanySettingsInterface;
  usersdatawellness?: any;
  steps_data?: Record<string, StepData>;
  preferred_language?: PreferredLanguage;
  mobile?: number;
}