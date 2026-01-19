import { Expose, Transform, Type } from 'class-transformer';
let S3_URL = process.env.S3_URL_PROD;
S3_URL = S3_URL?.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
export class SpouseAgreementDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() signed: string;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('signimg_') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    user_sign_image: string;
    @Expose()
    created_date: string;
    @Expose()
    modified_date: string;
}
