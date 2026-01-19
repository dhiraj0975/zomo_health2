import { Allow } from 'class-validator';
export class DeleteUserDetailsInput {
    @Allow() id: number;
    @Allow() user_id: number;
}
