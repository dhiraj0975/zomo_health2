import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class CampaignDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() location_ids: string;
    @Expose() department_ids: string;
    @Expose() campaign_name: string;
    @Expose() tab_titled: string;
    @Expose() tab_order: number;
    @Expose() status: number;
    @Expose() is_copy: number;
    @Expose()
    d_start_date: string;
    @Expose()
    d_end_date: string;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
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
