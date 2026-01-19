import { Allow } from 'class-validator';
export class UpdateCompleteActivityInput {
    @Allow() id: number;
    @Allow() user_id: number;
    @Allow() custom_id: number;
    @Allow() activity_id: number;
    @Allow() image: string;
    @Allow() notes: string;
    @Allow() created_by: number;
    @Allow() source: number;
    @Allow() status: number;
    @Allow() aftercompletestatus: number;
}
