import { Allow } from 'class-validator';
export class GetOneQuickLinkFoldersInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
