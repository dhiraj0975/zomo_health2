import { Allow } from 'class-validator';
export class CreateWellBeingPostClickInput {
    @Allow() id: number;
    @Allow() post_id: number;
    @Allow() user_id: number;
    @Allow() activity_id: number;
    @Allow() status: number;
    @Allow() created_date: Date;
    @Allow() updated_date: Date;
}
