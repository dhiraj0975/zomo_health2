import { Allow } from 'class-validator';
export class DeleteQuickLinkOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
