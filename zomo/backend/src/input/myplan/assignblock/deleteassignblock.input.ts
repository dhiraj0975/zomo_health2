import { Allow } from 'class-validator';
export class DeleteAssignBlockInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() created_by: number;
    @Allow() org_id: number;
    @Allow() plan_id: number;
    @Allow() biometric_id: number;
    @Allow() block_id: number;
    @Allow() activity_id: number;
}
