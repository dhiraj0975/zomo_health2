import { Allow } from 'class-validator';
export class GetOneUserDetailsInput {
    @Allow() id: number;
    @Allow() user_id: number;
}
