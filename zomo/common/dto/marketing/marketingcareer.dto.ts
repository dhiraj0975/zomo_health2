import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD
export class MarketingCareerDto {
    @Expose()
    id: number;
    @Expose()
    first_name: string;
    @Expose()
    last_name: string;
    @Expose()
    email: string;
    @Expose()
    role: string;
    @Expose()
    mobile: string;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('marketing_career') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    resume_cv: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('marketing_career') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    supporting_document: string;
}
