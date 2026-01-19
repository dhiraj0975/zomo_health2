import { Allow } from 'class-validator';
export class UpdateBannedWordInput {
    @Allow() id: number;
    @Allow() org_id: number;
    @Allow() word: string;
    @Allow() showhide: number;
    @Allow() status: number;
}
