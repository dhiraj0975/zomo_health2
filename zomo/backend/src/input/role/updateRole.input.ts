import { Allow } from 'class-validator';
export class UpdateRoleInput {
    @Allow() id: number;
    @Allow() title: string;
    @Allow() role_desc: string;
    @Allow() status: number;
}
