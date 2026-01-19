import { Allow } from 'class-validator';
export class DeleteEventInput {
    @Allow() id: number;
    @Allow() created_by_user_id: number;
}
