import { Allow } from 'class-validator';
export class DeleteUserFormInput {
    @Allow() id: number;
    @Allow() user_id: number;
}
