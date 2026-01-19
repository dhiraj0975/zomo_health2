import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
const S3_URL =  process.env.S3_URL_PROD
export class AssessmentSettingsDto {
    @Expose() id: number;
    @Expose() organization_id: number;
    @Expose() banner_title: string;
    @Expose() banner_description: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? S3_URL + value : value), {
        toClassOnly: true,
    })
    banner_image: string;
    @Expose() result_top_decscription: string;
    @Expose() result_bottom_decscription: string;
    @Expose() copied_organization: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
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
    from_org: CompaniesDto;
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
    to_org: CompaniesDto;
}
