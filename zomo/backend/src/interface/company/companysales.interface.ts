import { CompanyInterface } from "./company.interface";
import { CompanyContractInterface } from "./companyContract.interface";


export interface CompanySalesInterface {
  id: number;
  org_id: number;
  demo_lead: string;
  demo_date?: string;
  onboarding_date: string;
  launch_date?: string;
  demo_notes: string;
  is_zomo_health_selected: number;
  decline_reason: string;
  demo_recording: string;
  status: number;
  created: string;
  updated: string;
  company?: CompanyInterface;
  contract?: CompanyContractInterface;
}
