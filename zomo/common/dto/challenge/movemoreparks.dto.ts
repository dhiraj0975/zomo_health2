import { Expose, Transform, Type } from 'class-transformer';
const S3_URL =  process.env.S3_URL_PROD
export class MoveMoreParksDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() schedule_id: number;
    @Expose() park_name: string;
    @Expose() steps: number;
    @Expose() order_by: number = 0;
    @Expose() map: string;
    @Expose() website: string;
    @Expose() info: string;
    @Expose() status: number = 1;
    @Expose() created: string;
    @Expose() updated: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('scchaparki_') ? S3_URL + value : value && value.includes('icons') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    corner: string;
    @Type(() => String)
    @Transform(({ value }) => (value && value.includes('scchaparkl_') ? S3_URL + value : value && value.includes('logo') ? S3_URL + value : value), {
        toClassOnly: true,
    })
    logo: string;
    @Expose()
    @Type(() => String)
    @Transform(({ obj }) => {
        if (obj && obj.image) {
            const location = [];
            for(let element of obj.image.split(',')){
                location.push((element && element.includes('scchaparkl_') ? S3_URL + element : element && element.includes('logo') ? S3_URL + element : element));
            }
            return location.join(',');
        }
        else {
            obj.image
        }
    })
    image: string;
}
