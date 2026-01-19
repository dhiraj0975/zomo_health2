import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class InsurancePlanDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() plan_name: string;
    @Expose() yearly_plan_saving: string;
    @Expose() extra_spouse_saving: string;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
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
