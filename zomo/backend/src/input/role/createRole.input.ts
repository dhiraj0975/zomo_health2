import { Allow } from 'class-validator';
export class CreateRoleInput {
    @Allow() title: string;
    @Allow() alias: string;
    @Allow() role_company_type: number;
    @Allow() role_desc: string;
    @Allow() permissions?: any;
    @Allow() status: number;
}
