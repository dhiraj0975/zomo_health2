import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class EventCategoryDto {
    @Expose() id: number;
    @Expose() category_name: string;
    @Expose() c_companies_id: number;
    @Expose() order_no: number;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
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
