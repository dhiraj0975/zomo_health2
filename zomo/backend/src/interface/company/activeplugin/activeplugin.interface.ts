export interface ActivePluginInterface {
  id: number;
  company_id: number;
  plugin_name: string;
  membership_plan_id: number;
  created_by: number;
  updated_by: number;
  created: string; // or `Date` if parsed
  updated: string; // or `Date` if parsed
}
