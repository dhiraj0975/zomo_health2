import { Expose } from 'class-transformer';
export class StepCheckPointsDto {
    @Expose() id: number;
    @Expose() challenge_id: number;
    @Expose() schedule_id: number;
    @Expose() checkpointvalue: number;
    @Expose() checkpointtype: string;
    @Expose() checkpointdays: number;
    @Expose() status: number;
    @Expose() created_date: string;
    @Expose() modified_date: string;
}
