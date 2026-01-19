import {Expose} from "class-transformer";
import {IsEnum} from "class-validator";

export interface DepartmentInterface {
  id: number;
  company_id: number;
  code: string;
  dept_name: string;
  dept_desc: string;
  status: number;
  default_dept: string;
  created: string;
  updated: string;
}