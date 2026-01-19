import { Allow } from 'class-validator';
export class GetOneQuickLinkFolderOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
