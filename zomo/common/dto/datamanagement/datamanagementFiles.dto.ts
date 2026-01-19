import { Expose, Transform, Type } from 'class-transformer';
import { BrokerDto } from '../broker';
let S3_URL = process.env.S3_URL_PROD
S3_URL = S3_URL?.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD);
export class DataManagementFilesDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() description: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) =>
        (value && value.includes('docsfiles') ? S3_URL + value : value
        ), { toClassOnly: true })
    file_name: string;
    @Expose() is_global: number;
    @Expose() status: number;
    @Expose() created_by: number;
    @Expose() modified_by: number;
    @Expose()
    created: string;
    @Expose()
    modified: string;
    @Expose()
    @Type(() => BrokerDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                broker_admin_id: value.broker_admin_id,
                user_id: value.user_id,
                org_id: value.org_id,
            };
        }
        else {
            return null
        }
    })
    broker: BrokerDto;
}
