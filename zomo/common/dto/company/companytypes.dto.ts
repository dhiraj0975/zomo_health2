import { Transform, Type, Expose } from 'class-transformer';
export class CompanyTypesDto {
    @Expose() id: number;
    @Expose() company_type: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
}
