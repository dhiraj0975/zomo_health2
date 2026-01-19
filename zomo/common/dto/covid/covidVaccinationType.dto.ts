import { Transform, Type, Expose } from 'class-transformer';
import { CompaniesDto } from '../company';
export class CovidVaccinationTypeDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() title: string;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value && value.id) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
}
