import { Allow } from 'class-validator';
export class GetOneQuickLinkInput {
    @Allow() id: number;
    @Allow() c_companies_id: number;
}
