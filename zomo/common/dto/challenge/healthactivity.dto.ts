import { Expose } from 'class-transformer';
export class HealthActivityDto {
    @Expose() id: number;
    @Expose() name: string;
    @Expose() avalue: number;
    @Expose() atype: number;
    @Expose() amax: number;
    @Expose() frequency: number;
    @Expose() is_track: number;
    @Expose() schedule_id: number;
    @Expose() org_id: number;
    @Expose() status: number = 1;
    @Expose() created_by: number;
    @Expose() updated_by: number;
    @Expose() created: string;
    @Expose() updated: string;
}
