import { Transform, Type, Expose } from 'class-transformer';
export class RoleDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() alias: string;
    @Expose() role_company_type: number;
    @Expose() role_desc: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
