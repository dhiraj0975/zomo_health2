import { Transform, Type, Expose } from 'class-transformer';
export class CommunicationEmailGroupsDto {
    @Expose() id: number;
    @Expose() group_name: string;
    @Expose() orgs_ids: string;
    @Expose() role_id: number;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() status: number;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    created_date: string;
    @Expose()
    @Type(() => String)
    @Transform(({ value }) => (value ? new Date(value).getTime().toString() : null), {
        toClassOnly: true,
    })
    updated_date: string;
}
