import { Transform, Type, Expose } from 'class-transformer';
export class SsoOrgMappingDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() tool_id: number;

    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return obj.saml;
    })
    saml: Record<string, string>;

    @Expose()
    @Type(() => Object)
    @Transform(({ obj }) => {
        return obj.field_identifier;
    })
    field_identifier: Record<string, string>;

    @Expose() status: string;
    @Expose() created_by: number;
    @Expose() updated_by: number;
}
