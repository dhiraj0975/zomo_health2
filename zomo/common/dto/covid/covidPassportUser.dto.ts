import { Expose, Transform, Type } from 'class-transformer';
import { UserDto } from '../user';
const S3_URL =  process.env.S3_URL_PROD
export class CovidPassportUserDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() description: string;
    @Expose() org_id: number;
    @Expose() approval_status: number;
    @Expose() created_by: number;
    @Expose() status: number;
    @Expose() is_show_dashboard: number;
    @Expose()
    created: string;
    @Expose()
    updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('covpass') ? S3_URL.replace(process.env.AWS_BUCKET_PUBLIC_PROD, process.env.AWS_BUCKET_PRIVATE_PROD) + value : value ), {
        toClassOnly: true,
    })
    attachment: string;
    @Expose()
    @Type(() => UserDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                code: value.code,
                first_name: value.first_name,
                last_name: value.last_name,  
                name: value.first_name + ' ' + value.last_name,               
            };
        }
        else {
            return null
        }
    })
    user: UserDto;
}
