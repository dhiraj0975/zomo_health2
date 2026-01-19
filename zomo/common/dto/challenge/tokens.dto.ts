import { Transform, Type, Expose } from 'class-transformer';
export class TokensDto {
    @Expose() id: number;
    @Expose() org_id: number;
    @Expose() user_id: number;
    @Expose() schedule_id: number;
    @Expose() challege_id: number;
    @Expose() team_id: number;
    @Expose() token_number: number = 0;
    @Expose() token_type: string;
    @Expose() to_user_id: number;
    @Expose()
    submission_date: string;
    @Expose() created: string;
    @Expose() comment: string;
    @Expose() update: string;
    @Expose() status: number = 1;
}
