import { Allow } from 'class-validator';
export class DeleteQuickLinkFolderOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
