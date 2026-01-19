import { Expose } from 'class-transformer';
export class BannedWordDto  {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() word: string;
    @Expose() showhide: number;
    @Expose() status: number;
    @Expose() add_date: string;
    @Expose() update_date: string;
}
