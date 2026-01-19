import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailConfigDto {
    @Expose() id: number;
    @Expose() first_name: string;
    @Expose() last_name: string;
    @Expose() email: string;
    @Expose() source: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    created: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    updated: string;
}
