import { Transform, Type, Expose } from 'class-transformer';
export class MyPlanAssignBlockDto {
    @Expose() id: number;
    @Expose() block_id: number;
    @Expose() plan_id: number;
    @Expose() org_id: number;
    @Expose() activity_id: number;
    @Expose() status: number;
    @Expose() based_on: number;
    @Expose() name: string;
    @Expose() startdate: string;
    @Expose() enddate: string;
    @Expose() created: string;
    @Expose() updated: string;
}
