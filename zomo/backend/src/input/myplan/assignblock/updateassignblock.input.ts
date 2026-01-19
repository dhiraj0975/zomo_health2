import { Allow } from 'class-validator';
export class UpdateAssignBlockInput {
    @Allow() id: number;
    @Allow() block_id: number;
    @Allow() plan_id: number;
    @Allow() org_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
    @Allow() based_on: number;
    @Allow() name: string;
    @Allow() startdate: string;
    @Allow() enddate: string;
}
