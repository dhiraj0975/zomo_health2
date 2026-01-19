import { Allow } from 'class-validator';
export class DeleteQuickLinkFoldersInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
