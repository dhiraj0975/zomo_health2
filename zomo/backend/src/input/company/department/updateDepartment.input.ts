import { Allow } from 'class-validator';
export class UpdateDepartmentInput {
    @Allow() id: number;
    @Allow() company_id: number;
    @Allow() dept_name: string;
    @Allow() dept_desc: string;
    @Allow() status: number;
    @Allow() default_dept: string;
}
