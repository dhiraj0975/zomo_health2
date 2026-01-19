import { FormInstructionInterface } from "../healthcheckup";
import { ThemeSettingInterface } from "../theme";
import { ActivePluginInterface } from "./activeplugin";
import { CompanyMetaInterface } from "./companyMeta.interface";
import { CompanySettingsInterface } from "./companySettings.interface";


export interface CompanyInterface {
  id: number;
  code: string;
  companytype_id: number;
  company_name: string;
  company_logo?: string;
  phone: string;
  street_address?: string;
  state: string;
  city: string;
  zip: string;
  country: string;
  deleted: number;
  status: number;
  is_testing: number;
  created_by: number;
  updated_by: number;
  created: string; // or `Date` if parsed
  updated: string; // or `Date` if parsed
  block_email?: number;
  company_logo_dark?: string;
  membership_plan_id?: number;
  setting?: CompanySettingsInterface;
  meta?: CompanyMetaInterface;
  theme_setting?: ThemeSettingInterface;
  forminstructions?: FormInstructionInterface;
  activeplugin?: ActivePluginInterface;
}
