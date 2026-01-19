import { Allow } from 'class-validator';
export class UpdateQuickLinkFolderOrgListsInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
    @Allow() folder_id: number;
    @Allow() status: number;
    @Allow() created_by: number;
    @Allow() updated_by: number;
}
