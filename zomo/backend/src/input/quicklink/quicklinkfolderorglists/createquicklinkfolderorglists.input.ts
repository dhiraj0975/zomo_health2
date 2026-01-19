import { Allow } from 'class-validator';
export class CreateQuickLinkFolderOrgListsInput {
    @Allow() c_companies_id: number;
    @Allow() folder_id: number;
    @Allow() status: number;
    @Allow() created_by: number;
}
