import { Expose } from 'class-transformer';
export class CommitmentLevelsDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() schedule_id: number;
    @Expose() level_value: number;
    @Expose() level_type: string;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
}
