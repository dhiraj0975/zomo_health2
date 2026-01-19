import { Allow } from 'class-validator';
export class UpdateQuickLinkOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
    @Allow() quicklink_id: number;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
