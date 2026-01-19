import { Allow } from 'class-validator';
export class CreateCompleteActivityInput {
    @Allow() user_id: string;
    @Allow() custom_id: string;
    @Allow() activity_id: string;
    @Allow() image: string;
    @Allow() notes: string;
    @Allow() created_by: number;
    @Allow() source: number;
    @Allow() status: number;
    @Allow() aftercompletestatus: number;
    @Allow() all_user: number;
    @Allow() org_id: number;
    @Allow() block_id: number;
    @Allow() plan_id: number;
    @Allow() activity_name: string;
    @Allow() flag: number;
    @Allow() type: number;
}
