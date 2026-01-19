export interface UserNotificationInterface {
  id: number;
  org_id: number;
  user_id: number;
  title: string;
  message: string;
  type: number; 
  module_name: string;
  submodule_name?: string;
  is_read: number; 
  metadata?: Record<string, any>; 
  status: number; 
  created_at: string; 
}
