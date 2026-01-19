import { Expose, Transform, Type } from 'class-transformer';
import { CompaniesDto } from '../company';
export class ReimbursementCreateFormsDto {
    @Expose() id: number;
    @Expose() title: string;
    @Expose() org_id: number;
    @Expose() activity_id: string;
    @Expose() activity_date: number;
    @Expose() attachments: number;
    @Expose() attachment_req: number;
    @Expose() multiple_selection: number;
    @Expose() description: string;
    @Expose() act_reim_amount: string;
    @Expose() approval_type: number;
    @Expose() status: number;
    @Expose() deleted: number;
    @Expose() created_by: number;
    @Expose() added_date: string;
    @Expose() updated_date: string;
    @Expose()
    @Type(() => CompaniesDto)
    @Transform(({ value }) => {
        if (value) {
            return {
                id: value.id,
                company_name: value.company_name,
            };
        }
        else {
            return null
        }
    })
    company: CompaniesDto;
}
