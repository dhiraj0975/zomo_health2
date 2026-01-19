import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD
export class MyPlanBlocksDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('block') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    icon: string;
    @Expose() description: string;
    @Expose() plan_id: number;
    @Expose() order_id: number;
    @Expose() status: number;
    @Expose() created: string;
    @Expose() updated: string;
}
