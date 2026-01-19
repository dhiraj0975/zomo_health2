import { Transform, Type, Expose } from 'class-transformer';
import { CategoryDto } from './category.dto';
import { CompaniesDto } from '../company';
export class ActivitiesDto {    
    @Expose() id: number;
    @Expose() category_id : number;
    @Expose() activity_name: string;
    @Expose() plugin: string;
    @Expose() controller: string;
    @Expose() action: string;
    @Expose() newlink: string;
    @Expose() ext_link: string;
    @Expose() description: string;
    @Expose() enable_activity_tracker: number;
    @Expose() enable_reimbursement: number;
    @Expose() activity_display: number;
    @Expose() is_age_common: number;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose()
    @Type(() => CategoryDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                category_name: value.category_name,
            };
        }
        else {
            return null
        }
    })
    category: CategoryDto;
    @Expose()
    @Type(() => Number)
    @Transform(({ value }) => {
        if (value == 0) {
            return "Global";
        }
        if (value && (value != 0 || value == null)) {
            return "Organization Specific";
        }
        else {
            return "Organization Specific";
        }
    })
    accebility: number;
    @Expose()
    @Type(() => Number)
    @Transform(({ obj }) => (obj.accebility), {
        toClassOnly: true,
    })
    accebilitytranslation: number;
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
