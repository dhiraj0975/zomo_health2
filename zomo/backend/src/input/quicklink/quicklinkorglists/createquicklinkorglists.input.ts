import { Allow } from 'class-validator';
export class CreateQuickLinkOrgListsInput {
    @Allow() c_companies_id: number;
    @Allow() quicklink_id: number;
    @Allow() status: number;
    @Allow() created_by: number;
}
