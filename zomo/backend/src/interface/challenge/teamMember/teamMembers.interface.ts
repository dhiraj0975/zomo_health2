import { UserInterface } from "src/interface";
import { LocationInterface } from "src/interface/location";

export interface TeamMembersInterface {
  id: number;
  team_id?: number;
  org_id?: number;
  user_id?: number;
  user_order: number; 
  iscaptain?: number; 
  baton_status: number; 
  baton_start: string; 
  status?: number; 
  created_date: Date; 
  updated?: Date;
  locations?: LocationInterface;
  users?: UserInterface;
}