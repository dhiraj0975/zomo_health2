import { Allow } from 'class-validator';
export class CreateBannedWordInput {
    @Allow() org_id: number;
    @Allow() word: string;
    @Allow() showhide: number;
    @Allow() status: number;
}
