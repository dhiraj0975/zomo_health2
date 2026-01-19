export interface LocationInterface {
  id: number;
  company_id: number;
  code: string;
  location_name: string;
  lname: string;
  address1: string;
  address2?: string | null;
  city: string;
  state: string;
  country: string;
  zip: string;
  is_default: number;
  status: number; 
  deleted: number; 
  created: string; 
  updated: string; 
}