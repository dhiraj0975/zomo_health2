import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class SpouseSettingsDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() hide: number;
    @Expose() status: number;
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
