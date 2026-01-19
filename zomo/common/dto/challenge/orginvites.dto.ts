import { Transform, Type, Expose } from 'class-transformer';
export class OrgInvitesDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() org_id: number;
    @Expose()
    start_date: string;
    @Expose()
    end_date: string;
    @Expose()
    added_date: string;
    @Expose()
    updated_date: string;
    @Expose() status: number = 1;
    @Expose()
    @Transform(({ obj }) => (obj.company ? obj.company.company_name : null ), { toClassOnly: true })
    company_name: any;
}
