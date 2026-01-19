import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto, CompanyMetaDto } from '../company';
let S3_URL = process.env.S3_URL_PROD;
S3_URL = S3_URL?.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
export class UserLoginAgreementDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() user_sign: string;
    @Expose() status: number;
    @Expose()
    created: string;
    @Expose()
    update: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('signimg_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    user_sign_image: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
    @Expose()
    @Type(() => CompanyMetaDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                a_popup_logo_status: value.a_popup_logo_status,
                a_popup_status: value.a_popup_status,
                a_popup_default_status: value.a_popup_default_status
            };
        }
        else {
            return null
        }
    })
    company_meta: CompanyMetaDto;
}
