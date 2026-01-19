import { Allow } from 'class-validator';
export class GetOneQuickLinkOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
